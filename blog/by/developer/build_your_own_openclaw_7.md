---
title: 7. More Context! More Context!
description: Understand OpenClaw by Building One - Part 7
cover: media/build-your-own-openclaw/13-multi-layer-prompts.svg
tags: [agent, ai]
featured: false
created-date: 2026-03-15T23:08:44-04:00
last-updated-date: 2026-03-16T21:23:37-04:00
---

- [1. Every Agent Starts as a Loop](blog/by/developer/build_your_own_openclaw_1.md)
- [2. Gear up Your Agent](blog/by/developer/build_your_own_openclaw_2.md)
- [3. Pack the Conversation And Carry On](blog/by/developer/build_your_own_openclaw_3.md)
- [4. Beyond the CLI](blog/by/developer/build_your_own_openclaw_4.md)
- [5. Many of Them](blog/by/developer/build_your_own_openclaw_5.md)
- [6. Agents are Running, Your are Sleeping](blog/by/developer/build_your_own_openclaw_6.md)
- [7. More Context! More Context!](blog/by/developer/build_your_own_openclaw_7.md)

All code snippets and working code bases are available at [this repo](https://github.com/czl9707/build-your-own-openclaw).

## Multi-Layer Prompts: Context Stacking

Getting the system prompt right is actually an non-trivial job. And a lot of pieces are not static.

They're assembled from multiple layers, each adding context from different aspects.

- **Identity** — Rarely changes (agent's core purpose)
- **Personality** — Optional flavor, mostly static
- **Bootstrap** — Workspace guide, changes when you switch projects
- **Runtime** — Timestamp, session ID — every request
- **Channel** — Where the message came from — varies per request

```python
class PromptBuilder:
    def build(self, state: "SessionState") -> str:
        layers = []

        # Layer 1: Identity
        layers.append(state.agent.agent_def.agent_md)

        # Layer 2: Soul (optional)
        if state.agent.agent_def.soul_md:
            layers.append(f"## Personality\n\n{state.agent.agent_def.soul_md}")

        # Layer 3: Bootstrap context (workspace guide)
        bootstrap = self._load_bootstrap_context()
        if bootstrap:
            layers.append(bootstrap)

        # Layer 4: Runtime context
        layers.append(self._build_runtime_context(agent_id, timestamp))

        # Layer 5: Channel hint
        layers.append(self._build_channel_hint(source))

        return "\n\n".join(layers)
```

![Multi-layer prompts](media/build-your-own-openclaw/13-multi-layer-prompts.svg)

## Memory: Long-Term Knowledge

Session context is ephemeral. Memory persists. The pattern shown here uses a specialized agent:

```
pickle: @cookie Do you know <topic> about user?
cookie: Yes, <content>.
```

A memory agent manages storage and retrieval. The main agent dispatches queries when it needs to remember something.

Memory can be structured as something like below, but this super flexible.

```
memories/
├── topics/
│   ├── preferences.md    # User preferences
│   └── identity.md       # User info
├── projects/
│   └── my-project.md     # Project-specific notes
└── daily-notes/
    └── 2024-01-15.md     # Daily journal
```

## Memory System Alternatives

The specialized agent approach keeps the main agent focused. But there are other approaches, just list a few:

- **Direct tools** - Memory tools in the main agent
- **Skill-based** - Use CLI tools like grep
- **Vector database** - Semantic search over embeddings

Each has trade-offs. File-based is simple but limited. Vector databases scale but add complexity. Choose based on your needs.

## The Open-Ended Problem

Memory is where agents get hard. Retrieval relevance, storage efficiency, context integration - these are unsolved problems at scale. This implementation is a starting point. Where you take it depends on your use case.

Memory is where agents become personalized. And where the hard problems live.

## Next Steps

[Previous: Agents are Running, Your are Sleeping](blog/by/developer/build_your_own_openclaw_6.md) | **End of series**

**[⭐ Star the repo](https://github.com/czl9707/build-your-own-openclaw)** if you found this series helpful!
