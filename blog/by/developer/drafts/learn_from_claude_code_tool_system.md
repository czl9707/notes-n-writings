---
title: "Learn From Claude Code: Tool System"
description: How Claude Code's plugin architecture manages 40+ tools with schema validation, three-layer permissions, and zero shared state.
cover: media/covers/learn-from-claude-code-cover.svg
tags:
  - agent
  - ai
featured: true
created-date: 2026-04-02T00:00:00-04:00
last-updated-date: 2026-04-02T00:00:00-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and the inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: the tool system that makes every capability pluggable.

## The Problem

Every agent needs to do things. Read files, run commands, search code, manage tasks. The naive approach: hardcode each capability into the core loop. Then you need a new capability, and another, and suddenly the core loop is a monolith.

Claude Code treats every capability as a plugin. Reading a file? Tool. Running bash? Tool. Searching the web? Tool. Managing background tasks? Tool. 40+ tools in the base system, more via MCP servers.

The tool system makes this work through one unified contract.

## The Tool Type

Every tool implements the same interface:

```typescript
type Tool<Input, Output, Progress> = {
  // Identity
  readonly name: string
  aliases?: string[]

  // Schema
  readonly inputSchema: Input  // Zod schema
  outputSchema?: z.ZodType<unknown>

  // Core execution
  call(
    args: z.infer<Input>,
    context: ToolUseContext,
    canUseTool: CanUseToolFn,
    parentMessage: AssistantMessage,
    onProgress?: (progress: Progress) => void,
  ): Promise<ToolResult<Output>>

  // Description
  description(input, options): Promise<string>

  // Permission model
  checkPermissions(input, context): Promise<PermissionResult>
  validateInput?(input, context): Promise<ValidationResult>

  // Capability flags
  isEnabled(): boolean
  isReadOnly(input): boolean
  isDestructive?(input): boolean
  isConcurrencySafe(input): boolean

  // UI rendering
  userFacingName(input): string
  renderToolUseMessage(input, options): React.ReactNode
  renderToolResultMessage?(output, progress, options): React.ReactNode

  // ... 20+ more optional methods
}
```

This is a **fat interface** - lots of methods, most optional. But the contract is clear: every tool has a name, schema, execution logic, permission model, and UI rendering.

