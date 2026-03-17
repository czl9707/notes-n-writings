---
title: "1. Every Agent Starts as a Loop"
description: "Understand OpenClaw by Building One - Part 1"
cover: media/build-your-own-openclaw/01-tools.svg
tags: [agent, ai]
featured: false
created-date: 2026-03-15T23:08:44-04:00
last-updated-date: 2026-03-16T20:05:06-04:00
---

- [1. Every Agent Starts as a Loop](blog/by/developer/build_your_own_openclaw_1.md)
- [2. Gear up Your Agent](blog/by/developer/build_your_own_openclaw_2.md)
- [3. Pack the Conversation And Carry On](blog/by/developer/build_your_own_openclaw_3.md)
- [4. Beyond the CLI](blog/by/developer/build_your_own_openclaw_4.md)
- [5. Many of Them](blog/by/developer/build_your_own_openclaw_5.md)
- [6. Agents are Running, Your are Sleeping](blog/by/developer/build_your_own_openclaw_6.md)
- [7. More Context! More Context!](blog/by/developer/build_your_own_openclaw_7.md)

All code snippets and working code bases are available at [this repo](https://github.com/czl9707/build-your-own-openclaw).

## Every Agent Starts as a Loop

Strip away the buzzwords, and an agent is just a chat loop that sometimes executes code. The core is maybe 20 lines:

```python
while True:
    user_input = await get_user_input()
    response = await session.chat(user_input)
    display(response)
```

That's it. No magic. The `session.chat()` method sends messages to the LLM and returns the response. You already know this pattern.

## Tools Transform Talk into Action

What makes an "agent" different from a "chatbot" is tools calls. The LLM decides when to use them. Your job is to define what tools exist and how to run them.

The pattern is simple, define a tool schema, let the LLM decide when to call it, execute it, feed the result back.

```python
class BaseTool(ABC):
    name: str
    description: str
    parameters: dict[str, Any]
  
    @abstractmethod
    async def execute(self, session, **kwargs) -> str:
        pass
```

- `description` tell the LLM what the tool does.
- `parameters` schema tells the what arguments to provide.
- `execute` method is your implementation.

## The Tool Calling Loop

When the LLM wants to use a tool, it returns a `tool_calls` list instead of text and emit `stop_reaonson` as `tool_use` at the same time. Your agent executes each tool, adds the results to the message history, and calls the LLM again. This continues until the LLM responds with text.

```python
while True:
    messages = self.state.build_messages()
    content, tool_calls = await self.llm.chat(messages, tool_schemas)
    if not tool_calls:
        break
  
    await self._handle_tool_calls(tool_calls)
```

## Start Minimal

You don't need dozens of tools. **Read**, **Write**, and **Bash** are enough to start. These let your agent ability to write and execute code, everything else builds on this foundation.

![The chat loop and tools](media/build-your-own-openclaw/01-tools.svg)

## Next Steps

Start from the beginning | [Next: Gear up Your Agent](blog/by/developer/build_your_own_openclaw_2.md)

**[⭐ Star the repo](https://github.com/czl9707/build-your-own-openclaw)** if you found this series helpful!
