---
title: "Learn From Claude Code: MCP Integration"
description: Anthropic invented MCP a year ago. Now they're experimenting with skill-ifying it. Here's what the leaked source reveals about the pivot.
cover: media/covers/learn-from-claude-code-cover.svg
tags: [agent, ai]
featured: true
created-date: 2026-04-02T00:00:00-04:00
last-updated-date: 2026-04-05T18:50:15-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: MCP integration - and the experimental feature that signals where Anthropic is heading.

## The Problem

MCP (Model Context Protocol) was invented by Anthropic about a year ago. It solves the scalability problem of agent tools with a standard way to connect to external services.

But there's a problem baked into MCP's design: **one tool = one atomic operation**.

A filesystem server exposes 15 tools (read, write, edit, delete, list, create directory, move, copy, search, watch...). A database server exposes 20. Connect 5 servers and the model sees 80+ new tools, 25% of your context window are gone before you type a single word.

## The Pivot: MCP_SKILLS

The community noticed, projects like [mcporter](https://github.com/steipete/mcporter) and [mcp2cli](https://github.com/knowsuchagency/mcp2cli) wrap MCP tools as cli and utilize skills system to achieve the same capability.

Anthropic knows this as well. The leaked code contains an experimental feature flag: `MCP_SKILLS`. It's not enabled by default, but the implementation is complete and instructive.

### How It Works

MCP has two discoverable concepts:

- **Prompts** - parameterized text templates
- **Resources** - addressable content like `file://`, `skill://`

The experimental feature discovers skills via **resources**:

```typescript
// When connecting to MCP server
const [tools, mcpPrompts, mcpSkills, resources] = await Promise.all([
  client.listTools(),
  client.listPrompts(),
  feature('MCP_SKILLS') && supportsResources
    ? fetchMcpSkillsForClient!(client)
    : [],
  client.listResources(),
])

const commands = [...mcpPrompts, ...mcpSkills]
```

Skills are higher-level than tools:

- **Arguments** - parameterized inputs like `$file_path`
- **Steps** - multi-step workflows with success criteria
- **Context** - inline (current conversation) or forked (sub-agent)
- **Triggers** - when Claude should auto-invoke them

A skill bundles "read file → analyze → suggest changes → apply fix" into one invocable unit. The model sees one skill instead of 5 tools.

### The Security Model

MCP skills are tagged with `loadedFrom: 'mcp'`:

```typescript
// Security: MCP skills are remote and untrusted — never execute inline
// shell commands (!`...` / ```! ... ```) from their markdown body.
if (loadedFrom !== 'mcp') {
  finalContent = await executeShellCommandsInPrompt(finalContent, ...)
}
```

This marker:

- Appears in `/skills` menu alongside local skills
- Is excluded from `/mcp` prompts display
- Gets sandboxed - no shell execution, no `!command` substitution

The tradeoff is clear: **skills are superior to tools in all aspects except security**. MCP skills come from untrusted remote servers, so they can't execute arbitrary commands. Local skills can.

### Dynamic Updates

When an MCP server's resources change:

```typescript
// On resource list changed notification
if (feature('MCP_SKILLS')) {
  fetchMcpSkillsForClient!.cache.delete(client.name)
  const [newResources, mcpPrompts, mcpSkills] = await Promise.all([...])
  updateServer({
    ...client,
    resources: newResources,
    commands: [...mcpPrompts, ...mcpSkills],
  })
  // Invalidate skill-search index for re-discovery
  clearSkillIndexCache?.()
}
```

Skills hot-reload when servers update. The skill-search index rebuilds automatically.

### Integration with SkillTool

The SkillTool explicitly includes MCP skills:

```typescript
// SkillTool.ts - getAllCommands()
const mcpSkills = context
  .getAppState()
  .mcp.commands.filter(
    cmd => cmd.type === 'prompt' && cmd.loadedFrom === 'mcp',
  )
// Only MCP skills, not plain MCP prompts
```

The model invokes MCP skills the same way as local skills. No special casing.

## The Boring Part: Standard MCP Integration

The non-experimental parts are less exciting and straightforward. Just placing them here.

Two type of MCP transport.

```typescript
type StdioConfig = {
  command: string       // 'npx', 'node'
  args: string[]        // ['-y', 'mcp-server-filesystem']
}

type SSEConfig = {
  url: string
  headers?: Record<string, string>
}
```

7 scope levels with precedence.

```typescript
type ConfigScope =
  | 'enterprise'   // Highest - IT admin controls
  | 'managed'
  | 'claudeai'
  | 'project'      // .claude/mcp.json in repo
  | 'user'         // ~/.claude/mcp.json
  | 'local'
  | 'dynamic'      // Lowest - runtime-added
```

Runtime information about each MCP, failed ones degrade gracefully.

```typescript
type ConnectedMCPServer = {
  client: Client
  name: string
  type: 'connected'
}

type FailedMCPServer = {
  name: string
  type: 'failed'
  error?: string
}
```

One server fails, others keep working.

## ## Brief - MCP is Dying

The `MCP_SKILLS` feature flag tells the story. Anthropic built MCP. A year later, even the creator is moving away from MCP to skills system.

The problem isn't technical. Tools work. The problem is **context economics**:

**Tools:**

- Atomic operations (read, write, delete - one each)
- High context cost (one tool per operation)
- Composable (mix and match freely)
- Sandboxed by default (safe from untrusted sources)
- Eagerly loaded (all tools visible upfront)

**Skills:**

- Multi-step workflows (read → analyze → fix in one call)
- Low context cost (one skill per task)
- Opinionated (predefined composition)
- Requires trust (can execute commands if local)
- Lazy loaded (content fetched on invocation)

But the direction is clear: Anthropic is shifting away from MCP to skills. MCP_SKILLS is the prototype. The protocol will survive. The tool-per-endpoint model won't.
