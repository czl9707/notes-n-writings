---
title: "Learn From Claude Code: Context Compaction"
description: Learning Claude Code's context compaction harness by inspecting its leaked source code.
cover: media/covers/learn-from-claude-code-cover.svg
tags:
  - agent
  - ai
featured: true
created-date: 2026-04-01T19:21:36-04:00
last-updated-date: 2026-04-01T21:22:47-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and the inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: how it handles context compaction.

## The Problem

Every agent hits this wall. Conversation grows, tool outputs pile up, and suddenly you're brushing against the token limit. A [tiered compaction architecture](blog/by/developer/understand_openclaw_by_building_one_1.md) is well-known already. Claude Code does the same thing, but with some nice refinements.

## The Three-Tier Hierarchy

```
User runs /compact
    ↓
[Tier 1] Session Memory
    ↓ (if unavailable)
[Tier 2] Microcompact
    ↓ (always runs before Tier 3)
[Tier 3] Traditional Compaction
	↓ (always runs after Tier 3)
Re-assemble key context
```

Each tier escalates when the previous one can't handle it. Cheapest first, most expensive last.

## Tier 1: Session Memory Compaction

The fastest option. Claude Code maintains a session memory file throughout the conversation - a structured markdown document tracking what happened. When you run `/compact`, it reads this file, finds what's already been summarized, preserves recent messages, and truncates oversized sections.

- Each section limited to 2,000 tokens
- Keeps minimum 5 messages with text (10K-40K tokens)

## Tier 2: Microcompact

A cleanup pass that always runs before traditional compaction. No summarization, just removes noise to reduce token count before the expensive API call:

1. Replace old tool results with `[Old tool result content cleared]`
2. Strip base64 images from old messages
3. Truncate oversized file attachments

## Tier 3: Traditional Compaction

The original approach. Uses an LLM to generate a structured summary, then rebuilds the conversation with key context restored.

### The Prompt

The compaction prompt in my minimal agent was simply 😅:

```
Summarize the conversation so far. Keep it factual and concise.
Focus on key decisions, facts, and user preferences discovered.
```

Claude Code's is... a bit more thorough:

> **TLDR**: The prompt is a very strong guardrail to guide the model to summarize the context from 9 aspect: Current State, Goals & Intent, Recent Changes, Key Decisions, Active Work, Key Files, Learnings, Important Context, and Optional Next Steps.

```
Your task is to create a detailed summary of the conversation so far, paying close attention to the user's explicit requests and your previous actions.

This summary should be thorough in capturing technical details, code patterns, and architectural decisions that would be essential for continuing development work without losing context.

${DETAILED_ANALYSIS_INSTRUCTION_BASE}

Your summary should include the following sections:

1. Primary Request and Intent: Capture all of the user's explicit requests and intents in detail

2. Key Technical Concepts: List all important technical concepts, technologies, and frameworks discussed.

3. Files and Code Sections: Enumerate specific files and code sections examined, modified, or created. Pay special attention to the most recent messages and include full code snippets where applicable and include a summary of why this file read or edit is important.

4. Errors and fixes: List all errors that you ran into, and how you fixed them. Pay special attention to specific user feedback that you received, especially if the user told you to do something differently.

5. Problem Solving: Document problems solved and any ongoing troubleshooting efforts.

6. All user messages: List ALL user messages that are not tool results. These are critical for understanding the users' feedback and changing intent.

7. Pending Tasks: Outline any pending tasks that you have explicitly been asked to work on.

8. Current Work: Describe in detail precisely what was being worked on immediately before this summary request, paying special attention to the most recent messages from both user and assistant. Include file names and code snippets where applicable.

9. Optional Next Step: List the next step that you will take that is related to the most recent work you were doing. IMPORTANT: ensure that this step is DIRECTLY in line with the user's most recent explicit requests, and the task you were working on immediately before this summary request. If your last task was concluded, then only list next steps if they are explicitly in line with the users request. Do not start on tangential requests or really old requests that were already completed without confirming with the user first.

If there is a next step, include direct quotes from the most recent conversation showing exactly what task you were working on and where you left off. This should be verbatim to ensure there's no drift in task interpretation.

Here's an example of how your output should be structured:

<example>
<analysis>
[Your thought process, ensuring all points are covered thoroughly and accurately]
</analysis>

<summary>
1. Primary Request and Intent:
   [Detailed description]

2. Key Technical Concepts:
   - [Concept 1]
   - [Concept 2]
   - [...]

3. Files and Code Sections:
   - [File Name 1]
      - [Summary of why this file is important]
      - [Summary of the changes made to this file, if any]
      - [Important Code Snippet]
   - [File Name 2]
      - [Important Code Snippet]
   - [...]

4. Errors and fixes:
    - [Detailed description of error 1]:
      - [How you fixed the error]
      - [User feedback on the error if any]
    - [...]

5. Problem Solving:
   [Description of solved problems and ongoing troubleshooting]

6. All user messages:
    - [Detailed non tool use user message]
    - [...]

7. Pending Tasks:
   - [Task 1]
   - [Task 2]
   - [...]

8. Current Work:
   [Precise description of current work]

9. Optional Next Step:
   [Optional Next step to take]

</summary>
</example>

Please provide your summary based on the conversation so far, following this structure and ensuring precision and thoroughness in your response.

There may be additional summarization instructions provided in the included context. If so, remember to follow these instructions when creating your summary. Examples of instructions include:

<example>
## Compact Instructions

When summarizing the conversation focus on typescript code changes and also remember the mistakes you made and how you fixed them.
</example>

<example>
# Summary instructions

When using compact - please focus on test output and code changes. Include file reads verbatim.
</example>
```

The structure is deliberate - each section has a purpose, and the example format ensures consistency across compactions.

### Context Restoration

After generating the summary, Claude Code rebuilds the conversation with:

- **Compact boundary marker** (metadata for the UI)
- **The summary itself** (~10K tokens)
- **Restored files** (up to 5 files, 5K tokens each)
- **Restored skills** (up to 25K tokens total)
- **Restored memory files** (CLAUDE.md, MEMORY.md, active plans)
- **Hook results** (custom context restoration scripts)
- **Recent messages** (~20 messages kept intact)

## Caveats

Some details that make this actually work in practice.

### No Tools During Compaction

The API request explicitly disables tool use:

```python
request = {
    model: 'claude-3-haiku-20240307',
    tools: [],  # Empty array = no tools allowed
    messages: [{ role: 'user', content: compactPrompt }]
}
```

Without this, the model might try to "help" by calling Read for more context or Bash to verify something. Compaction must be pure summarization - no side effects, no state changes.

### Keep Tool Pairs Intact

Never split a `tool_use` from its corresponding `tool_result`. Meaning starting and ending point of compaction would never split a tool call request and result. Breaking this pair leaves the conversation in an inconsistent state.

## Brief

Context compaction in Claude Code isn't rocket science. What makes it work is the guardrails and attention to details and edge cases. Instead of sending prompts to LLM, closing eyes and praying, guardrails give more predictable results.
