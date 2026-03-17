---
title: "3. Pack the Conversation And Carry On"
description: "Understand OpenClaw by Building One - Part 3"
cover: media/build-your-own-openclaw/03-persistence.svg
tags: [agent, ai]
featured: false
created-date: 2026-03-15T23:08:44-04:00
last-updated-date: 2026-03-16T20:34:04-04:00
---

- [1. Every Agent Starts as a Loop](blog/by/developer/build_your_own_openclaw_1.md)
- [2. Gear up Your Agent](blog/by/developer/build_your_own_openclaw_2.md)
- [3. Pack the Conversation And Carry On](blog/by/developer/build_your_own_openclaw_3.md)
- [4. Beyond the CLI](blog/by/developer/build_your_own_openclaw_4.md)
- [5. Many of Them](blog/by/developer/build_your_own_openclaw_5.md)
- [6. Agents are Running, Your are Sleeping](blog/by/developer/build_your_own_openclaw_6.md)
- [7. More Context! More Context!](blog/by/developer/build_your_own_openclaw_7.md)

All code snippets and working code bases are available at [this repo](https://github.com/czl9707/build-your-own-openclaw).

## Save the Conversation

You and your agent had a great conversation. And you kill the shell. Too bad it doesn't remember any of it.

The solution is simple enough, just save session metadata and messages to disk. And it can end up something like below.

```
.history/
├── index.jsonl              # Session metadata
└── sessions/
    └── {session_id}.jsonl   # Messages (one file per session)
```

And corresponding methods to operate on it.

```python
class HistoryStore:
    def create_session(self, agent_id: str, session_id: str) -> dict:
        """Create a new conversation session."""

    def save_message(self, session_id: str, message: HistoryMessage) -> None:
        """Save a message to history."""

    def get_messages(self, session_id: str) -> list[HistoryMessage]:
        """Get all messages for a session."""
```

![Persistence and history](media/build-your-own-openclaw/03-persistence.svg)

## Context Windows: The Hidden Limit

LLMs have limits. Even with 200k (just became 1M at the moment I am writing this piece) token context windows, you'll hit them. All conversation messages, tool call request response, they all add up. LLM will refuse to handle them eventually.

The solution is compaction, summarize old messages, keep the signal, drop the noise.

## Compaction: Pack and Carry On

To be defensive, we apply two layer of protection.

- **Summarize** — Ask LLM to condense old messages into a summary (expensive, preserves gist).
- **Truncate** — Cut down oversized tool outputs first (cheap, no LLM call). This solve the edge case that the last tool call return a huge result bloat up context directly, leaving entire context in a dead state.

```python
async def check_and_compact(self, state: SessionState) -> SessionState:
    if self.estimate_tokens(state) < self.token_threshold:
        return state

    # Stage 1: truncate large tool results
    state.messages = self._truncate_large_tool_results(state.messages)

    if self.estimate_tokens(state) < self.token_threshold:
        return state

    # Stage 2: summarize old messages
    return await self._compact_messages(state)
```

### The Trade-off

Same as human beings can't remember exactly what happened a year ago, the model loses nuance after compaction. You're balancing memory against token cost.

The [example repo](https://github.com/czl9707/build-your-own-openclaw) implements `/context` to monitor usage and `/compact` to manually trigger when needed.

Context management is the difference between a demo and a product.

## Next Steps

[Previous: Gear up Your Agent](blog/by/developer/build_your_own_openclaw_2.md) | [Next: Beyond the CLI](blog/by/developer/build_your_own_openclaw_4.md)

**[⭐ Star the repo](https://github.com/czl9707/build-your-own-openclaw)** if you found this series helpful!
