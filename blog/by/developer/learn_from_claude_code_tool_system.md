---
title: "Learn From Claude Code: Tool System"
description: Learning Claude Code's tool system by inspecting its leaked source code.
cover: media/covers/learn-from-claude-code-cover.svg
tags:
  - agent
  - ai
featured: false
created-date: 2026-04-02T00:00:00-04:00
last-updated-date: 2026-04-08T23:01:16-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and the inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: the tool system that makes every capability pluggable.

Other posts in this series: [App State](blog/by/developer/learn_from_claude_code_app_state_machine.md), [Query Engine](blog/by/developer/learn_from_claude_code_query_engine.md), [Permission System](blog/by/developer/learn_from_claude_code_permission_system.md), [Memory](blog/by/developer/learn_from_claude_code_memory.md), [Context Compaction](blog/by/developer/learn_from_claude_code_context_compaction.md), [MCP Integration](blog/by/developer/learn_from_claude_code_mcp_integration.md), [Multi-Agent](blog/by/developer/learn_from_claude_code_multi_agent.md), [Agent Spawning](blog/by/developer/learn_from_claude_code_agent_spawning.md).

## The Tool Count Paradox

When **OpenClaw** went viral ([Understand OpenClaw by Building One](blog/by/developer/understand_openclaw_by_building_one_2.md)), everyone talked about Pi theory and "minimal tools design" - the idea that autonomous agents should have as few tools as possible to reduce complexity and failure modes.

Claude Code ships with **45+ built-in tools**.

And it works. Really well.

This doesn't disprove minimal tools theory. OpenClaw's [minimal tools approach](blog/by/developer/understand_openclaw_by_building_one_1.md) and Claude Code's maximal approach both work. The difference is in the [permission system](blog/by/developer/learn_from_claude_code_permission_system.md) guardrails. But it complicates the narrative. If OpenClaw's philosophy is correct, Claude Code should be a mess. It isn't. So what's going on?

We don't know the true reason for Claude Code's design - we're reading leaked code, not talking to designers. But we can observe what's there.

## The Tool Inventory

45+ tools sounds chaotic. Here's what it actually looks like:

- **File Operations**: `Read`, `Edit`, `Write`, `Glob`, `Grep`, `NotebookEdit`
- **Execution**: `Bash`, `PowerShell`
- **Agent Orchestration**: `Agent`, `TaskOutput`, `TaskStop`, `TaskCreate`, `TaskGet`, `TaskUpdate`, `TaskList`, `TeamCreate`, `TeamDelete`
- **User Interaction**: `AskUserQuestion`, `SendUserMessage`
- **Mode Management**: `EnterPlanMode`, `ExitPlanMode`, `EnterWorktree`, `ExitWorktree`
- **Web & Network**: `WebFetch`, `WebSearch`
- **MCP Integration**: `mcp__*` (dynamic), `ListMcpResourcesTool`, `ReadMcpResourceTool`
- **System & Scheduling**: `Config`, `Skill`, `LSP`, `ToolSearch`, `TodoWrite`, `CronCreate`, `CronDelete`, `CronList`, `RemoteTrigger`

Plus internal tools: `REPL`, `Tungsten`, `Sleep`, `SendMessage`, `Workflow`, etc. And MCP tools loaded dynamically from external servers.

## The Inventory is Dynamic

The 45+ count isn't a fixed list. Different execution contexts get different tool sets.

```typescript
// src/constants/tools.ts
export const ASYNC_AGENT_ALLOWED_TOOLS = new Set([
  FILE_READ_TOOL_NAME,
  WEB_SEARCH_TOOL_NAME,
  GREP_TOOL_NAME,
  GLOB_TOOL_NAME,
  SHELL_TOOL_NAMES,
  FILE_EDIT_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
  NOTEBOOK_EDIT_TOOL_NAME,
  SKILL_TOOL_NAME,
  SYNTHETIC_OUTPUT_TOOL_NAME,
  TOOL_SEARCH_TOOL_NAME,
  ENTER_WORKTREE_TOOL_NAME,
  EXIT_WORKTREE_TOOL_NAME,
  // ~15 tools
])

export const ALL_AGENT_DISALLOWED_TOOLS = new Set([
  AGENT_TOOL_NAME,          // No recursion
  ASK_USER_QUESTION_TOOL_NAME,  // No blocking
  TASK_STOP_TOOL_NAME,      // No cross-agent control
  ENTER_PLAN_MODE_TOOL_NAME,
  EXIT_PLAN_MODE_V2_TOOL_NAME,
])

export const COORDINATOR_MODE_ALLOWED_TOOLS = new Set([
  AGENT_TOOL_NAME,
  TASK_STOP_TOOL_NAME,
  SEND_MESSAGE_TOOL_NAME,
  SYNTHETIC_OUTPUT_TOOL_NAME,  // Only 4 tools
])
```

Three contexts, three tool sets.

- Main REPL: ~45+ tools with filtering
- Async Agents: ~15 tools, no recursion/blocking
- Coordinator mode: 4 tools, orchestration only

The filtering is applied at runtime.

