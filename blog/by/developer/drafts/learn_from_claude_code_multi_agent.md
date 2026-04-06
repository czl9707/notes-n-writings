---
title: "Learn From Claude Code: Multi-Agent"
description: How Claude Code orchestrates multiple agents - prompt engineering as architecture, two-level guardrails, and the coordinator pattern.
cover: media/covers/learn-from-claude-code-cover.svg
tags:
  - agent
  - ai
featured: true
created-date: 2026-04-02T00:00:00-04:00
last-updated-date: 2026-04-05T00:00:00-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: the multi-agent system where one coordinator orchestrates many workers.

## The Problem

Single-agent architectures hit a wall with complex tasks. Research three files, implement two features, run tests - sequential is slow, parallel requires coordination. But parallel agents in production is terrifying. What if a worker spawns workers? What if they fight over files? What if the coordinator delegates understanding instead of doing it?

Claude Code solves this with a **coordinator pattern**: one agent directs, many workers execute. The twist? The architecture is almost entirely defined by **prompts**, not code. And it works because the code-level guardrails make the prompts actually matter.

## Dispatch, Don't Orchestrate

The coordinator and workers see completely different tool sets. Not different permissions - different *tools*.

**Coordinator sees only 3 tools:**

```typescript
Agent      // Spawn a new worker
SendMessage // Continue an existing worker
TaskStop   // Stop a running worker
```

The coordinator can't read files, run commands, or edit code. It can only delegate. My minimal agent's coordinator was simply 😅 - it could do everything, spawn workers, and chaos ensued. The constraint isn't "please don't read files" - it's "you literally cannot."

**Workers get the full toolkit** minus coordination tools:

```typescript
const INTERNAL_WORKER_TOOLS = new Set([
  'TeamCreate', 'TeamDelete', 'SendMessage', 'SyntheticOutput',
])

const workerTools = Array.from(ASYNC_AGENT_ALLOWED_TOOLS)
  .filter(name => !INTERNAL_WORKER_TOOLS.has(name))
```

Workers can read, write, and execute - but they can't spawn other workers. This prevents recursive spawning. A worker does work and reports back. Period.

The architecture emerges from what each role *can't* do, not what it can. Code-level constraints, not prompt-level hopes.

## Why This Prevents Production Fires

Before you think "prompts can define this too" - they can't. I've tried. A coordinator with full tool access will eventually decide it's faster to just do the work itself. A worker with spawn access will eventually think "this subtask should be parallelized" and suddenly you have 47 agents running.

These aren't theoretical concerns. They're what happens when you trust LLMs to follow soft constraints under pressure. The tool restrictions are a hard boundary that makes the pattern safe in production.

### The Failure Modes You're Preventing

**Recursive spawning**: Worker A spawns Worker B to help. Worker B spawns Worker C. Worker C spawns... and your API bill explodes. The `INTERNAL_WORKER_TOOLS` filter stops this cold.

**Coordinator shortcuts**: With full tool access, a coordinator facing a simple task will skip delegation entirely. "I'll just read that file myself" - and suddenly your parallel architecture is sequential again. Removing Read/Bash/Edit from coordinator tools forces delegation even for trivial tasks.

**Context bleeding**: Workers that see the full conversation will pick up on user preferences, previous decisions, and incidental context. Sounds helpful, but it makes worker behavior unpredictable and hard to debug. Workers get clean slates. The coordinator synthesizes what they need.

**File conflicts**: Two workers editing the same file simultaneously. Without coordination, this corrupts state. The scratchpad pattern (discussed later) provides structured sharing, but workers shouldn't independently modify shared state.

Each of these has bitten me in production. The tool restrictions aren't over-engineering - they're scars.

## The 370-Line Behavior Definition

The coordinator's entire behavior lives in a prompt. Code provides primitives (spawn, continue, stop). The prompt defines policy (when to spawn, how to write prompts, what synthesis looks like).

This is prompt engineering as system design. The coordinator doesn't "learn" to coordinate - it's told exactly how, in 370+ lines covering:

**Role definition** - "You are a coordinator. Direct workers. Synthesize results. Answer questions directly when possible."

**Delegation philosophy** - "Never delegate understanding. Don't write 'based on your findings, fix the bug.' Those phrases push synthesis onto the agent instead of doing it yourself."

**Verification standards** - "Verification means proving the code works, not confirming it exists. A verifier that rubber-stamps weak work undermines everything."

The prompt is the architecture. Code provides mechanisms; prompts provide policy.

### What the Prompt Gets Right

