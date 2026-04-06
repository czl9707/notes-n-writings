---
title: "Learn From Claude Code: App State Machine"
description: The global state container that holds everything - permissions, MCP, plugins, tasks, bridge, speculation. One store to rule them all.
cover: media/covers/learn-from-claude-code-cover.svg
tags:
  - agent
  - ai
featured: true
created-date: 2026-04-06T00:00:00-04:00
last-updated-date: 2026-04-06T00:00:00-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: App State - the global store that coordinates everything.

## The Problem

Every agent needs a nervous system. Somewhere to track permissions, plugin states, task queues, remote sessions. The naive approach? Scatter state across modules, pass references everywhere, watch the dependency graph become a plate of spaghetti. Claude Code uses a single store pattern - but the interesting part isn't the store itself, it's what they deliberately kept out.

## The Minimal Store Pattern

Most React apps use Redux with its reducers, actions, and middleware orchestra. Others use Zustand with its bells and whistles. Claude Code uses 30 lines:

```typescript
type Store<T> = {
  getState: () => T
  setState: (updater: (prev: T) => T) => void
  subscribe: (listener: () => void) => () => void
}

export function createStore<T>(initialState: T, onChange?: OnChange<T>): Store<T> {
  let state = initialState
  const listeners = new Set<Listener>()

  return {
    getState: () => state,

    setState: (updater: (prev: T) => T) => {
      const prev = state
      const next = updater(prev)
      if (Object.is(next, prev)) return  // No change, no notify
      state = next
      onChange?.({ newState: next, oldState: prev })
      for (const listener of listeners) listener()
    },

    subscribe: (listener: Listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
```

That's it. Read, write, subscribe. No reducers, no action creators, no middleware. The `onChange` callback is the only hook for cross-cutting concerns - everything else stays pure.

The updater pattern `(prev: T) => T` is the key design choice. It ensures atomic reads and writes - no race conditions from stale closures. You can't accidentally read old state, modify it, and write it back while another update sneaks in.

## Session Configuration, Not Execution State

100+ fields live in AppState, but they all share one trait: they persist across queries. Permission modes, MCP clients, plugin states, task queues - things that survive from one user turn to the next.

This isn't accidental. The architecture draws hard lines around the store, and those lines reveal the design philosophy.

**Messages live in QueryEngine** - Different subagents have different conversation histories. AppState would need a `Map<AgentId, Message[]>` to support this - but that's exactly what the query engine already maintains. No duplication. More importantly, messages are the query engine's domain. Putting them in AppState would couple the engine to the global store, breaking the isolation that makes subagents possible.

**Turn-level recovery state stays in the loop** - The query engine tracks `maxOutputTokensRecoveryCount`, `hasAttemptedReactiveCompact`, `transition` per conversation. These reset each query. Putting them in AppState would bloat the store with transient data that doesn't need global coordination. The store would become a dumping ground for every ephemeral counter and flag.

**File cache is passed explicitly** - File contents are cached per-agent with LRU eviction. This is performance infrastructure, not application state. Putting it in AppState would cause unnecessary re-renders and complicate immutability guarantees. More fundamentally, a cache isn't state - it's an optimization. State should be truth, not a performance hack.

The principle: AppState holds **session-level coordination**, not **per-turn execution state**. If it resets between queries, it doesn't belong here. This keeps the store focused, testable, and prevents it from becoming a global variable dumping ground.

## Dependency Injection, Not Import

The query engine doesn't own AppState. It receives callbacks:

```typescript
type ToolUseContext = {
  // ... other fields
  getAppState(): AppState
  setAppState(f: (prev: AppState) => AppState): void
  setAppStateForTasks?: (f: (prev: AppState) => AppState) => void  // For nested agents
}
```

This pattern enables three things:

**State injection for tests** - Pass mock `getAppState` that returns fixtures. No need to import the real store.

**Isolation for subagents** - Each subagent gets its own `ToolUseContext` with modified callbacks. They can have their own state view without touching the global store.

**React integration** - REPL passes `store.getState` and `store.setState` directly. No adapter layer.

The query engine never imports the store. It receives access. This makes the query logic pure - it operates on whatever state it's given, making it testable and portable.

## Mode Management as Configuration

Permission modes are first-class state:

```typescript
type PermissionMode =
  | 'default'        // Ask for dangerous operations
  | 'plan'           // Read-only, plan before executing
  | 'acceptEdits'    // Auto-approve Edit/Write tools
  | 'bypassPermissions'  // No prompts (headless, dangerous)
  | 'dontAsk'        // Never prompt, fail instead
  | 'auto'           // Classifier decides (ant-only)
```

Modes change via CLI flags, config tool, or plan mode tools. When entering plan mode, the current mode is preserved:

```typescript
// EnterPlanModeTool
setAppState(prev => ({
  ...prev,
  toolPermissionContext: {
    ...prev.toolPermissionContext,
    prePlanMode: prev.toolPermissionContext.mode,  // Save current
    mode: 'plan',  // Switch to plan
  },
}))
```

This enables nested mode changes without losing context. The mode is configuration, but the transition is tool-driven - a nice separation of concerns.

## Why These Tradeoffs Work

Some details that make this work in practice.

### Single Store vs Namespaced Stores

The store is a global singleton in REPL mode. All components share one AppState. This works because Claude Code is single-user, single-session. Multi-window or collaborative scenarios would need namespacing or CRDTs - but that's not the use case.

The tradeoff: simplicity now, flexibility later. A single store keeps coordination explicit. If you need to know what state affects what, it's all in one place. The cost is that everything sees everything - no information hiding between subsystems. But for a single-user tool, that's fine. The store is the integration point, not a domain boundary.

### Callbacks vs Direct Import

The query engine could import the store directly. It doesn't. Callbacks mean the engine works with any state source - mock state for tests, isolated state for subagents, or the real store for REPL.

This is dependency injection at its simplest. The query engine doesn't know or care where state comes from. It just knows how to read and write it. The caller decides the semantics. This is what makes subagents possible - each one gets its own state view without the engine needing to know.

### Headless vs Interactive Convergence

In SDK mode, there's no React. The store still exists, but `onChange` handles state persistence instead of re-renders. The callback pattern abstracts this difference - the query engine works the same way regardless of UI. One pattern, two runtimes.

This is the payoff of the callback pattern. React integration becomes just one consumer of the store. Headless mode becomes another. The core logic doesn't change. The architecture doesn't privilege one runtime over another - both are equal consumers of the same abstraction.

## Brief

The store abstraction is deliberately minimal - read, write, subscribe, done. No Redux ceremony. What makes this work is the exclusion principle: messages belong to the query engine, turn-level state stays in the loop, caches get passed explicitly. The query engine never imports the store - it receives access through callbacks, keeping it pure and testable. Session-level coordination, not execution state - that's the discipline that prevents the store from becoming a global variable dumping ground.
