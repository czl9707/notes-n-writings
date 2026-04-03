---
title: "Learn From Claude Code: Multi-Agent"
description: How Claude Code orchestrates multiple agents - the coordinator pattern, task lifecycle, worker restrictions, and prompt-engineering-as-architecture.
cover: media/covers/learn-from-claude-code-cover.svg
tags:
  - agent
  - ai
featured: true
created-date: 2026-04-02T00:00:00-04:00
last-updated-date: 2026-04-02T00:00:00-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: the multi-agent system that lets one coordinator orchestrate many workers.

## The Problem

Single-agent architectures hit a wall with complex tasks. You need to research three files, implement two features, and run tests. Doing this sequentially is slow. Doing it in parallel requires coordination.

Claude Code solves this with a **coordinator pattern**: one agent orchestrates, many workers execute. The coordinator doesn't write code - it directs workers who do. Workers don't coordinate - they report results to the coordinator.

The architecture is almost entirely defined by **prompts**, not code. The guardrails are in the language, not the logic.

## Activation

Coordinator mode is feature-flagged:

```typescript
function isCoordinatorMode(): boolean {
  if (feature('COORDINATOR_MODE')) {
    return isEnvTruthy(process.env.CLAUDE_CODE_COORDINATOR_MODE)
  }
  return false
}
```

Both a build-time flag and a runtime env var. Sessions persist their mode:

```typescript
function matchSessionMode(sessionMode: 'coordinator' | 'normal') {
  if (sessionIsCoordinator && !currentIsCoordinator) {
    process.env.CLAUDE_CODE_COORDINATOR_MODE = '1'
    return 'Entered coordinator mode to match resumed session.'
  }
}
```

Resume a coordinator session, and the mode restores automatically.

## The Coordinator Prompt

The coordinator gets a 200+ line system prompt that defines its entire behavior. Here's the structure:

**1. Your Role**
```
You are a coordinator. Your job is to:
- Help the user achieve their goal
- Direct workers to research, implement and verify code changes
- Synthesize results and communicate with the user
- Answer questions directly when possible
```

**2. Your Tools**
- `Agent` - Spawn a new worker
- `SendMessage` - Continue an existing worker
- `TaskStop` - Stop a running worker

Only three tools. The coordinator doesn't read files or run commands. It delegates everything.

**3. Workers**
```
When calling Agent, use subagent_type 'worker'.
Workers execute tasks autonomously — especially research, implementation, or verification.
```

**4. Task Workflow**

| Phase | Who | Purpose |
|-------|-----|---------|
| Research | Workers (parallel) | Investigate codebase |
| Synthesis | Coordinator | Understand the problem |
| Implementation | Workers | Make targeted changes |
| Verification | Workers | Test changes |

**5. Concurrency**
```
Parallelism is your superpower. Workers are async. Launch independent
workers concurrently — don't serialize work that can run simultaneously.
```

This is **prompt engineering as architecture**. The behavior emerges from the prompt, not from code logic. The code provides the primitives (Agent, SendMessage, TaskStop). The prompt defines how to use them.

## Worker Restrictions

Workers can't use coordinator tools:

```typescript
const workerTools = isSimpleMode
  ? [Bash, Read, Edit]
  : Array.from(ASYNC_AGENT_ALLOWED_TOOLS)
      .filter(name => !INTERNAL_WORKER_TOOLS.has(name))
```

Simple mode: Bash, Read, Edit only.
Full mode: A defined set, minus internal tools (TeamCreate, TeamDelete, SendMessage, SyntheticOutput).

This prevents recursive spawning. A worker can't spawn another worker. It can only do work and report back.

The coordinator prompt reinforces this:
```
Do not use one worker to check on another.
Workers will notify you when they are done.
```

Guardrails at both the code level (restricted tool set) and prompt level (behavioral instructions).

## Filesystem Coordination

Workers can't communicate directly. Instead, they share a scratchpad directory:

```typescript
if (scratchpadDir && isScratchpadGateEnabled()) {
  content += `Workers can read and write here without permission prompts.
  Use this for durable cross-worker knowledge.`
}
```

Worker A writes findings to the scratchpad. Worker B reads them. The coordinator doesn't need to relay information between workers.

This is a simple coordination mechanism that avoids the complexity of message passing. The filesystem is the message bus.

## Worker Results

Workers report back via task notifications:

```xml
<task-notification>
  <task-id>agent-a1b</task-id>
  <status>completed</status>
  <summary>Agent "Investigate auth bug" completed</summary>
  <result>Found null pointer in src/auth/validate.ts:42...</result>
  <usage>
    <total_tokens>15000</total_tokens>
    <tool_uses>12</tool_uses>
    <duration_ms>45000</duration_ms>
  </usage>
</task-notification>
```

The coordinator must distinguish these from user messages by the XML tag. The prompt explicitly warns:

```
Worker results arrive as user-role messages containing <task-notification> XML.
They look like user messages but are not. Distinguish them by the <task-notification> tag.
```

