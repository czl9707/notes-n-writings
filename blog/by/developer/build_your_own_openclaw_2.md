---
title: "2. Gear up Your Agent"
description: "Understand OpenClaw by Building One - Part 2"
cover: media/build-your-own-openclaw/02-skills.svg
tags: [agent, ai]
featured: false
created-date: 2026-03-15T23:08:44-04:00
last-updated-date: 2026-03-16T22:29:51-04:00
---

- [1. Every Agent Starts as a Loop](blog/by/developer/build_your_own_openclaw_1.md)
- [2. Gear up Your Agent](blog/by/developer/build_your_own_openclaw_2.md)
- [3. Pack the Conversation And Carry On](blog/by/developer/build_your_own_openclaw_3.md)
- [4. Beyond the CLI](blog/by/developer/build_your_own_openclaw_4.md)
- [5. Many of Them](blog/by/developer/build_your_own_openclaw_5.md)
- [6. Agents are Running, Your are Sleeping](blog/by/developer/build_your_own_openclaw_6.md)
- [7. More Context! More Context!](blog/by/developer/build_your_own_openclaw_7.md)

All code snippets and working code bases are available at [this repo](https://github.com/czl9707/build-your-own-openclaw).

## Beyond Tools

Tools are part of agents' code asset. But every time you want it to do something new, you have to write code, restart the server, and redeploy.

How to extend its capability & knowledge base without changing its code?

## Skills - Dynamic Capabilities Loading

Skills are lazy loaded capabilities at runtime. It isn't something Openclaw invented, but an open standard. Reference the [official document](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) for more info.

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

Openclaw doesn't implement skills with a separate tool. Instead, it uses **system prompt injection with file reading**:

- **Tool Approach:** Dedicated `skill` tool lists available skills and loads content. The tool schema includes skill metadata in its description. Self-contained skill discovery and loading.
- **System Prompt Approach:** Skill metadata (id, name, description) injected into system prompt. Agent uses standard `read` tool to read SKILL.md. No specialized skill tool needed, simpler tool registry.

## Slash Commands: User Control

Sometimes you want direct control, not a conversation. Slash commands let you manage the session itself: list skills, show session info, clear history. The implementation is fairly simple.

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

Integration in the main loop — check commands before sending to LLM:

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

![Skills](media/build-your-own-openclaw/04-slash-commands.svg)

### Slash Commands and Session History

Slash commands may or may not be added to the session history (message log sent to the LLM). This is a design decision — commands are user controls, not conversation content. Either approach is valid depending on your use case.

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

## Agents That Grow

Skill solves the problem of extending agents' capability. Web tools lift the restriction of agents limited knowledge base.

If you try [this](https://github.com/czl9707/build-your-own-openclaw) out, you will find the agent is already way more capable then your expectation.

## Next Steps

[Previous: Every Agent Starts as a Loop](blog/by/developer/build_your_own_openclaw_1.md) | [Next: Pack the Conversation And Carry On](blog/by/developer/build_your_own_openclaw_3.md)

**[⭐ Star the repo](https://github.com/czl9707/build-your-own-openclaw)** if you found this series helpful!
