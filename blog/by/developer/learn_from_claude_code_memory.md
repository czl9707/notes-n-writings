---
title: "Learn From Claude Code: Memory"
description: Learning Claude Code's memory system by inspecting its leaked source code.
cover: media/covers/learn-from-claude-code-cover.svg
tags: [agent, ai]
featured: true
created-date: 2026-04-02T00:00:00-04:00
last-updated-date: 2026-04-03T14:23:33-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and the inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: how it handles memory.

Other posts in this series: [App State](blog/by/developer/learn_from_claude_code_app_state_machine.md), [Query Engine](blog/by/developer/learn_from_claude_code_query_engine.md), [Tool System](blog/by/developer/learn_from_claude_code_tool_system.md), [Permission System](blog/by/developer/learn_from_claude_code_permission_system.md), [Context Compaction](blog/by/developer/learn_from_claude_code_context_compaction.md), [MCP Integration](blog/by/developer/learn_from_claude_code_mcp_integration.md), [Multi-Agent](blog/by/developer/learn_from_claude_code_multi_agent.md), [Agent Spawning](blog/by/developer/learn_from_claude_code_agent_spawning.md).

## The Problem

Every agent hits this wall. Every time starting a new session, you need to re-explain preferences, re-discover conventions, re-learn the codebase. Claude Code solves this with a **persistent memory system** that survives across sessions.

## File Structure

```
~/.claude/projects/{sanitized-git-root}/memory/
├── MEMORY.md                 # Index file (entrypoint)
├── user-preferences.md       # User-specific preferences
├── testing-policy.md         # Project-wide testing conventions
├── architecture-decisions.md # ADRs and design choices
└── external-resources.md     # Links to external systems
```

`MEMORY.md` is served as index file, while other individual files are real content.

```markdown
# Memory Index

- [User Preferences](user-preferences.md) — User's role and expertise
- [Testing Policy](testing-policy.md) — Integration testing requirements
- [Architecture Decisions](architecture-decisions.md) — Key design choices
- [External Resources](external-resources.md) — Links to Linear, Grafana, etc.
```

**MEMORY.md is always loaded** into the system prompt (up to 200 lines), **Individual memory files** are loaded on-demand based on relevance.

## What to Save

The extraction prompt defines four memory types with specific structure, scope, and examples. The relevant prompt explicit described each type of them and the expected markdown format for each section.

> TLDR: The prompt explicitly defines four types of memory, user, feedback, project, reference. And each memory should have a scope specified.

```typescript
export const TYPES_SECTION_COMBINED: readonly string[] = [
  '## Types of memory',
  '',
  'There are several discrete types of memory that you can store in your memory system. Each type below declares a <scope> of `private`, `team`, or guidance for choosing between the two.',
  '',
  '<types>',
  '<type>',
  '    <name>user</name>',
  '    <scope>always private</scope>',
  "    <description>Contain information about the user's role, goals, responsibilities, and knowledge. Great user memories help you tailor your future behavior to the user's preferences and perspective. Your goal in reading and writing these memories is to build up an understanding of who the user is and how you can be most helpful to them specifically.</description>",
  "    <when_to_save>When you learn any details about the user's role, preferences, responsibilities, or knowledge</when_to_save>",
  '    <examples>',
  "    user: I'm a data scientist investigating what logging we have in place",
  '    assistant: [saves private user memory: user is a data scientist, currently focused on observability/logging]',
  '    </examples>',
  '</type>',
  '<type>',
  '    <name>feedback</name>',
  '    <scope>default to private. Save as team only when the guidance is clearly a project-wide convention.</scope>',
  "    <description>Guidance the user has given you about how to approach work — both what to avoid and what to keep doing. Record from failure AND success: if you only save corrections, you will avoid past mistakes but drift away from approaches the user has already validated.</description>",
  '    <when_to_save>Any time the user corrects your approach OR confirms a non-obvious approach worked.</when_to_save>',
  '    <body_structure>Lead with the rule itself, then a **Why:** line and a **How to apply:** line.</body_structure>',
  '    <examples>',
  "    user: don't mock the database in these tests — we got burned last quarter",
  '    assistant: [saves team feedback memory: integration tests must hit real database. Reason: prior incident where mock/prod divergence masked a broken migration]',
  '    </examples>',
  '</type>',
  '<type>',
  '    <name>project</name>',
  '    <scope>strongly bias toward team</scope>',
  '    <description>Information about ongoing work, goals, initiatives, bugs, or incidents that is not derivable from code or git history.</description>',
  '    <when_to_save>When you learn who is doing what, why, or by when.</when_to_save>',
  '    <body_structure>Lead with the fact, then **Why:** and **How to apply:** lines.</body_structure>',
  '    <examples>',
  "    user: we're freezing all non-critical merges after Thursday for mobile release",
  '    assistant: [saves team project memory: merge freeze begins 2026-03-05 for mobile release cut]',
  '    </examples>',
  '</type>',
  '<type>',
  '    <name>reference</name>',
  '    <scope>usually team</scope>',
  '    <description>Pointers to where information can be found in external systems.</description>',
  '    <when_to_save>When you learn about resources in external systems and their purpose.</when_to_save>',
  '    <examples>',
  '    user: check the Linear project "INGEST" for pipeline bugs',
  '    assistant: [saves team reference memory: pipeline bugs are tracked in Linear project "INGEST"]',
  '    </examples>',
  '</type>',
  '</types>',
]
```