Fat interfaces have downsides (tools must implement methods they don't use). But they keep everything in one place. Discoverability over purity.

## Schema System

Tools use **Zod schemas** for input validation:

```typescript
const FileReadTool = {
  name: 'Read',
  inputSchema: z.object({
    file_path: z.string(),
    offset: z.number().optional(),
    limit: z.number().optional(),
  }),

  async call(input, context, canUseTool, parent, onProgress) {
    // TypeScript knows input.file_path is a string
    // Runtime validates before this runs
    const content = await readFile(input.file_path)
    return { content }
  }
}
```

Zod provides:
- **Type inference**: `z.infer<typeof inputSchema>` extracts TypeScript types
- **Runtime validation**: Invalid inputs rejected before execution
- **Schema introspection**: For tool descriptions and error messages

The model sends `{file_path: 123}` (number instead of string). Zod rejects it. The tool's `call()` never runs. Guardrail at the boundary.

MCP tools can provide JSON Schema directly via `inputJSONSchema` instead of converting from Zod. Same validation, different format.

## Three-Layer Permission Model

Every tool call goes through three permission checks:

**Layer 1: validateInput()** - Tool-specific validation

```typescript
async validateInput(input, context): Promise<ValidationResult> {
  if (!isValidPath(input.file_path)) {
    return {
      result: false,
      message: 'Invalid file path',
      errorCode: 400
    }
  }
  return { result: true }
}
```

First gate. Tool-specific logic. Informs the model why the call failed. The model can retry with corrected input.

**Layer 2: checkPermissions()** - Tool-specific permissions

```typescript
async checkPermissions(input, context): Promise<PermissionResult> {
  if (isSystemFile(input.file_path)) {
    return { behavior: 'deny', reason: 'System files are protected' }
  }
  if (context.options.isNonInteractiveSession) {
    return { behavior: 'prompt-user' }  // Ask for permission
  }
  return { behavior: 'allow' }
}
```

Second gate. Called only after validateInput() passes. Tool-specific permission logic. Returns allow/deny/prompt-user.

**Layer 3: canUseTool() wrapper** - General permission system

```typescript
const result = await canUseTool(
  tool,
  input,
  context,
  parentMessage,
  toolUseID,
)
```

Third gate. General permission system:
- Permission rules (always allow Bash(git *))
- Hooks (pre-tool-use callbacks)
- User decisions (approved/denied)
- Denial tracking (threshold for prompting)

Three layers of guardrails before execution. The tool can reject at multiple points for different reasons.

## Dependency Injection

Tools receive everything through `ToolUseContext`:

```typescript
type ToolUseContext = {
  // Options bundle
  options: {
    commands: Command[]
    tools: Tools
    mcpClients: MCPServerConnection[]
    maxBudgetUsd?: number
    // ... 10+ more
  }

  // State access
  getAppState(): AppState
  setAppState(f: (prev: AppState) => AppState): void
  readFileState: FileStateCache

  // UI callbacks
  setToolJSX?: SetToolJSXFn
  addNotification?: (notif: Notification) => void

  // Abort handling
  abortController: AbortController

  // Message history
  messages: Message[]

  // ... 30+ more fields
}
```

This is dependency injection on steroids. Every external dependency a tool might need is injected. No globals. No singletons. Pure functions.

The context includes:
- **State management**: getAppState/setAppState for mutable state
- **UI integration**: setToolJSX, addNotification for rendering
- **Tool system**: tools array, commands, MCP clients
- **Abort mechanism**: abortController for cancellation
- **Message history**: messages array for context

Same context type for all tools. The alternative (per-tool context types) explodes complexity. One massive context vs 40+ specialized contexts. Claude Code chose the former.

## Tool Registry

All tools registered in one place:

```typescript
export function getAllBaseTools(): Tools {
  return [
    AgentTool,
    TaskOutputTool,
    BashTool,
    FileReadTool,
    FileEditTool,
    FileWriteTool,
    GlobTool,
    GrepTool,
    WebFetchTool,
    WebSearchTool,
    AskUserQuestionTool,
    SkillTool,

    // Feature-flagged tools
    ...(SuggestBackgroundPRTool ? [SuggestBackgroundPRTool] : []),
    ...(WebBrowserTool ? [WebBrowserTool] : []),
    ...(SleepTool ? [SleepTool] : []),
    ...cronTools,
    ...(getPowerShellTool() ? [getPowerShellTool()] : []),
  ]
}
```

Feature flags control which tools are available:
- `process.env.USER_TYPE === 'ant'` - Ant-only tools
- `feature('KAIROS')` - KAIROS integration tools
- `feature('COORDINATOR_MODE')` - Coordinator tools

Dead code elimination via Bun's bundler removes unavailable tools at build time. The tool list is compile-time configurable.

## Tool Filtering

Not all tools available in all contexts:

```typescript
export const getTools = (permissionContext: ToolPermissionContext): Tools => {
  // Simple mode: only Bash, Read, Edit
  if (isEnvTruthy(process.env.CLAUDE_CODE_SIMPLE)) {
    return filterToolsByDenyRules(
      [BashTool, FileReadTool, FileEditTool],
      permissionContext
    )
  }

  // Full tool set with deny rules
  const allTools = getAllBaseTools()
  return filterToolsByDenyRules(allTools, permissionContext)
}
```

Permission deny rules filter tools:
- Blanket deny: "no Bash tool" → removed before model sees it
- MCP server deny: "no tools from server X" → all tools from that server filtered

Filtering happens at getTools() time, not call time. The model never sees denied tools in its tool list.

## Tool Organization

Each tool is a self-contained directory:

```
src/tools/
  BashTool/
    BashTool.ts        # Implementation
    prompt.ts          # Prompt generation
    UI.tsx             # React rendering
    constants.ts       # Shared constants

  FileReadTool/
    FileReadTool.ts
    prompt.ts
    UI.tsx

  AgentTool/
    AgentTool.ts
    prompt.ts
    agentMemory.ts     # Agent-specific logic
    agentColorManager.ts
    loadAgentsDir.ts
```

Each tool owns its:
- **Implementation** (call() logic)
- **Prompts** (description() logic)
- **UI** (render functions)
- **Constants** and helpers

No shared tool state. Each tool is isolated. Dependencies flow through ToolUseContext.

## Progress Streaming

Tools can stream progress:

```typescript
async call(input, context, canUseTool, parent, onProgress) {
  onProgress?.({ type: 'status', status: 'Starting...' })

  for (const chunk of results) {
    onProgress?.({ type: 'result', chunk })
  }

  onProgress?.({ type: 'complete' })
  return finalResult
}
```

Progress types:
- `BashProgress`: `{type: 'output', output: string} | {type: 'exit', code: number}`
- `AgentToolProgress`: `{type: 'status', status: string}`
- `WebSearchProgress`: `{type: 'searching', query: string}`

UI renders these in real-time. Long-running operations show progress, not silence.

## Permission Matchers

Tools can define pattern matching for permission rules:

```typescript
preparePermissionMatcher?(input): Promise<(pattern: string) => boolean>
```

Example: Bash tool matches "git *" pattern:
- Rule: `Bash(git *)` → allow
- Input: `{command: "git status"}`
- Matcher returns true → rule applies

Without this, only tool-name-level matching works (`Bash` → allow all Bash calls).

This is how permission rules support wildcards: `Bash(git *)`, `Read(/tmp/*)`, etc.

## Concurrency Safety

```typescript
isConcurrencySafe(input: z.infer<Input>): boolean
```

Returns true if multiple calls with same input are safe. Used by agent system to determine which tools can run in parallel.

Read-only tools are typically concurrency-safe. Write tools are not.

This is a simple flag that enables parallel execution. The tool declares its safety properties; the system respects them.

## Destructive Operations

```typescript
isDestructive?(input: z.infer<Input>): boolean
```

Flags irreversible operations (delete, overwrite, send). Used for:
- Extra confirmation prompts
- Logging/audit trails
- UI warnings

Defaults to false. Only set for truly destructive operations.

This is observability built into the type system. The tool declares its nature; the system handles it appropriately.

## Integration Points

**Query Engine** (execution):
```typescript
const result = await tool.call(
  input,
  context,
  canUseTool,
  message,
  onProgress
)
```

**Permission System** (authorization):
```typescript
const permission = await tool.checkPermissions(input, context)
```

**UI Components** (rendering):
```typescript
const element = tool.renderToolUseMessage(input, options)
```

**Tool Search** (discoverability):
```typescript
const tool = tools.find(t => toolMatchesName(t, toolName))
```

**MCP Integration** (external tools):
```typescript
const mcpTools = mcpClients.flatMap(client => client.tools)
```

Every integration goes through the Tool interface. One contract, many consumers.

## Caveats

### Fat Interface

30+ methods in the Tool type. Tools must implement methods they don't use (or leave undefined). This is an anti-pattern in object-oriented design.

Alternative: separate interfaces (ReadOnlyTool, DestructiveTool, ProgressTool). But that fragments the contract. Fat interface keeps everything discoverable in one place.

Tradeoff: discoverability vs purity. Claude Code chose discoverability.

### Massive Context

ToolUseContext has 40+ fields. Dependency injection gone wild. The alternative (per-tool context types) requires 40+ specialized context types.

Tradeoff: one massive context vs many specialized contexts. Claude Code chose one massive context.

### Tool Proliferation

40+ tools in base system, more via MCP. Flat namespace (no hierarchical names). Name collisions are possible (MCP servers could define duplicate names).

The system relies on convention (unique names) rather than enforcement.

### Feature Flag Complexity

Tools loaded conditionally based on 10+ feature flags. Understanding which tools are available requires tracing through conditionals.

This is the price of compile-time configurability. Dead code elimination requires conditional loading.

## Brief

The Tool System is a plugin architecture with strong contracts:

- **Single Tool type** - 30+ methods defining the full lifecycle
- **Zod schemas** - Runtime validation with type inference
- **Three-layer permissions** - validateInput, checkPermissions, canUseTool
- **Dependency injection** - Everything through ToolUseContext
- **Feature flags** - Conditional tool loading at build time
- **Self-contained modules** - Each tool owns logic, prompts, UI, helpers

What makes it work:
- **Guardrails at every layer** - Multiple permission checks before execution
- **Schema-driven validation** - Invalid inputs rejected early
- **Context isolation** - No shared state between tools
- **Feature flag discipline** - Dead code elimination keeps bundles lean
- **Plugin pattern** - Every capability is a tool, including core operations

The impressive part isn't the Tool type itself (it's just an interface). It's the ecosystem:
- Permission system that respects tool-specific logic
- UI rendering that each tool controls
- Progress streaming for long-running operations
- Tool search for discoverability in a 40+ tool namespace

A plugin architecture with the right guardrails scales to 40+ tools without collapsing into chaos.

Next blog: MCP Integration - how external tools plug into the system.