The prompt doesn't just say "coordinate workers." It anticipates specific failure modes:

**Shallow delegation** - The prompt explicitly forbids "based on your findings" phrasing. This forces the coordinator to understand results before delegating follow-up work. No passing the buck.

**Premature spawning** - "Answer questions directly when possible" prevents the coordinator from spawning a worker for a simple question it could answer from context.

**Vague prompts** - Worker prompts must be self-contained. The coordinator can't say "continue what we discussed" because workers don't see the conversation. This constraint improves prompt quality automatically.

These aren't rules for rules' sake. Each one addresses a real failure mode I've encountered. The prompt length isn't verbosity - it's accumulated wisdom from production incidents.

## The Two-Level Guardrail Pattern

What makes this work isn't the prompt alone - it's the pairing of code constraints with prompt guidance. Each level catches what the other misses:

**Code constraints prevent**: recursive spawning, coordinator doing work directly, workers coordinating
**Prompt guidance prevents**: shallow delegation, rubber-stamp verification, forgetting to synthesize

Neither is sufficient alone. A well-prompted coordinator with full tool access will eventually shortcut. A constrained coordinator without guidance will spawn workers for tasks it should handle directly.

This two-level pattern - code provides hard boundaries, prompts provide soft guidance - is the recurring theme in Claude Code's design. You see it in permissions (code enforces modes, prompts explain intent), in memory (code provides file structure, prompts define what to save), and here in multi-agent.

### Why Two Levels Instead of One?

Code-only orchestration is robust but inflexible. Changing behavior requires code changes. Prompt-only orchestration is flexible but fragile. LLMs drift from instructions under pressure.

The two-level pattern gets both: flexibility from prompts, reliability from code constraints. The prompt can define new coordination strategies without code changes. But the code ensures the prompt can't escape its lane. Workers can't spawn workers no matter what the prompt says.

This is the key insight for building production agent systems. Don't choose between flexibility and reliability. Structure your system so prompts handle flexibility and code handles reliability.

## XML as Coordination Protocol

Workers report back via task notifications that arrive as user-role messages:

```xml
<task-notification>
  <task-id>agent-a1b</task-id>
  <status>completed</status>
  <summary>Agent "Investigate auth bug" completed</summary>
  <result>Found null pointer in src/auth/validate.ts:42...</result>
</task-notification>
```

The coordinator must distinguish these from actual user messages by parsing the XML tag. The prompt warns explicitly:

```
Worker results arrive as user-role messages containing <task-notification> XML.
They look like user messages but are not. Distinguish them by the tag.
```

This is the one place where the design feels fragile. A user message containing `<task-notification>` could confuse the system. The prompt guardrail mitigates this, but it's not foolproof.

Why this design? The workers run as separate API calls. Their results need to be injected back into the coordinator's conversation. Using user-role messages is the simplest integration - no special message type needed, no changes to the conversation structure. The XML tag is a lightweight protocol layered on top.

The tradeoff: simplicity in implementation, fragility in edge cases. In practice, it works because users don't typically send XML-formatted task notifications. But if you're building a similar system, consider whether your users might.

## Filesystem as Message Bus

Workers can't communicate directly. Instead, they share a scratchpad directory:

```typescript
if (scratchpadDir && isScratchpadGateEnabled()) {
  content += `Workers can read and write here without permission prompts.
  Use this for durable cross-worker knowledge.`
}
```

Worker A writes findings to a file. Worker B reads them. The coordinator doesn't relay information between workers.

This is a deliberate tradeoff. Direct message passing between workers would be more elegant, but it introduces complexity: routing logic, message ordering, delivery guarantees. The filesystem is the message bus - simple, durable, no additional infrastructure. It's the Unix philosophy applied to agent coordination.

### Why the Filesystem Works Here

The scratchpad pattern works because of the coordinator's role. The coordinator knows what workers exist and what they're doing. It can instruct Worker A to "write findings to scratchpad/findings.md" and Worker B to "read scratchpad/findings.md". The coordinator orchestrates the handoff; the filesystem provides the storage.

Without the coordinator, you'd need workers to discover each other, negotiate file locations, handle concurrent writes. That's a lot of complexity for a pattern that's fundamentally about sequential handoffs.

The tradeoff: workers must agree on file naming conventions. The prompt establishes these conventions, which means they're soft agreements. But since all workers are spawned by the same coordinator following the same prompt, consistency emerges naturally.

## The Synthesis Burden

