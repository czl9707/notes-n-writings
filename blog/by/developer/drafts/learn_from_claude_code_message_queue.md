---
title: "Learn From Claude Code: Message Queue"
description: How Claude Code manages incoming commands with a single priority-based queue that works for both React and non-React code.
cover: media/covers/learn-from-claude-code-cover.svg
tags:
  - agent
  - ai
featured: true
created-date: 2026-04-02T00:00:00-04:00
last-updated-date: 2026-04-02T00:00:00-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and the inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: the message queue that handles every incoming command.

## The Problem

Every agent needs to manage incoming work. User types a command, a task completes, a notification arrives, a scheduled job fires. Where do they all go?

The naive approach: separate queues for different things. User commands go here, notifications there, scheduled tasks somewhere else. Then you coordinate between them. Then you have a distributed systems problem.

Claude Code uses a single unified queue. Everything goes through it. User input, task completions, scheduled jobs, channel messages - one queue, priorities, done.

## Module-Level State

The queue lives at module scope:

\`\`\`typescript
const commandQueue: QueuedCommand[] = []
let snapshot: readonly QueuedCommand[] = Object.freeze([])
\`\`\`

Not in React state. Not in a class instance. Module-level.

This matters because Claude Code has two types of code:
- **React code**: UI components, input handling
- **Non-React code**: Query engine, streaming loop, print logic

React state only works in React. The query engine can't see it. But module-level state works everywhere.

React components subscribe via \`useSyncExternalStore\`:

\`\`\`typescript
const commands = useSyncExternalStore(
  subscribeToCommandQueue,   // subscribe function
  getCommandQueueSnapshot    // get snapshot function
)
\`\`\`

Non-React code reads directly:

\`\`\`typescript
while (hasCommandsInQueue()) {
  const cmd = dequeue()
  // process command
}
\`\`\`

Same queue, two access patterns. This is the right abstraction for codebases that mix React and non-React.

## Priority System

Three priority levels:

\`\`\`typescript
const PRIORITY_ORDER = {
  now: 0,    // System-critical, immediate
  next: 1,   // User input (default)
  later: 2,  // Notifications (default)
}
\`\`\`

Dequeue always picks the highest priority (lowest number) command. Within same priority, FIFO order preserved.

**User input defaults to 'next', notifications default to 'later'.** This guarantees user commands are never starved by system messages. A notification flood can't block the user from getting work done.

This is a simple guardrail with significant UX impact. The user always feels responsive, even when the system is churning through background tasks.

## Frozen Snapshots

Every mutation creates a new frozen array:

\`\`\`typescript
function notifySubscribers(): void {
  snapshot = Object.freeze([...commandQueue])
  queueChanged.emit()
}
\`\`\`

This seems wasteful - copy the entire array on every change? But:
- Queue is small (typically <10 commands)
- Immutability prevents React bugs (reference equality checks work)
- Performance is fine in practice

React's \`useSyncExternalStore\` needs immutable snapshots. If the snapshot reference doesn't change, React doesn't re-render. Frozen arrays guarantee this.

This is correctness over micro-optimization. Premature optimization would be keeping a dirty flag and incremental updates. But the simple approach (copy everything) works fine for the actual data sizes involved.

## Editable vs Non-Editable

Some queued commands should be pullable into the input buffer:
- User typed a command but hasn't submitted
- User hits UP arrow to edit queued command

Others should NOT be editable:
- Task notifications (system-generated)
- Channel messages (raw XML)
- Meta commands (internal)

The queue distinguishes:

\`\`\`typescript
function isQueuedCommandEditable(cmd: QueuedCommand): boolean {
  return isPromptInputModeEditable(cmd.mode) && !cmd.isMeta
}
\`\`\`

When you hit UP or ESC:

\`\`\`typescript
function popAllEditable(currentInput: string): PopAllEditableResult {
  // Extract editable commands
  const { editable = [], nonEditable = [] } = objectGroupBy(
    [...commandQueue],
    cmd => isQueuedCommandEditable(cmd) ? 'editable' : 'nonEditable'
  )

  // Combine editable with current input
  const newInput = [...editable.map(extractText), currentInput]
    .filter(Boolean)
    .join('\n')

  // Put non-editable back in queue
  commandQueue.length = 0
  commandQueue.push(...nonEditable)

  return { text: newInput, images }
}
\`\`\`

Extract editable commands, combine with current input, put non-editable back. Clean separation.

Channel messages are visible (user sees what arrived) but not editable (raw XML). The queue distinguishes visibility from editability.

## Filter-Based Dequeueing

The \`dequeue()\` function accepts an optional filter:

\`\`\`typescript
dequeue(cmd => cmd.agentId === undefined)  // Main-thread only
dequeue(cmd => cmd.priority === 'now')     // Immediate only
\`\`\`

Non-matching commands stay in queue untouched. This lets different consumers drain specific subsets without restructuring the queue.

The query engine can drain main-thread commands while leaving agent commands. The REPL can drain user commands while leaving system notifications. Same queue, selective draining.

## "Pending Notifications" is a Lie

The file exports:

\`\`\`typescript
/** @deprecated Use subscribeToCommandQueue */
export const subscribeToPendingNotifications = subscribeToCommandQueue

/** @deprecated Use dequeue */
export function dequeuePendingNotification(): QueuedCommand | undefined {
  return dequeue()
}
\`\`\`

"Pending notifications" and "command queue" are the same thing. Historical naming evolved into a general command queue, but the old names remain as aliases.

There is no separate notification queue. There is no side channel. It's all one unified queue with priorities. The guardrails (priority separation, editable checks) make this work without needing multiple queues.

## Logging

Every operation logs:

\`\`\`typescript
function logOperation(operation: QueueOperation, content?: string): void {
  const queueOp: QueueOperationMessage = {
    type: 'queue-operation',
    operation,  // 'enqueue', 'dequeue', 'remove'
    timestamp: new Date().toISOString(),
    sessionId,
    ...(content && { content }),
  }
  void recordQueueOperation(queueOp)
}
\`\`\`

This creates an audit trail. When debugging weird queue behavior, you can trace every mutation. Observability built in from the start.

## Integration Points

**React Components**:
\`\`\`typescript
const commands = useSyncExternalStore(
  subscribeToCommandQueue,
  getCommandQueueSnapshot
)
\`\`\`

**Query Engine**:
\`\`\`typescript
while (hasCommandsInQueue()) {
  const cmd = dequeue()
  // process
}
\`\`\`

**Streaming Loop** (in print.ts):
\`\`\`typescript
// Between chunks
if (hasCommandsInQueue()) {
  const urgent = peek(cmd => cmd.priority === 'now')
  if (urgent) {
    // interrupt stream
  }
}
\`\`\`

**Slash Commands**:
\`\`\`typescript
if (cmd.value.trim().startsWith('/') && !cmd.skipSlashCommands) {
  processSlashCommand(cmd)
}
\`\`\`

The queue is the central hub. Everything flows through it.

## Caveats

### Not Actually a State Machine

The tour description might suggest complex state transitions. It's a queue. Enqueue, dequeue, peek. The state machine is in the consumers (query engine, UI), not the queue itself.

The queue is a data structure with guardrails, not a state machine.

### Module-Level Singleton

Single queue for the entire application. No isolation between sessions (if you had multiple concurrent sessions, which Claude Code doesn't). Fine for this use case, but be aware it's global state.

### Frozen Snapshots

Yes, copying the array on every mutation is O(n). But n is small (<10 typically), so it doesn't matter. If you had thousands of queued commands, you'd need a different approach.

### KAIROS Channels

There's feature-flagged code for "channel messages" from some KAIROS integration. Not in the main build, not fully explored here. The guardrails are visible but the integration isn't.

## Brief

The message queue isn't rocket science. It's a simple data structure with thoughtful guardrails:

- **Module-level state** - works for React and non-React
- **Priority system** - user input never starved
- **Frozen snapshots** - correctness over micro-optimization
- **Editable vs visible** - clear boundaries for user interaction
- **Filter-based dequeueing** - selective draining without multiple queues
- **Single unified queue** - no separate notification channel

What makes it work isn't complexity. It's the constraints:
- User commands get priority over notifications (always)
- Non-editable commands can't leak into input buffer (safety)
- React gets immutable snapshots (correctness)
- Everything logs (observability)

The impressive part is the discipline. A simple queue with the right guardrails beats a complex multi-queue system with coordination overhead.

Next blog: Tool System - how 40+ tools get defined, permissioned, and executed.