```typescript
// src/utils/toolPool.ts
export function mergeAndFilterTools(
  initialTools: Tools,
  assembled: Tools,
  mode: ToolPermissionContext['mode'],
): Tools {
  // Merge and deduplicate ~45+ tools
  const tools = [...builtIn.sort(byName), ...mcp.sort(byName)]

  // Apply coordinator mode filter → 4 tools
  if (feature('COORDINATOR_MODE') && coordinatorModeModule?.isCoordinatorMode()) {
    return applyCoordinatorToolFilter(tools)
  }

  return tools  // Return all ~45+ for REPL, filtered set for async agents
}
```

The real number won't be 45, but still a relatively large number compared to the 4 tools mentioned in [OpenClaw and Pi theory](blog/by/developer/understand_openclaw_by_building_one_1.md).

## The Tool Has a Fat Interface

The tool system supports a vast number of functionalities, and ends up with a fat interface. Due to the amount of dynamic import in the codebase to solve circular import, we can argue the fat interface is tech debt—the tool system is handling way more than its initial design.

```typescript
// src/Tool.ts (simplified)
type Tool<Input, Output> = {
  // Identity - 5 fields
  readonly name: string
  readonly inputSchema: Input
  readonly outputSchema?: ZodType
  readonly shouldDefer?: boolean
  readonly alwaysLoad?: boolean

  // Execution - 2 methods
  call(args, context, canUseTool, parent, onProgress): Promise<ToolResult<Output>>
  description(input, options): Promise<string>

  // Permissions - 3 methods
  validateInput?(input, context): Promise<ValidationResult>
  checkPermissions(input, context): Promise<PermissionResult>
  preparePermissionMatcher?(input): Promise<(pattern: string) => boolean>

  // Capability flags - 8 methods
  isEnabled(): boolean
  isReadOnly(input): boolean
  isConcurrencySafe(input): boolean
  isDestructive?(input): boolean
  isOpenWorld?(input): boolean
  requiresUserInteraction?(): boolean
  isMcp?: boolean
  isLsp?: boolean

  // UI/UX - 10+ methods
  userFacingName(input): string
  userFacingNameBackgroundColor?(input): string | undefined
  getActivityDescription?(input): string | null
  getToolUseSummary?(input): string | null
  renderToolUseMessage?(...): ReactNode
  renderToolResultMessage?(...): ReactNode
  renderToolUseErrorMessage?(...): ReactNode
  isSearchOrReadCommand?(input): { isSearch: boolean; isRead: boolean }
  // ... more ...

  // Advanced - 15+ niche methods
  backfillObservableInput?(input): void
  getPath?(input): string
  interruptBehavior?(): 'cancel' | 'block'
  mapToolResultToToolResultBlockParam?(...): ToolResultBlockParam
  // ... more ...
}
```

**40+ methods/properties.** While a typical tool only uses a minor subset of them. `GlobTool` only uses 14.

To make the tool definition easier, `buildTool` is introduced with a bunch of defaulted methods implemented.

```typescript
// src/Tool.ts
const TOOL_DEFAULTS = {
  isEnabled: () => true,
  isConcurrencySafe: (_input?: unknown) => false,  // Conservative
  isReadOnly: (_input?: unknown) => false,
  isDestructive: (_input?: unknown) => false,
  checkPermissions: (input, _ctx) =>
    Promise.resolve({ behavior: 'allow', updatedInput: input }),
  toAutoClassifierInput: (_input?: unknown) => '',
  userFacingName: (_input?: unknown) => '',
}

export function buildTool<D extends AnyToolDef>(def: D): BuiltTool<D> {
  return { ...TOOL_DEFAULTS, ...def }
}
```

### [Permission Layers](blog/by/developer/learn_from_claude_code_permission_system.md)

Tools have permission layers built as part of the interface.

- `validateInput()`
	- Tool-specific validation
	- Model gets actionable feedback and can retry
- `checkPermissions()`
	- Tool-specific rules (different from validation)
	- Example: Read tool blocks device files
- `canUseTool()`
	- General permission system (rules + hooks + user decisions)
	- The human-in-the-loop layer

### Tool Concurrency

Concurrency-safe tools batch together. Therefore,

- Read-only tools (`Glob`, `Grep`, `Read`) are safe, so support parallel invocation.
- Write tools (`Edit`, `Write`, `Bash`) are unsafe, so require serial invocation.

```typescript
// src/services/tools/toolOrchestration.ts
function partitionToolCalls(toolUseMessages, toolUseContext): Batch[] {
  return toolUseMessages.reduce((acc, toolUse) => {
    const isConcurrencySafe = tool?.isConcurrencySafe(parsedInput.data) ?? false

    // Batch consecutive safe tools together
    if (isConcurrencySafe && acc[acc.length - 1]?.isConcurrencySafe) {
      acc[acc.length - 1].blocks.push(toolUse)
    } else {
      acc.push({ isConcurrencySafe, blocks: [toolUse] })
    }
    return acc
  }, [])
}
```

## Brief

Tool is the first class citizen in Claude Code. By exposing tools contextually, and providing better guardrails, Claude Code works.

This makes the narrative around "Tool should be abstract and minimal" complicated. And it also opens the gate for more harness engineering around tool design.
