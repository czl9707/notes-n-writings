---
title: "Learn From Claude Code: Query Engine"
description: The query engine isn't a state machine for academic reasons. It's a recovery coordinator - every continue handles something that went wrong.
cover: media/covers/learn-from-claude-code-cover.svg
tags:
  - agent
  - ai
featured: true
created-date: 2026-04-02T00:00:00-04:00
last-updated-date: 2026-04-05T18:03:13-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: the Query Engine - and why "state machine" misses the point.

## The Problem

Every agent starts with a simple loop:

```typescript
while (true) {
  const response = await api.sendMessage(messages)
  messages.push(response)

  if (response.stop_reason === 'end_turn') break

  const toolResults = await executeTools(response.tool_calls)
  messages.push(toolResults)
}
```

A hundred lines. The amazing agent loop with some retry logic, done.

Then production shows up. Streaming (don't buffer). Thinking blocks (preserve for trajectory). Context limits (compact or fail). Output limits (escalate or nudge). Rate limits (backoff and retry). Budget tracking (don't exceed).

The simple loop becomes a **recovery coordinator** - not because someone wanted a state machine, but because every production failure mode needs a specific recovery strategy.

## State Machine for Failure Recovery

The state fields for query engine tell a story of all recovery attempts.

```typescript
type State = {
  messages: Message[]

  // Compaction tracking
  autoCompactTracking: AutoCompactTrackingState | undefined

  // Output token recovery
  maxOutputTokensRecoveryCount: number    // how many times we've retried
  maxOutputTokensOverride: number | undefined  // escalated limit (8k -> 64k)

  // Reactive compact guard
  hasAttemptedReactiveCompact: boolean    // only one attempt per query

  // Turn tracking
  turnCount: number
  transition: Continue | undefined        // why previous iteration continued
}
```

Each field exists because something can fail. `maxOutputTokensRecoveryCount` exists because output limits exist. `hasAttemptedReactiveCompact` exists because 413 errors exist.

## Two Actions Yielded from the Loop

The query engine has a simple vocabulary.

- `continue` meaning the loop continues, there may or may not have been an error.
- `return` when you're done (or truly stuck).

Both associate with a reason to avoid an ambiguous `retry` flag confusing consumers.

### Continue

`continue` means "we are still in the loop, even if something broke, but I know how to handle it." The model sees the new context (compact summary, resume prompt, blocking error) but never sees the transition reason itself.

```typescript
// Normal flow - execute tools and continue
transition: { reason: 'next_turn' }

// 413 prompt too long - compact context and retry
transition: { reason: 'reactive_compact_retry' }

// Hit 8k output cap - escalate to 64k and retry same request
transition: { reason: 'max_output_tokens_escalate' }

// Hit output limit - inject resume prompt and continue
transition: { reason: 'max_output_tokens_recovery', attempt: 2 }

// Hook rejected something - inject error, force model to fix
transition: { reason: 'stop_hook_blocking' }

// Budget exceeded - nudge model to wrap up
transition: { reason: 'token_budget_continuation' }
```

### Return

Not all errors are recoverable, such as "Prompt too long" or "Max turn reached". Terminal states. No more recovery attempts. The loop exits.

```typescript
// Normal completion
return { reason: 'completed' }

// Hit configured turn limit
return { reason: 'max_turns', turnCount: 15 }

// Context exceeds limit, compaction failed
return { reason: 'prompt_too_long' }

// User cancelled during stream
return { reason: 'aborted_streaming' }
```

## Context Surgery

The query engine doesn't just pass messages through. It manipulates context to achieve reliable behavior and satisfy API constraints.

### Meta Message Injection

Messages with `isMeta: true` are hidden from UI but visible to the model. The harness uses them to steer behavior without cluttering the transcript.

```typescript
// Output limit hit - steer recovery
const recoveryMessage = createUserMessage({
  content: `Output token limit hit. Resume directly — no apology, no recap.
    Pick up mid-thought if that is where the cut happened.`,
  isMeta: true,
})

// Budget exceeded - prevent premature summary
const nudgeMessage = createUserMessage({
  content: `Stopped at 78% of token target. Keep working — do not summarize.`,
  isMeta: true,
})
```

It feels like Claude Code is whispering at the model, giving it guidance to keep it in lane without the user noticing that recovery is happening under the hood.

### Error Withholding

Errors are surfaced far less often than they actually occur. Requiring users to retry every time minor errors happen is a bad experience. Claude Code handles this by withholding the error until recovery exhausts.

```typescript
if (isWithheldMaxOutputTokens(message)) {
  withheld = true  // Don't yield yet
}
// ... try recovery ...
if (recoveryExhausted) {
  yield withheldMessage  // Only now surface it
}
```

The pattern: inject prompts to steer, withhold errors until recovery fails, never let the model see the raw failure.

### Clean before Retry

Sometimes messages in context become invalid and must be removed before retry. Two common scenarios:

- **Streaming fallback**: Switching models mid-stream leaves partial thinking blocks with signatures bound to the original model.
- **Credential changes**: After `/login`, thinking block signatures become invalid.

**Tombstones** signal downstream consumers (UI, transcript) to remove orphaned messages.

```typescript
if (streamingFallbackOccured) {
  for (const msg of assistantMessages) {
    yield { type: 'tombstone', message: msg }
  }
  assistantMessages.length = 0
}
```

**Strip Signatures** - When credentials change (`/login`) or model switches, thinking block signatures become invalid. The API returns 400 on replay. Strip them before retry:

```typescript
messagesForQuery = stripSignatureBlocks(messagesForQuery)
```

## Brief

The simple agent loop is the happy path only. Real harnesses don't emerge from a simple loop. The agent goes south instantly when errors are not handled properly.

By hiding unnecessary detail from the model and whispering guidance through meta messages, the agent is able to keep running in its lane for longer. Not saying Claude Code is perfect, but it does tell a good story of providing resilience through controlled opacity.
