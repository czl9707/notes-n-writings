---
title: "Beyond the Buzzwords: Context, Prompts, and Tools"
description: Stop memorizing new terminology every time a new tool launches. Understand how agents manage context, use prompts, and call tools, and everything else starts making sense.
cover: Media/Covers/BeyondBuzzWordCover.svg
tags:
  - agent
  - ai
featured: true
created-date: 2026-01-09T22:03:16-05:00
last-updated-date: 2026-02-12T19:31:13-05:00
---

Wake up in 2026, open a coding assistant, and you're jumping into a terminology soup: *Agents, Subagents, Prompts, Contexts, Memory, Modes, Permissions, Tools, Plugins, Skills, Hooks, MCP, LSP, Slash Commands, Workflows, Instructions and etc.*

Companies building these tools love creating new branding for every slight variation in interaction. Instead of getting trapped in the vocabulary treadmill, look at the architecture. Every AI coding tool, no matter how fancy the marketing, deals with the same three things: **context, tools, and prompts**.

## Context: The Memory Budget

Context is the agent's working memory. It's also the bottleneck. While context windows have grown, they're still finite and expensive. Every file you open, every tool output you receive, every turn in the conversation eats into your budget.

The different terminologies you see imply different strategies for managing this constraint.

- **Slash Commands** (`/commit`, `/explain`): Reusable instructions. When you catch yourself typing the same prompt over and over, slash commands are the shortcut.
- **Context Compaction**: The AI's long-term memory mechanism. When the chat gets bloated, the system summarizes previous turns. This keeps the conversation going, but you lose the granular details of why a specific decision was made.
- **Selective Loading**: Load only what you need, when you need it. The idea is simple: keep the context window empty until the last possible second, then load the specific snippets required for the current line of code.

The underlying problem hasn't changed since the first chatbots. Context windows are limited. The terminology keeps expanding, but we're still solving the same problem: how to give the agent what it needs without exceeding its memory budget.

## Tools: The Action Layer

A chatbot can only generate text. An agent can take action. Tools bridge the gap between thinking and doing. From an architectural perspective, everything beyond the prompt is a tool call.

Tools can be categorized in many ways. Here are a few:

- **The Actuators (File System & Terminal)**: These tools let the agent actually modify your world—writing files, creating directories, running shell commands for builds and tests.
- **The Navigators (LSP & Indexers)**: LLMs are great at thinking but terrible at finding where things are. They can waste tons of tokens reading file after file just to locate one function. LSP (Language Server Protocol) tools give the agent sharp insight into code syntax, letting it find the right function definition without reading everything.
- **The Executioners (Sandboxes)**: Modern agents often use code interpreters or isolated sandboxes. If an agent isn't sure about a logic block, it can write a small script, execute it in a sandbox, and see the real output before suggesting it to you.
- **The Researcher (Browsers & RAG)**: These tools let the agent step outside your local machine. A browser tool lets it read information created after the model was trained.

### The Bridge: MCP (Model Context Protocol)

MCP is not a tool. It's the standardized interface that connects the agent to tools.

Before MCP, each tool implementation added maintenance burden to the developer team who owned the agent. This meant rebuilding wheels for the same resources over and over.

With MCP, the transport layer and tool spec are standardized. MCP server implementations become way more reusable, making the entire ecosystem plug-and-play.

## Prompts

When you talk directly to an LLM, you're giving it a user prompt. System prompts work differently. User prompts tell the agent what you want. System prompts tell the agent how to behave.

There are many fancy terms for system prompts, but they're all about shaping how the AI thinks and acts. The key difference is when and how they load.

### Base Instructions

Base instructions load when the session starts. These set the ground rules: what tools are available, what constraints exist, what background knowledge applies. Files like `CLAUDE.md` or `Agents.md` typically contain these. They're the foundation that everything else builds on. They can be global or per project.

### Skills

Skills load only when needed. A skill usually contains:

- Name
- Description: a short piece of text used by the LLM to decide when to load the entire content
- Body: detailed instructions

A debugging skill won't activate until you ask to debug something. A refactoring skill stays dormant until you mention refactoring. This lazy loading matters—it saves context by not loading domain expertise until it's actually needed.

### Commands

Commands are shorthand for user prompts. When you type `/refactor`, you're not asking the agent to refactor in a general sense. You're triggering a pre-crafted prompt that says something like "Analyze the selected code and suggest a refactoring that improves readability while preserving functionality." The command is a shortcut for a specific prompt you'd otherwise have to type out.

### Modes

Modes combine system prompts with tool configurations. Plan mode might load a more analytical system prompt and restrict tools to those useful for planning—reading files, analyzing code structure, understanding dependencies. Build mode might use a more action-oriented prompt and prioritize tools for writing code, running tests, and making changes. Modes are presets that bundle together a behavior and the tools that support it.

### The Hierarchy of Prompts

The core idea follows the same principles as software development: lazy loading resources and making them reusable.

These prompts form a hierarchy:

- Modes replace the entire configuration with a pre-baked set of prompts and tools
- Base instructions are the foundation—they always apply
- Skills layer on top, adding domain expertise when needed
- Commands trigger specific user prompts on top of whatever system prompts are active

Every prompt terminology does the same thing: layering prompts to shape behavior. Some load early, some load late. Some replace others, some build on them. But they're all prompts.

## Delegation: When Context Hits a Wall

This is where the three fundamentals intersect. Because context is limited, we try to split work among multiple agents.

Interestingly, even for humans, working with high-level planning and design doesn't require considering low-level details. Working with details doesn't require knowledge about the big picture beyond its own scope—as long as the spec is good enough.

Think of it as the architect agent calling a worker agent as a tool.

- The architect identifies a task that requires deep focus (e.g., "Refactor this 2,000-line module")
- Instead of doing it itself and bloating its own context, the architect delegates it to a subagent
- The subagent starts with a fresh, empty context and a specific skill prompt for refactoring
- Once the work is done, the subagent returns a concise summary to the architect

This recursive agency allows us to deal with bigger tasks without the main brain of the AI becoming a garbled mess of too much information.

Subagent delegation is just another tool. It's a tool that happens to spawn another agent with its own context. That mental model—thinking of subagents as tools—helps when working with coding agents.

## Takeaways

The terminology will keep expanding at the speed of marketing, but the underlying mechanics of AI development stay the same.

The agent vocabulary in 2026 is noisy. But by focusing on these three things—context, tools, and prompts—you move from being a consumer of buzzwords to an architect of the technology. You gain the ability to see the same reliable patterns beneath every new interface that hits the market.
