---
title: "Learn From Claude Code: Agent Spawning"
description: Learning Claude Code's agent spawning by inspecting its leaked source code.
cover: media/covers/learn-from-claude-code-cover.svg
tags: [agent, ai]
featured: true
created-date: 2026-04-07T00:00:00-04:00
last-updated-date: 2026-04-09T07:45:16-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: how one agent spawns another — and why the mechanics matter more than the idea.

Other posts in this series: [App State](blog/by/developer/learn_from_claude_code_app_state_machine.md), [Query Engine](blog/by/developer/learn_from_claude_code_query_engine.md), [Tool System](blog/by/developer/learn_from_claude_code_tool_system.md), [Permission System](blog/by/developer/learn_from_claude_code_permission_system.md), [Memory](blog/by/developer/learn_from_claude_code_memory.md), [Context Compaction](blog/by/developer/learn_from_claude_code_context_compaction.md), [MCP Integration](blog/by/developer/learn_from_claude_code_mcp_integration.md), [Multi-Agent](blog/by/developer/learn_from_claude_code_multi_agent.md).

## The Problem

Context windows are expensive. Every file read, every tool output, every turn bloats the main agent's working memory. The solution is obvious: delegate to subagents. Fresh context, focused task, return a summary.

The hard part isn't the idea. It's the mechanics — and the [multi-agent coordination](blog/by/developer/learn_from_claude_code_multi_agent.md) that keeps everything sane. What context does the child inherit? What tools does it get? What happens when it crashes? Who cleans up?

Claude Code answers all of these through a single tool.

## One Tool, Four Modes

```typescript
Agent({
  prompt,              // The task description
  subagent_type,       // "general-purpose" | "Plan" | "Explore" | ...
  description,         // 3-5 word summary for UI
  run_in_background,   // true = async, false = blocking
  name,                // Named teammate (team mode)
  team_name,           // Team to join (team mode)
  isolation,           // "worktree" for isolated git copy
})
```

The `Agent` tool is the only entry point for spawning agents. Four modes, chosen by what parameters you pass:

- **Built-in agents** — pass `subagent_type`. Fresh context, specialized behavior, restricted tools. The workhorse.
- **Fork** — omit `subagent_type` (when experiment is enabled). Inherits parent's full conversation and system prompt. Runs in background automatically. Optimized for prompt caching.
- **Teammates** — pass `name` + `team_name`. Named agents in separate terminal panes. Can communicate via `SendMessage`. Flat hierarchy — teammates can't spawn teammates.
- **Remote** — pass `isolation: "remote"`. Runs in a remote Claude Code Runtime. Always background. Separate sandbox entirely.

## Built-in Agents

Built-in Agents are specialized workers. And there are seven types, each with different capabilities.

- `general-purpose` — Research & execution. All tools.
- `Plan` — Architecture planning (read-only). All tools except Edit, Write, Agent.
- `Explore` — Fast codebase search. Bash, Glob, Grep, Read.
- `verification` — Run tests & validate. Bash, Read, Grep, Glob.
- `code-reviewer` — Review completed work. All tools except Agent.
- `statusline-setup` — Configure status line. Read, Edit, Write.
- `claude-code-guide` — Documentation helper. Glob, Grep, Read, WebFetch, WebSearch.

The `Plan` agent is the most interesting. It cannot modify files. The system prompt explicitly says.

```
This is a READ-ONLY planning task. You are STRICTLY PROHIBITED from:
- Creating new files
- Modifying existing files
- Running ANY commands that change system state
```

The tool level restriction is a code-level guard. Even if the model hallucinates and tries to edit, the tool isn't in the pool.

Read-only agents also get slimmed context, they drop the full CLAUDE.md instructions and the git status snapshot. The main agent has full context and interprets their output anyway.

The harness runs a three-layer filter to construct the subagent [tool pool](blog/by/developer/learn_from_claude_code_tool_system.md).

1. **Hard blocks** — All agents lose `Agent` (no recursion), `AskUserQuestion` (no blocking prompts), `TaskStop` (no cross-agent control).
2. **Async restrictions** — Background agents only get ~15 execution tools. No coordination tools.
3. **Agent-specific denylists** — The `Plan` agent additionally blocks file editing. `Explore` blocks all write tools.

## Fork Mode

The fork path is the most complex spawning mode. When `subagent_type` is omitted, the child doesn't start fresh, it inherits the parent's full conversation. So that the **prompt cache** can be shared.

To make this work, every fork child must produce identical API request bytes up to the divergence point. That means:

1. **Same system prompt** — The child inherits the parent's rendered system prompt as raw bytes, not recomputed. Recomputing could diverge if feature flags changed between turns.
2. **Same tool definitions** — The child gets the parent's exact tool pool, not a rebuilt one with different permission modes.
3. **Same placeholder results** — The parent's assistant message contains multiple `tool_use` blocks. Fork replaces ALL results with an identical string:

```typescript
const FORK_PLACEHOLDER_RESULT = 'Fork started — processing in background'
// Every fork child gets the same placeholder for every tool_use
// → byte-identical prefix → cache hit
```

Only the final text block differs per child. This is where the actual task instruction goes:

```
<fork_boilerplate>
STOP. READ THIS FIRST.
You are a forked worker process. You are NOT the main agent.

RULES (non-negotiable):
1. Do NOT spawn sub-agents; execute directly.
2. Do NOT converse, ask questions, or suggest next steps
3. USE your tools directly: Bash, Read, Write, etc.
4. If you modify files, commit your changes before reporting.
5. Keep your report under 500 words.

Output format:
  Scope: <your assigned scope>
  Result: <the answer or key findings>
  Key files: <relevant file paths>
  Files changed: <list with commit hash>
</fork_boilerplate>

[directive]: Fix the null pointer in validate.ts:42
```

The directive is terse by design. The child already has the parent's full context, no need for re-explaining.

And obviously, recursive fork is not allowed.

```typescript
// Primary: check execution context
if (toolUseContext.options.querySource === `agent:builtin:fork`) {
  throw new Error('Fork is not available inside a forked worker')
}

// Fallback: scan messages for the <fork_boilerplate> tag
if (isInForkChild(toolUseContext.messages)) {
  throw new Error('Fork is not available inside a forked worker')
}
```

## Teammates

When both `name` and `team_name` are passed in, the agent doesn't run as a subagent — it becomes a **teammate**. Teammates get their own terminal pane (tmux or in-process), a name that other agents can address, and a mailbox for receiving messages.

```typescript
Agent({
  name: "researcher",
  team_name: "auth-investigation",
  prompt: "Investigate the auth module...",
  description: "Auth investigation"
})
// Returns: { status: "teammate_spawned", tmux_session_name, tmux_pane_id }
```

Other agents (and the coordinator) can send messages to named teammates via the `SendMessage` tool. Teammates can also broadcast to the entire team. The mailbox is filesystem-based — `~/.claude/teams/{teamName}/mailboxes/{name}/inbox.json`.

And same as all previous example, recursive dispatching is disallowed.

```typescript
if (isTeammate() && teamName && name) {
  throw new Error('Teammates cannot spawn other teammates — the team roster is flat.')
}
```

## Worktree Isolation

Any agent can request filesystem isolation via `isolation: "worktree"`. The harness creates a git worktree. The cleanup is done in code, without relying on agent. Keep the worktree if any changes exist, and return the path.

## The Prompt That Teaches Spawning

Four modes, four tradeoffs. The instruction of the agent tool has to sophisticated in order to the mode selection more reliable.

The prompt is dynamically assembled based on which features are active.

```typescript
// Three different prompts for three different execution contexts
if (isCoordinator) return shared                                    // Slim prompt
if (forkEnabled)  return shared + whenToForkSection + forkExamples // Fork guidance
else              return shared + whenNotToUseSection + normalExamples
```

> TLDR:
> - Don't spawn subagent when it's just a tool call.
> - Fork yourself only when progress is not important.
> - When spawning subagent, **never** delegate understanding, provide full context and requirement.

**When NOT to use Agent.**

```
- If you want to read a specific file path, use the Read tool or Glob
  instead of the Agent tool, to find the match more quickly
- If you are searching for a specific class definition like "class Foo",
  use the Glob tool instead of the Agent tool, to find the match more quickly
- If you are searching for code within a specific file or set of 2-3 files,
  use the Read tool instead of the Agent tool
```

**When to fork vs do yourself.**

```
Fork yourself (omit subagent_type) when the intermediate tool output
isn't worth keeping in your context. The criterion is qualitative —
"will I need this output again" — not task size.
- Research: fork open-ended questions. If research can be broken into
  independent questions, launch parallel forks in one message.
- Implementation: prefer to fork implementation work that requires more
  than a couple of edits. Do research before jumping to implementation.
```

**Foreground vs background.**

```
Use foreground (default) when you need the agent's results before you
can proceed — e.g., research agents whose findings inform your next steps.
Use background when you have genuinely independent work to do in parallel.
```

And a behavioral guardrail for background agents:

```
**Don't peek.** The tool result includes an output_file path — do not Read
or tail it unless the user explicitly asks for a progress check. You get a
completion notification; trust it.

**Don't race.** After launching, you know nothing about what the agent found.
Never fabricate or predict agent results in any format.
```

**How to choose an agent type.** The prompt lists available agents with their tool restrictions inline.

```
- general-purpose: General-purpose agent for researching complex questions,
  searching for code, and executing multi-step tasks. (Tools: All tools)
- Plan: Software architect agent for designing implementation plans.
  (Tools: All tools except Agent, ExitPlanMode, FileEdit, FileWrite, NotebookEdit)
- Explore: Fast agent specialized for exploring codebases.
  (Tools: Bash, Glob, Grep, Read)
```

**How to write the child's prompt. Never delegate understanding.**

```
Brief the agent like a smart colleague who just walked into the room —
it hasn't seen this conversation, doesn't know what you've tried,
doesn't understand why this task matters.
- Explain what you're trying to accomplish and why.
- Describe what you've already learned or ruled out.
- Give enough context about the surrounding problem that the agent can
  make judgment calls rather than just following a narrow instruction.

Never delegate understanding. Don't write "based on your findings, fix the
bug" or "based on the research, implement it." Those phrases push synthesis
onto the agent instead of doing it yourself. Write prompts that prove you
understood: include file paths, line numbers, what specifically to change.
```

## Brief

One tool, four modes. Built-in agents for specialized work. Fork for context inheritance and cache sharing. Teammates for named coordination in separate panes. Remote ... for remote.

There isn't one perfect way of delegating tasks — [OpenClaw explored similar ideas](blog/by/developer/understand_openclaw_by_building_one_2.md#Agents%20That%20Grow) around agent growth and delegation. Claude Code provides a good example of combining different approaches, by putting hard restrictions in code, and well designed guidelines in prompt.