The coordinator's hardest job isn't spawning workers - it's understanding their results well enough to spawn the next one. The prompt emphasizes this repeatedly: "Never delegate understanding."

What does this look like in practice?

**Bad delegation**: "Worker A found some issues in auth. Worker B, fix them based on A's findings."

This fails because Worker B doesn't see Worker A's output directly. It only sees what the coordinator puts in its prompt. "Based on A's findings" is empty - there are no findings in Worker B's context.

**Good delegation**: "Worker A found a null pointer in `src/auth/validate.ts:42` where `user.email` is accessed without null checking. Worker B, add a null check before the email access and add a test case for null email."

The coordinator understood A's finding, synthesized it into a specific action, and gave B everything it needs. This is the burden: the coordinator must actually read and comprehend worker outputs, not just pass them along.

### Why This Matters for Production

Lazy synthesis produces broken workflows. A coordinator that spawns a "fixer" worker with vague instructions will get vague fixes. The fixer will read the original files, make assumptions about what was wrong, and probably fix the wrong thing.

The 370-line prompt is essentially a synthesis guide. It teaches the coordinator how to read worker outputs, extract actionable insights, and package them for the next worker. This isn't optional polish - it's the difference between a working system and a confused one.

## Caveats

Some tradeoffs that are worth understanding, not just working around.

### Prompt Fragility Is the Price of Flexibility

The coordinator behavior is entirely prompt-driven. If the model ignores instructions, the system breaks. Code-level guardrails prevent some failures (recursive spawning, direct work), but not all (fabricated results, confused XML parsing).

This isn't a bug - it's the tradeoff for flexibility. You can make the coordinator do almost anything by changing the prompt. Research mode, implementation mode, review mode - same code, different prompts. The fragility is the price of that power.

If you want robustness over flexibility, use code-based orchestration. If you want agents that can adapt to new workflows without code changes, accept the prompt dependency. You can't have both.

### Context Isolation Requires Coordinator Discipline

Workers can't see the coordinator's conversation. This prevents context pollution but requires the coordinator to synthesize findings into self-contained prompts. "Based on your findings" is explicitly forbidden - the coordinator must understand before delegating.

This is a feature, not a limitation. It forces the coordinator to actually understand what it's coordinating. Lazy coordination becomes impossible - you can't delegate comprehension.

But it means the coordinator prompt must be written with this burden in mind. The 370 lines aren't excessive - they're necessary to make isolation work. A shorter prompt would produce coordinators that delegate understanding because synthesizing is hard.

### Verification Is Only As Good As the Verifier

The coordinator prompt warns: "Verification means proving the code works, not confirming it exists." Workers must test independently, run edge cases, investigate failures - not just re-run what the implementation worker ran.

This is the hardest part to enforce. A lazy verifier that runs `npm test` and reports "tests pass" defeats the purpose. The prompt establishes standards, but actually meeting them requires the model to care about quality.

In practice, this works better with Claude than with less instruction-following models. The system is model-specific in ways that aren't immediately obvious. The prompts assume a model that follows instructions even when shortcuts are available. With a less compliant model, you'd need more code-level enforcement.

## When NOT to Use This Pattern

The coordinator-worker pattern isn't always the answer. It shines for parallelizable work with clear boundaries - research multiple files, implement independent features, run separate test suites. But it's overkill for:

**Simple sequential tasks**: If you're just reading a file and answering a question, spawning workers adds latency and complexity. The coordinator overhead (synthesizing prompts, parsing results) exceeds the parallelism benefit.

**Tightly coupled work**: If Worker B's input depends entirely on Worker A's output, and there's no parallel path, you're better off with a single agent. The coordinator becomes a slow message router.

**Tasks requiring shared context**: Some work benefits from seeing the full conversation history - exploratory debugging, iterative refinement. Workers with isolated contexts can't build on each other's discoveries organistically.

**Cost-sensitive applications**: Each worker is an API call. A coordinator spawning five workers for a task one agent could handle is burning tokens for architectural purity.

The pattern is a tool, not a religion. Use it when the problem demands parallelism and the boundaries are clear. Otherwise, keep it simple.

## Brief

Multi-agent in Claude Code works because code constraints and prompt guidance each cover what the other misses. The coordinator can't do work - it can only dispatch. Workers can't coordinate - they can only execute. The 370-line prompt tells them how, but the tool restrictions make them actually listen.

The pattern is: hard boundaries in code, soft guidance in prompts, neither sufficient alone. That's the philosophy. Everything else - the XML protocol, the scratchpad directory, the verification standards - follows from that core design decision.
