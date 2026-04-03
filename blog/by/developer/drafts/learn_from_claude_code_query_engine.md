---
title: "Learn From Claude Code: Query Engine"
description: Diving into Claude Code's query engine - the state machine that orchestrates all API communication, tool execution, and session management.
cover: media/covers/learn-from-claude-code-cover.svg
tags:
  - agent
  - ai
featured: true
created-date: 2026-04-02T00:00:00-04:00
last-updated-date: 2026-04-02T00:00:00-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and the inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: the Query Engine, the state machine that powers every conversation.

## The Problem

Every agent needs a conversation loop. Send a message, get a response, maybe call some tools, send their results back, repeat. Simple on paper.

But then you add streaming (don't buffer the entire response), thinking mode (let the model reason), retry logic (APIs fail), token budgeting (stay under limits), permission checks (user didn't approve that tool), and suddenly your simple loop is a 1,296-line state machine.

Claude Code's QueryEngine handles all of this. Let's see how.

## Two Entry Points

The engine exposes two ways in:

```typescript
// Standalone function - creates engine, runs one conversation
export async function* ask({ ... }): AsyncGenerator<SDKMessage> {
  const engine = new QueryEngine({ ... })
  yield* engine.submitMessage(prompt, options)
}

// Class-based - persists across multiple turns
export class QueryEngine {
  async *submitMessage(prompt, options): AsyncGenerator<SDKMessage> {
    // ... actual loop logic
  }
}
```

The `ask()` function is for SDK users who want fire-and-forget. Create engine, run conversation, done. The `QueryEngine` class is for persistent sessions where state survives across multiple `submitMessage()` calls.

Both are async generators. This isn't a cosmetic choice.

## Why Generators?

An async generator (`AsyncGenerator<T>`) lets you stream results as they arrive:

```typescript
for await (const message of engine.submitMessage(prompt)) {
  // Process each message immediately
  // No buffering the entire conversation
}
```

The caller can:
- Display partial results in real-time
- Cancel mid-stream (break the loop)
- Process infinite streams (no memory pressure)

This is the right abstraction for streaming API responses. Buffering defeats the purpose.

## State Management

One QueryEngine per conversation. State persists across turns:

```typescript
class QueryEngine {
  private mutableMessages: Message[]           // Conversation history
  private abortController: AbortController     // Cancellation
  private permissionDenials: SDKPermissionDenial[]  // Tracked rejections
  private totalUsage: NonNullableUsage         // Token counting
  private readFileState: FileStateCache        // File content cache
  private discoveredSkillNames: Set<string>    // Turn-scoped skill discovery
}
```

The key insight: **state isolation**. Each conversation gets its own engine with its own state. No shared mutable global state. No race conditions between conversations.

This is basic software engineering, but you'd be surprised how many agents mess it up.

## Permission Wrapper Pattern

Every tool call goes through a permission check. But the QueryEngine doesn't just check - it *tracks*:

```typescript
const wrappedCanUseTool = async (tool, input, context, ...) => {
  const result = await canUseTool(tool, input, context, ...)

  // Track denials for SDK reporting
  if (result.behavior !== 'allow') {
    this.permissionDenials.push({
      tool_name: tool.name,
      tool_use_id: toolUseID,
      tool_input: input,
    })
  }

  return result
}
```

This wrapper injects observability without modifying the core permission logic. The permission system does its job; the QueryEngine does its job (tracking). Clean separation.

Guardrails like this - small, local, composable - are what make the system maintainable. No omniscient god objects.

## Dependency Injection

All external dependencies come through the constructor:

```typescript
type QueryEngineConfig = {
  tools: Tools                           // Tool system
  canUseTool: CanUseToolFn               // Permission checker
  getAppState: () => AppState            // State reader
  setAppState: (f: (prev) => AppState)   // State writer
  mcpClients: MCPServerConnection[]      // MCP servers
  commands: Command[]                    // Slash commands
  // ... 20+ more dependencies
}
```

No globals. No singletons. Everything is injected. This makes the QueryEngine:
- **Testable** - inject mocks
- **Decoupled** - swap implementations
- **Configurable** - different behavior per instance

Again, basic software engineering. But in agent codebases, dependency injection is rare. Most just import globals everywhere.

## The submitMessage() Flow

Here's what happens when you call `submitMessage()`:

**1. Setup Phase**
```typescript
this.discoveredSkillNames.clear()  // Clear turn-scoped state
setCwd(cwd)                        // Set working directory
const startTime = Date.now()       // Track duration
```

