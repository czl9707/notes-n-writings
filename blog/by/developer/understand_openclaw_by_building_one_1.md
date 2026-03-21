---
title: "Build a Capable AI Agent from Scratch"
description: "A comprehensive guide to building an AI agent with tools, skills, and memory - everything you need before going to production"
cover: media/build-your-own-openclaw/01-tools.svg
tags: [agent, ai, tutorial]
featured: false
created-date: 2026-03-15T23:08:44-04:00
last-updated-date: 2026-03-20T16:20:19-04:00
---

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

![Chat loop](media/build-your-own-openclaw/00-chat-loop.svg)

But a chatbot isn't an agent. What makes the difference?

## Tools Transform Talk into Action

The LLM decides when to use them. Your job is to define what tools exist and how to run them.

The pattern is simple: define a tool schema, let the LLM decide when to call it, execute it, feed the result back.

![Tools](media/build-your-own-openclaw/01-tools.svg)

```python
class BaseTool(ABC):
    name: str
    description: str
    parameters: dict[str, Any]

    @abstractmethod
    async def execute(self, session, **kwargs) -> str:
        pass
```

- `description` tells the LLM what the tool does
- `parameters` schema tells the what arguments to provide
- `execute` method is your implementation

### The Tool Calling Loop

When the LLM wants to use a tool, it returns a `tool_calls` list instead of text and emits `stop_reason` as `tool_use`. Your agent executes each tool, adds the results to the message history, and calls the LLM again. This continues until the LLM responds with text.

```python
while True:
    messages = self.state.build_messages()
    content, tool_calls = await self.llm.chat(messages, tool_schemas)
    if not tool_calls:
        break

    await self._handle_tool_calls(tool_calls)
```

### Start Minimal

You don't need dozens of tools. **Read**, **Write**, and **Bash** are enough to start. These give your agent the ability to write and execute code—everything else builds on this foundation.

## Beyond Tools: Dynamic Capabilities

Tools are part of agents' code assets. But every time you want it to do something new, you have to write code, restart the server, and redeploy.

How do you extend its capability and knowledge base without changing its code?

### Skills - Dynamic Capabilities Loading

Skills are lazy-loaded capabilities at runtime. It isn't something OpenClaw invented, but an open standard. Reference the [official document](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) for more info.

![Skills](media/build-your-own-openclaw/02-skills.svg)

The pattern is simple: a `SKILL.md` file with YAML frontmatter for metadata loaded up front and markdown for instructions loaded when needed.

```python
def create_skill_tool(skill_loader):
    # Discover skills and get metadata
    skill_metadata = skill_loader.discover_skills()

    # Build XML description of available skills
    skills_xml = "<skills>\n"
    for meta in skill_metadata:
        skills_xml += f'  <skill name="{meta.name}">{meta.description}</skill>\n'
    skills_xml += "</skills>"

    # Tool loads full content only when called
    @tool(name="skill", description=f"Load skill. {skills_xml}", ...)
    async def skill_tool(skill_name: str, session) -> str:
        return skill_loader.load_skill(skill_name).content
```

### Two Approaches to Skills

OpenClaw doesn't implement skills with a separate tool. Instead, it uses **system prompt injection with file reading**:

- **Tool Approach:** Dedicated `skill` tool lists available skills and loads content. The tool schema includes skill metadata in its description. Self-contained skill discovery and loading.
- **System Prompt Approach:** Skill metadata (id, name, description) injected into system prompt. Agent uses standard `read` tool to read SKILL.md. No specialized skill tool needed, simpler tool registry.

## Slash Commands: User Control

Sometimes you want direct control, not a conversation. Slash commands let you manage the session itself: list skills, show session info, clear history. The implementation is straightforward.

```python
class Command(ABC):
    name: str
    aliases: list[str] = []

    @abstractmethod
    async def execute(self, args: str, session) -> str:
        pass

class CommandRegistry:
    async def dispatch(self, input: str, session) -> str | None:
        """Parse and execute a slash command. Returns None if not a command."""
        if not input.startswith("/"):
            return None
        # Parse: /command args
        parts = input[1:].split(None, 1)
        cmd_name, args = parts[0], parts[1] if len(parts) > 1 else ""
        if cmd_name in self._commands:
            return await self._commands[cmd_name].execute(args, session)
        return None
```

Integration in the main loop—check commands before sending to LLM:

```python
async def run(self) -> None:
    while True:
        user_input = await get_input()
        # Check for slash commands first
        cmd_response = await self.command_registry.dispatch(user_input, self.session)
        if cmd_response is not None:
            self.console.print(cmd_response)
            continue

        # Normal chat
        response = await self.session.chat(user_input)
        self.display_agent_response(response)
```

![Slash Commands](media/build-your-own-openclaw/04-slash-commands.svg)

Slash commands may or may not be added to the session history (message log sent to the LLM). This is a design decision—commands are user controls, not conversation content. Either approach is valid depending on your use case.

## Web Tools: Connect to the World

Your agent lives in a terminal. But the information it needs lives on the web.

![Web tools](media/build-your-own-openclaw/06-web-tools.svg)

Two tools bridge this gap:

- **websearch**: Search the web and get structured results
- **webread**: Fetch and extract content from URLs

```python
@tool(...)
async def websearch(query: str, session) -> str:
    results = await provider.search(query)
    output = []
    for i, r in enumerate(results, 1):
        output.append(f"{i}. **{r.title}**\n   {r.url}\n   {r.snippet}")
    return "\n\n".join(output)
```

Now your agent can research, fact-check, and pull in live data.

## Save the Conversation

You and your agent had a great conversation. And you kill the shell. Too bad it doesn't remember any of it.

The solution is simple: just save session metadata and messages to disk. It can end up something like this:

```
.history/
├── index.jsonl              # Session metadata
└── sessions/
    └── {session_id}.jsonl   # Messages (one file per session)
```

And corresponding methods to operate on it:

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

LLMs have limits. Even with 200k (just became 1M at the moment I am writing this piece) token context windows, you'll hit them. All conversation messages, tool call request response—they all add up. LLM will refuse to handle them eventually.

The solution is compaction: summarize old messages, keep the signal, drop the noise.

### Compaction: Pack and Carry On

To be defensive, we apply two layers of protection:

- **Summarize** — Ask LLM to condense old messages into a summary (expensive, preserves gist).
- **Truncate** — Cut down oversized tool outputs first (cheap, no LLM call). This solves the edge case where the last tool call returns a huge result that bloats up the context directly, leaving the entire context in a dead state.

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

![Compaction](media/build-your-own-openclaw/05-compaction.svg)

### The Trade-off

Same as human beings can't remember exactly what happened a year ago, the model loses nuance after compaction. You're balancing memory against token cost.

The [example repo](https://github.com/czl9707/build-your-own-openclaw) implements `/context` to monitor usage and `/compact` to manually trigger when needed.

Context management is the difference between a demo and a product.

## Agents That Grow

Skills solve the problem of extending agents' capability. Web tools lift the restriction of agents' limited knowledge base.

If you try [this](https://github.com/czl9707/build-your-own-openclaw) out, you will find the agent is already way more capable than your expectation.

But what happens when you want to talk to it from Telegram? Or your phone? Or another program? Or even run multiple agents at once?

**Continue to [Part 2: Scale Your Agent](blog/by/developer/understand_openclaw_by_building_one_2.md)** to learn how to build production-ready infrastructure.

**[⭐ Star the repo](https://github.com/czl9707/build-your-own-openclaw)** if you found this guide helpful!
