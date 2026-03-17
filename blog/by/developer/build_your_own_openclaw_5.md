---
title: "5. Many of Them"
description: "Understand OpenClaw by Building One - Part 5"
cover: media/build-your-own-openclaw/11-multi-agent-routing.svg
tags: [agent, ai]
featured: false
created-date: 2026-03-15T23:08:44-04:00
last-updated-date: 2026-03-16T21:07:14-04:00
---

- [1. Every Agent Starts as a Loop](blog/by/developer/build_your_own_openclaw_1.md)
- [2. Gear up Your Agent](blog/by/developer/build_your_own_openclaw_2.md)
- [3. Pack the Conversation And Carry On](blog/by/developer/build_your_own_openclaw_3.md)
- [4. Beyond the CLI](blog/by/developer/build_your_own_openclaw_4.md)
- [5. Many of Them](blog/by/developer/build_your_own_openclaw_5.md)
- [6. Agents are Running, Your are Sleeping](blog/by/developer/build_your_own_openclaw_6.md)
- [7. More Context! More Context!](blog/by/developer/build_your_own_openclaw_7.md)

All code snippets and working code bases are available at [this repo](https://github.com/czl9707/build-your-own-openclaw).

## Many of Them

One agent can't be an expert at everything. Neither should it try.

You've built a capable agent. It can read files, search the web, run commands. But ask it to do everything and it struggles. Some tasks need specialized knowledge. Some tasks need focused context. The solution isn't a bigger agent - it's multiple smaller ones.

### Agent Discovery

Agents are defined in `AGENT.md` files. A loader discovers them at startup:

```python
class AgentLoader:
    def discover_agents(self) -> list[AgentDef]:
        """Scan agents directory and return list of valid AgentDef."""
        return discover_definitions(
            self.config.agents_path, "AGENT.md", self._parse_agent_def
        )
```

## Routing: Match Tasks to Agents

Right task to right agent? We need a routing policy to handle this.

- **Tiered Routing Rules**: Find rules matching inbound source, starting from most specific rules.
- **Default Fallback**: Fall back to global default agent if no rules match.

```python
@dataclass
class Binding:
    agent: str
    value: str
    tier: int
    pattern: Pattern  # Compiled regex

    def _compute_tier(self) -> int:
        """Compute specificity tier."""
        if not any(c in self.value for c in r".*+?[]()|^$"):
            return 0  # Exact match
        if ".*" in self.value:
            return 2  # Wildcard
        return 1  # Specific regex

@dataclass
class RoutingTable:
    def resolve(self, source: str) -> str:
        for binding in self._load_bindings():
            if binding.pattern.match(source):
                return binding.agent
        return self.context.config.default_agent
```

![Multi-agent routing](media/build-your-own-openclaw/11-multi-agent-routing.svg)

### Integration in Channel Worker

When a message arrives, the channel worker uses the routing table to find the right agent:

```python
async def callback(message: str, source: EventSource) -> None:
    # Use routing_table to resolve agent from bindings
    session_id = self.context.routing_table.get_or_create_session_id(source)

    # Publish event
    event = InboundEvent(session_id=session_id, source=source, content=message)
    await self.context.eventbus.publish(event)
```

## Agents Want to Call Their Friends

Let's have another tool to delegate tasks to other agents. The way it is implemented here:

- Load subagent definition
- Create session
- Publish dispatch event
- Wait for result.

```python
@tool(name="subagent_dispatch", description="Dispatch a task to a specialized subagent.")
async def subagent_dispatch(agent_id: str, task: str, session) -> str:
    agent_def = shared_context.agent_loader.load(agent_id)
    agent = Agent(agent_def, shared_context)
    agent_session = agent.new_session(agent_source)

    # Publish dispatch event
    await shared_context.eventbus.publish(DispatchEvent(...))

    # Wait for result
    response = await result_future
    return json.dumps({"result": response, "session_id": session_id})
```

![Agent dispatch](media/build-your-own-openclaw/15-agent-dispatch.svg)

The main agent calls `subagent_dispatch`, which creates a new session for the subagent and waits for its response. The eventbus handles the communication.

### Alternative Multi-Agent Patterns

Direct subagent dispatching is just one approach to multi-agent orchestration. Here are some other common patterns:

- **Shared Task Lists**: Agents coordinate by reading from and writing to a shared task queue or database. Each agent picks up tasks as they become available, agent never talk to agent directly.
- **Tmux/Screen Sessions**: `tmux` allow us running multiple processes. A `tmux` skill can be provided to agent to guide it execute multiple tasks, achieving multi-agent to some extent.

## Next Steps

[Previous: Beyond the CLI](blog/by/developer/build_your_own_openclaw_4.md) | [Next: Agents are Running, Your are Sleeping](blog/by/developer/build_your_own_openclaw_6.md)

**[⭐ Star the repo](https://github.com/czl9707/build-your-own-openclaw)** if you found this series helpful!