**2. System Prompt Assembly**
```typescript
const { defaultSystemPrompt, userContext } = await fetchSystemPromptParts({
  tools,
  mainLoopModel,
  mcpClients,
  customSystemPrompt,
})

const systemPrompt = asSystemPrompt([
  ...(customPrompt ?? defaultSystemPrompt),
  ...(memoryMechanicsPrompt ?? []),
  ...(appendSystemPrompt ?? []),
])
```

This is where Claude Code's impressive prompt engineering lives. The system prompt isn't static - it's assembled dynamically based on tools, context, memory, and configuration.

**3. Hook Registration**
```typescript
if (jsonSchema && hasStructuredOutputTool) {
  registerStructuredOutputEnforcement(setAppState, getSessionId())
}
```

Hooks for structured output, compact boundaries, thinking mode - all registered before the loop starts.

**4. Query Loop** (the actual state machine - likely in `src/query.ts`)

The engine calls `query()` (imported from `src/query.js`) which handles:
- Streaming API responses
- Executing tools
- Processing tool results
- Retry logic
- Token budgeting

This is the "complex state machine" the tour mentions. The QueryEngine orchestrates; `query()` executes.

**5. Yield Results**
```typescript
yield* engine.submitMessage(prompt, options)
```

Each `SDKMessage` flows to the caller immediately. No buffering.

## Feature Flags

The QueryEngine uses feature flags for conditional compilation:

```typescript
const getCoordinatorUserContext = feature('COORDINATOR_MODE')
  ? require('./coordinator/coordinatorMode.js').getCoordinatorUserContext
  : () => ({})

const snipModule = feature('HISTORY_SNIP')
  ? require('./services/compact/snipCompact.js')
  : null
```

Bun's bundler eliminates dead code branches when `feature()` returns false at build time. This keeps the QueryEngine lean for different deployment targets (SDK vs REPL, coordinator mode vs standalone).

Guardrails again - compile-time feature gates instead of runtime conditionals everywhere.

## Memory Management

Two memory-related state fields:

```typescript
private discoveredSkillNames = new Set<string>()
private loadedNestedMemoryPaths = new Set<string>()
```

Both are **turn-scoped** - cleared at the start of each `submitMessage()` call. This prevents unbounded growth across many turns in long sessions.

The memory system itself lives in `src/memdir/`. QueryEngine just loads the memory prompt and tracks what's been loaded.

## Budget Enforcement

Two budget types:

```typescript
maxBudgetUsd?: number      // Dollar limit
taskBudget?: { total: number }  // Token/turn budget
```

The engine tracks usage in `totalUsage` and exposes:

```typescript
getTotalCost()
getTotalAPIDuration()
getModelUsage()
```

Budget enforcement happens in the query loop - if budget exceeded, stop generating. Clean separation: QueryEngine tracks, query loop enforces.

## Caveats

### Not Actually 46K Lines

The tour description says "46K line engine" but `QueryEngine.ts` is 1,296 lines. Either:
- The tour is outdated
- 46K includes transitive dependencies (query loop, tool system, API layer)
- It refers to the entire query subsystem, not just this file

The file is still complex, but let's be accurate about where the complexity lives.

### The Actual State Machine

The real complexity - the streaming loop, tool execution, retry logic - isn't in `QueryEngine.ts`. It's in `src/query.ts` (imported as `query` from `./query.js`).

QueryEngine is the orchestrator. The state machine lives elsewhere. This is good design - separate orchestration from execution - but confusing if you expect everything in one file.

### Lazy Imports

Heavy dependencies are loaded lazily:

```typescript
const messageSelector = () =>
  require('src/components/MessageSelector.js')
```

This keeps startup fast. Message filtering only needs to load when actually filtering messages. But it makes the dependency graph harder to trace statically.

### "that" Class

There's a class literally named `that` in the file. No idea what it does. The knowledge graph shows it but no summary. Probably a helper or placeholder. Mystery.

## Brief

The QueryEngine isn't rocket science. It's disciplined software engineering:

- **Generators for streaming** - don't buffer, stream immediately
- **State isolation** - one engine per conversation, no shared globals
- **Dependency injection** - everything comes through constructor
- **Wrapper patterns** - inject observability without modifying core logic
- **Feature flags** - compile-time dead code elimination
- **Turn-scoped state** - clear transient state between turns

The impressive part isn't the code complexity - it's the guardrails. Every decision point has constraints. Every state transition is tracked. Every dependency is explicit.

That's what makes it maintainable. Not clever algorithms, but thoughtful boundaries.

The QueryEngine is the orchestrator. The actual state machine lives in `query.ts`. Next blog should probably dive into that - the streaming loop, tool execution, and retry logic that makes the engine actually run.