This is a potential failure mode. If the coordinator misidentifies a task notification as a user message, it might respond incorrectly. The prompt guardrail mitigates this, but it's not foolproof.

## Task Types

```typescript
type TaskType =
  | 'local_bash'          // Shell command
  | 'local_agent'         // Local agent (subagent)
  | 'remote_agent'        // Remote agent session
  | 'in_process_teammate' // In-process teammate
  | 'local_workflow'      // Workflow execution
  | 'monitor_mcp'         // MCP monitoring
  | 'dream'               // Dream task
```

Each type has its own state, lifecycle, and kill implementation.

## Task Status Machine

```typescript
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed'

function isTerminalTaskStatus(status: TaskStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'killed'
}
```

State transitions: `pending → running → completed | failed | killed`

Terminal states are immutable. Once a task is completed, it stays completed.

## Task State

```typescript
type TaskStateBase = {
  id: string
  type: TaskType
  status: TaskStatus
  description: string
  startTime: number
  endTime?: number
  outputFile: string      // Where task output is persisted
  notified: boolean       // Whether completion was reported
}
```

Every task has:
- **id**: Unique identifier
- **type**: Determines which implementation handles it
- **status**: Current state in the lifecycle
- **outputFile**: Where results are persisted to disk
- **notified**: Whether the coordinator has been told about completion

## Stopping Tasks

```typescript
async function stopTask(taskId: string, context) {
  const task = appState.tasks?.[taskId]
  if (!task) throw new StopTaskError('not_found')
  if (task.status !== 'running') throw new StopTaskError('not_running')

  const taskImpl = getTaskByType(task.type)
  await taskImpl.kill(taskId, setAppState)
}
```

Each task type has its own `kill()` implementation. The base validates state, then delegates to the type-specific implementation.

Bash tasks suppress the noisy "exit code 137" notification. Agent tasks don't suppress - they extract partial results from the aborted messages.

## The Coordinator Example

The prompt includes a worked example:

```
You:
  Let me start some research on that.

  Agent({ description: "Investigate auth bug", subagent_type: "worker", prompt: "..." })
  Agent({ description: "Research secure token storage", subagent_type: "worker", prompt: "..." })

  Investigating both issues in parallel — I'll report back with findings.

User:
  <task-notification>
  <task-id>agent-a1b</task-id>
  <status>completed</status>
  <result>Found null pointer in src/auth/validate.ts:42...</result>
  </task-notification>

You:
  Found the bug — null pointer in confirmTokenExists in validate.ts. I'll fix it.
  Still waiting on the token storage research.

  SendMessage({ to: "agent-a1b", message: "Fix the null pointer..." })
```

Note the pattern:
1. **Parallel launch** - Two workers at once
2. **Brief user update** - Don't fabricate results, just say what's happening
3. **Continue worker** - Use SendMessage to reuse the worker's context
4. **Synthesis** - Coordinator reads results, plans next step

## Caveats

### Prompt Fragility

The coordinator behavior is entirely prompt-driven. If the model misinterprets the prompt (ignores XML tags, fabricates results, spawns recursive workers), the system breaks. The code-level guardrails (restricted tools) mitigate some failure modes, but not all.

### No Direct Communication

Workers can't talk to each other. They use the filesystem scratchpad or go through the coordinator. This limits collaboration patterns but simplifies the coordination model.

### Feature Flag Complexity

Coordinator mode requires: build flag + runtime env var + session persistence. Understanding when coordinator mode is active requires tracing multiple conditions.

### Task Notification Ambiguity

Task notifications arrive as user-role messages. The coordinator must parse XML to distinguish them from actual user input. If the user sends a message that contains `<task-notification>` XML, the coordinator might misinterpret it.

## Brief

Multi-agent in Claude Code is a coordinator-worker pattern defined by prompts:

- **Coordinator** - Orchestrates workers, synthesizes results, communicates with user
- **Workers** - Execute tasks autonomously with restricted tools
- **Three coordinator tools** - Agent, SendMessage, TaskStop
- **Filesystem coordination** - Scratchpad directory for cross-worker knowledge
- **Task lifecycle** - pending → running → completed/failed/killed
- **Worker restrictions** - Can't spawn other workers, limited tool set

What makes it work:
- **Prompt engineering as architecture** - Behavior defined by prompts, not code
- **Guardrails at every level** - Code restrictions + prompt instructions
- **Parallelism** - Independent workers launched concurrently
- **Async notifications** - Results arrive as XML-tagged messages
- **Simple coordination** - Filesystem as message bus

The impressive part isn't the code (it's a simple task lifecycle). It's the prompt engineering: 200+ lines of instructions that define how an AI should coordinate multiple workers. The guardrails in the prompt prevent fabrication, recursive spawning, and result confusion.

The code provides primitives. The prompts provide behavior. That's the pattern.

Next blog: Permission System - the 10+ layer security architecture.
