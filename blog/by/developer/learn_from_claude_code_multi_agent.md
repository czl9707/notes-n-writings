---
title: "Learn From Claude Code: Multi-Agent Coordination"
description: Multi-agent systems go south easily. Claude Code handles this with two layers of guardrails — code for hard constraints, prompts for soft guidance. Both are necessary. Neither is sufficient alone.
cover: media/covers/learn-from-claude-code-cover.svg
tags: [agent, ai]
featured: true
created-date: 2026-04-02T00:00:00-04:00
last-updated-date: 2026-04-08T22:07:16-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: how multiple agents coordinate without chaos — and why both code and prompts are needed to pull it off.

## The Problem

Multi-agent goes south fast. Agents duplicate work. Agents contradict each other. Agents read stale state. Agents just start doing random thing and make wrong decisions.

Claude Code uses a **coordinator pattern**: one coordinator directs, many workers execute. Which is one of those common multi-agent patterns. The pattern alone doesn't prevent chaos. The interesting part is how the harness enforces it through two layers, code for hard constraints, prompts for soft guidance.

## Coordinator

Three roles:

1. **Coordinator** — Spawns workers, synthesizes results, talks to users. Has 4 tools.
2. **Workers** — Execute tasks, report back via notifications. Cannot coordinate.
3. **Communication** — XML notifications, mailbox messaging, and filesystem scratchpad.

## Code Handles Hard Constraints

The coordinator's tool registry is deliberately tiny:

```typescript
export const COORDINATOR_MODE_ALLOWED_TOOLS = new Set([
  AGENT_TOOL_NAME,         // Spawn workers
  TASK_STOP_TOOL_NAME,     // Stop workers
  SEND_MESSAGE_TOOL_NAME,  // Continue workers
  SYNTHETIC_OUTPUT_TOOL_NAME,  // 4 tools total
])
```

The coordinator cannot read files. Cannot edit code. Cannot run bash. It can only delegate. This isn't a prompt suggestion — it's a code-level restriction. Even if the model hallucinates wanting to edit a file, the tool isn't there.

Meanwhile, workers get all the execution tools but none for coordination:

```typescript
const INTERNAL_WORKER_TOOLS = new Set([
  'TeamCreate', 'TeamDelete', 'SendMessage', 'SyntheticOutput'
])

const workerTools = Array.from(ASYNC_AGENT_ALLOWED_TOOLS)
  .filter(name => !INTERNAL_WORKER_TOOLS.has(name))

// Workers have: Read, Write, Bash, Edit, Glob, Grep, etc.
// Workers CANNOT: spawn other agents, send messages, create teams
```

## Prompts Handle Soft Guidance

Code prevents structural failures. Prompts guide behavioral quality. The coordinator system prompt is 370 lines. The essential themes:

> TLDR:
> - Answer questions directly when possible, only delegate none-trivial tasks.
> - Hand over context properly, never let subagent collect entire context.
> - Parallelism is your superpower, launch independent workers concurrently.
> - Verify subagents' work whenever possible.

Here are the actual prompts behind each.

**The coordinator's identity, and don't delegate trivially.**

```
You are a coordinator. Your job is to:
- Help the user achieve their goal
- Direct workers to research, implement and verify code changes
- Synthesize results and communicate with the user
- Answer questions directly when possible — don't delegate work
  that you can handle without tools
```

**How to write worker prompts.**

```
Workers can't see your conversation. Every prompt must be self-contained
with everything the worker needs.

Always synthesize — your most important job

When workers report research findings, you must understand them before
directing follow-up work. Read the findings. Identify the approach.
Then write a prompt that proves you understood by including specific
file paths, line numbers, and exactly what to change.

Never write "based on your findings" or "based on the research."
These phrases delegate understanding to the worker instead of doing
it yourself. You never hand off understanding to another worker.
```

**Never write 'based on your findings'.**

```
// Anti-pattern — lazy delegation
Agent({ prompt: "Based on your findings, fix the auth bug", ... })

// Good — synthesized spec
Agent({ prompt: "Fix the null pointer in src/auth/validate.ts:42.
The user field on Session (src/auth/types.ts:15) is undefined when
sessions expire but the token remains cached. Add a null check before
user.id access — if null, return 401 with 'Session expired'.
Commit and report the hash.", ... })
```

**When to continue vs spawn fresh.** The prompt gives a decision table:

```
Choose continue vs spawn by context overlap

| Situation | Mechanism | Why |
|-----------|-----------|-----|
| Research explored exactly the files that need editing | Continue (SendMessage) | Worker already has the files in context AND now gets a clear plan |
| Research was broad but implementation is narrow | Spawn fresh (Agent) | Avoid dragging along exploration noise; focused context is cleaner |
| Correcting a failure or extending recent work | Continue | Worker has the error context and knows what it just tried |
| Verifying code a different worker just wrote | Spawn fresh | Verifier should see the code with fresh eyes, not carry implementation assumptions |
| First implementation attempt used the wrong approach entirely | Spawn fresh | Wrong-approach context pollutes the retry; clean slate avoids anchoring on the failed path |
| Completely unrelated task | Spawn fresh | No useful context to reuse |

There is no universal default. Think about how much of the worker's
context overlaps with the next task. High overlap -> continue.
Low overlap -> spawn fresh.
```

**Parallelism as superpower.**

```
Parallelism is your superpower. Workers are async. Launch independent
workers concurrently whenever possible — don't serialize work that can
run simultaneously. When doing research, cover multiple angles.
To launch workers in parallel, make multiple tool calls in a single message.
```

**What real verification looks like.** The prompt is skeptical:

```
Verification means proving the code works, not confirming it exists.
- Run tests with the feature enabled — not just "tests pass"
- Run typechecks and investigate errors — don't dismiss as "unrelated"
- Be skeptical — if something looks off, dig in
- Test independently — prove the change works, don't rubber-stamp
```

## Communication: Three Channels

Agents need to share information. Claude Code provides three channels, each for a different type of communication.

### Task Notifications

The default channel. Workers complete, their result arrives as XML in the coordinator's conversation. One-way, automatic, no setup required.

Due to nature of async spawning, the coordinator cannot wait for all agents finish one round and then kick of the next round. Their results are injected back into the coordinator's conversation as user-role message. The XML tag is a lightweight protocol layered on top.

```xml
<task-notification>
  <task-id>agent-a1b</task-id>
  <status>completed</status>
  <summary>Agent "Investigate auth bug" completed</summary>
  <result>Found null pointer in src/auth/validate.ts:42...</result>
</task-notification>
```

```
Worker finishes → <task-notification> injected → Coordinator reads it
```

### SendMessage

The `SendMessage` tool routes messages to named teammates. Point-to-point or broadcast (`to: "*"`). Uses filesystem mailboxes:

```typescript
// SendMessage tool → routes to mailbox files
await writeToMailbox(
  recipientName,
  { from: senderName, text: content, timestamp },
  teamName
)
// Writes to: ~/.claude/teams/{teamName}/mailboxes/{name}/inbox.json
```

The prompt is explicit about when to use it:

``` markdown
# SendMessage

Send a message to another agent.

{"to": "researcher", "summary": "assign task 1", "message": "start on task #1"}

| to | |
|---|---|
| "researcher" | Teammate by name |
| "*" | Broadcast to all teammates — expensive, use only
  when everyone genuinely needs it |

Your plain text output is NOT visible to other agents — to communicate,
you MUST call this tool. Messages from teammates are delivered automatically;
you don't check an inbox.
```

**Your plain text output is not visible to other agents.** This line is doing a lot of work. Without it, the model might think talking "out loud" counts as communication. The prompt corrects that assumption directly.

### Scratchpad

A per-session directory where any agent can write without permission prompts. The coordinator tells workers about it.

```
Scratchpad directory: /tmp/.../scratchpad
Workers can read and write here without permission prompts.
Use this for durable cross-worker knowledge.
```

### Why both SendMessage and Scratchpad?

They look redundant at first glance. Both let agents share information. But they serve different purposes:

- `SendMessage` is transient and addressed. A message goes to a specific agent, gets delivered once, then it's gone.
- **Scratchpad** is persistent and anonymous. Any agent can read or write at any time, no addressing needed. Best for analysis results, structured data, or artifacts that outlive a single interaction.

The rule of thumb: `SendMessage` for coordination, Scratchpad for knowledge.

## Brief

Whoever tried building multi-agent systems knows how easy they go south. Claude Code handles this with two layers of harness.

Code handles hard constraints, Prompts handle soft guidance. The architecture emerges from this split. Both are necessary. Neither is sufficient.