```typescript
export const MEMORY_FRONTMATTER_EXAMPLE: readonly string[] = [
  '```markdown',
  '---',
  'name: {{memory name}}',
  'description: {{one-line description — used to decide relevance}}',
  'type: {{user, feedback, project, reference}}',
  '---',
  '',
  '{{memory content — for feedback/project: rule/fact, then **Why:** and **How to apply:**}}',
  '```',
]
```

### What NOT to Save

Surprisingly, apart from what to save, it also has a section of what **NOT** to save.

```typescript
export const WHAT_NOT_TO_SAVE_SECTION: readonly string[] = [
  '## What NOT to save in memory',
  '',
  '- Code patterns, conventions, architecture, file paths, or project structure — these can be derived by reading the current project state.',
  '- Git history, recent changes, or who-changed-what — `git log` / `git blame` are authoritative.',
  '- Debugging solutions or fix recipes — the fix is in the code; the commit message has the context.',
  '- Anything already documented in CLAUDE.md files.',
  '- Ephemeral task details: in-progress work, temporary state, current conversation context.',
  '',
  'These exclusions apply even when the user explicitly asks you to save. If they ask you to save a PR list or activity summary, ask what was *surprising* or *non-obvious* about it — that is the part worth keeping.',
]
```

Memory is for non-derivable, high-value context that would otherwise be lost.

## Memory Operations

The memory system has two key operations: **extraction**, and **recall**.

### Extraction

Claude Code automatically extracts memories using a [forked agent pattern](blog/by/developer/learn_from_claude_code_agent_spawning.md). It is invoked at the end of the [query loop](blog/by/developer/learn_from_claude_code_query_engine.md).

```typescript
async function runExtraction({ context }) {
  // 1. Check if main agent already wrote memories
  if (hasMemoryWritesSince(messages, lastMemoryMessageUuid)) {
    return // Skip - main agent handled it
  }

  // 2. Throttle: only run every N turns
  turnsSinceLastExtraction++
  if (turnsSinceLastExtraction < threshold) return
  turnsSinceLastExtraction = 0

  // 3. Scan existing memories
  const existingMemories = formatMemoryManifest(
    await scanMemoryFiles(memoryDir)
  )

  // 4. Build extraction prompt
  const userPrompt = buildExtractCombinedPrompt(
    newMessageCount,
    existingMemories,
    skipIndex
  )

  // 5. Run forked agent with restricted tools
  const result = await runForkedAgent({
    promptMessages: [createUserMessage({ content: userPrompt })],
    cacheSafeParams,
    canUseTool: createAutoMemCanUseTool(memoryDir),
    maxTurns: 5
  })

  // 6. Update cursor and notify
  lastMemoryMessageUuid = messages.at(-1)?.uuid
  const memoryPaths = extractWrittenPaths(result.messages)
    .filter(p => basename(p) !== 'MEMORY.md')

  if (memoryPaths.length > 0) {
    appendSystemMessage(createMemorySavedMessage(memoryPaths))
  }
}
```

Few special cases here, **Mutual Exclusion** with main agent, **Throttling**, **Tool Restrictions** on the memory extraction.

There are several interesting details in the prompt.

#### MEMORY.md 200-Line Truncation

```typescript
'- `MEMORY.md` is always loaded into your system prompt — lines after 200 will be truncated, so keep the index concise'
```

#### Strict 5 Turn Budget

``` javascript
`You have a limited turn budget. ${FILE_EDIT_TOOL_NAME} requires a prior ${FILE_READ_TOOL_NAME} of the same file, so the efficient strategy is: turn 1 — issue all ${FILE_READ_TOOL_NAME} calls in parallel for every file you might update; turn 2 — issue all ${FILE_WRITE_TOOL_NAME}/${FILE_EDIT_TOOL_NAME} calls in parallel. Do not interleave reads and writes across multiple turns.`,
```

#### No Verification Loop

``` javascript
`You MUST only use content from the last ~${newMessageCount} messages to update your persistent memories. Do not waste any turns attempting to investigate or verify that content further — no grepping source files, no reading code to confirm a pattern exists, no git commands.`
```

### Recall

When processing a query, Claude Code doesn't load ALL memories, it uses **intelligent selection**. The prefetch is started **once per user turn** (per `queryLoop()` invocation), before the main `while(true)` loop — so even if a turn has multiple API calls for tool use chains, memory selection only runs once.

> TLDR: The prompt ask for list of file names to generate a entry list. And only select memories that will clearly be useful for processing the query.

```typescript
async function selectRelevantMemories(
  query: string,
  memories: MemoryHeader[],
  recentTools: string[]
): Promise<string[]> {
  const manifest = formatMemoryManifest(memories)

  // Exclude reference docs for tools already being used
  const toolsSection = recentTools.length > 0
    ? `\n\nRecently used tools: ${recentTools.join(', ')}`
    : ''

  const result = await sideQuery({
    model: getDefaultSonnetModel(),
    system: SELECT_MEMORIES_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Query: ${query}\n\nAvailable memories:\n${manifest}${toolsSection}`
    }],
    output_format: { /* JSON schema */ }
  })

  const textBlock = result.content.find(block => block.type === 'text')
  const parsed: { selected_memories: string[] } = jsonParse(textBlock.text)
  return parsed.selected_memories // Up to 5 filenames
}
```

```typescript
const SELECT_MEMORIES_SYSTEM_PROMPT = `You are selecting memories that will be useful to Claude Code as it processes a user's query. You will be given the user's query and a list of available memory files with their filenames and descriptions.

Return a list of filenames for the memories that will clearly be useful to Claude Code as it processes the user's query (up to 5). Only include memories that you are certain will be helpful based on their name and description.
- If you are unsure if a memory will be useful in processing the user's query, then do not include it in your list. Be selective and discerning.
- If there are no memories in the list that would clearly be useful, feel free to return an empty list.
- If a list of recently-used tools is provided, do not select memories that are usage reference or API documentation for those tools (Claude Code is already exercising them). DO still select memories containing warnings, gotchas, or known issues about those tools — active use is exactly when those matter.
`
```

At the end this produce a concise listing like:

```
- [feedback] testing-policy.md (2026-04-01T10:30:00Z): Integration tests must hit real database
- [user] user-preferences.md (2026-03-28T14:20:00Z): User is a data scientist focused on logging
- [project] merge-freeze.md (2026-03-25T09:15:00Z): Merge freeze begins 2026-03-05
```

The selection agent sees this manifest (not full memory content) and picks up to 5 relevant files, and injects them into the system prompt.

#### Memory Drift Caveat

Claude Code acknowledges that memories can become stale.

> TLDR: Verification Over Memory

```typescript
export const MEMORY_DRIFT_CAVEAT =
  'Memory records can become stale over time. Use memory as context for what was true at a given point in time. Before answering the user or building assumptions based solely on information in memory records, verify that the memory is still correct and up-to-date by reading the current state of the files or resources. If a recalled memory conflicts with current information, trust what you observe now — and update or remove the stale memory rather than acting on it.'
```

Before recommending from memory.

```markdown
## Before recommending from memory

A memory that names a specific function, file, or flag is a claim that it existed *when the memory was written*. It may have been renamed, removed, or never merged. Before recommending it:

- If the memory names a file path: check the file exists.
- If the memory names a function or flag: grep for it.
- If the user is about to act on your recommendation (not just asking about history), verify first.

"The memory says X exists" is not the same as "X exists now."
```

## Brief

Memory is one of those things that every [agent architecture](blog/by/developer/understand_openclaw_by_building_one_2.md) needs to figure out — OpenClaw took a different approach to [long-term knowledge](blog/by/developer/understand_openclaw_by_building_one_2.md#Memory%3A%20Long-Term%20Knowledge), but the problem is universal.

The code is not that complicated, and so is the file structure. But the harness comes with **prompts** that are impressive. Key takeaways:

- **Simple file structure** — One `MEMORY.md` index (200-line max) + individual memory files with frontmatter
- **Explicit memory types** — Four types (user, feedback, project, reference) with clear scope and structure
- **Limited extraction effort** — 5-turn budget, no verification loop, mutual exclusion with main agent
- **Smart recall** — Selection agent picks up to 5 relevant files based on query, not all memories loaded
- **Memory drift prevention** — Explicit caveat to verify before acting; current observations over recalled facts