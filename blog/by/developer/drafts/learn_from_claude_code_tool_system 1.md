---
title: "Learn From Claude Code: Tool System"
description: Claude Code has 45+ tools. OpenClaw preached minimal tools. Both work. The difference is guardrails, not tool counts.
cover: media/covers/learn-from-claude-code-cover.svg
tags:
  - agent
  - ai
featured: true
created-date: 2026-04-02T00:00:00-04:00
last-updated-date: 2026-04-05T00:00:00-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and the inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: how 45+ tools don't collapse into chaos.

## The Tool Count Paradox

When **OpenClaw** went viral, the hot take was "minimal tools design" - autonomous agents need as few tools as possible. Fewer tools, fewer ways to destroy things unsupervised. Sound advice.

Then I looked at Claude Code. It ships with **45+ built-in tools**.

And it works. Really well.

This doesn't disprove minimal tools. It reveals a hidden variable: who's watching?

## Who Absorbs Complexity?

**OpenClaw runs unsupervised.** Every tool call happens without oversight. In that world, minimal surface area is survival. You can't afford a tool that might do the wrong thing at 3am while you sleep.

**Claude Code runs under supervision.** Humans watch every turn, approve destructive operations, notice when things go sideways. The human **absorbs complexity** that autonomous systems have to engineer away.

| Context | Where complexity lives | Tool strategy |
|---------|----------------------|---------------|
| Autonomous | The harness | Minimal tools, extensive guardrails |
| Interactive | The human | Expansive tools, minimal guardrails |

This is the hidden variable. **Humans are the safety net.** Once you have a human in the loop, tool sprawl becomes manageable. Not desirable - manageable.

The lesson isn't "more tools is better." It's that tool count is the wrong metric. **Guardrails per tool** is what matters.

## The Fat Interface: Debt That Enabled Speed

The Tool type has 30+ methods. This wasn't architected - it emerged from organic growth.

A **fat interface** is textbook anti-pattern. Most tools implement methods they don't use. But here's why it works:

```typescript
type Tool<Input, Output> = {
  // Execution contract
  name: string
  call(args, context): Promise<ToolResult<Output>>

  // Guardrails - each layer has a different recovery strategy
  checkPermissions(input, context): Promise<PermissionResult>
  validateInput?(input, context): Promise<ValidationResult>

  // Risk classification - determines if human approval is needed
  isReadOnly(input): boolean
  isDestructive?(input): boolean
}
```

The interface isn't 30 methods of equal importance. It's **three concerns**: execution, guardrails, risk classification. The remaining 25+ methods are lifecycle hooks, rendering helpers, and edge cases with safe defaults.

**Lost:** Clean interfaces, obvious which methods matter for which tools.

**Gained:** Adding tools becomes nearly free. Once you have a contract with safe defaults, the marginal cost of another tool is almost zero.

The `buildTool()` helper proves this - tools only implement 5-10 methods that matter:

```typescript
export const buildTool = <I, O>(tool: Partial<Tool<I, O>>): Tool<I, O> => ({
  maxResultSizeChars: 50000,
  isReadOnly: () => true,
  isDestructive: () => false,
  validateInput: async () => ({ valid: true }),
  ...tool,  // Override defaults
})
```

Every tool gets 25+ methods for free. This isn't "bad design" - it's **debt that enabled speed**. Organic growth needed a low-friction path.

## Guardrails Over Architecture

The fat interface isn't the architecture. The permission layers are.

Every tool call goes through three validation layers. Each exists because **different rejection reasons need different recovery strategies**. Conflating them conflates the fix.

**Layer 1: validateInput()** - "Your input is wrong, fix it"

Tool-specific validation. The model gets actionable feedback and retries immediately. Syntax errors, invalid paths, missing fields - problems the model fixes solo. No human needed, no escalation required.

The error message is designed for the model. Not "Invalid input" but "File path contains invalid characters: `test?.txt`. Use alphanumeric characters only." The model reads this and knows exactly what to do.

**Layer 2: checkPermissions()** - "This tool can't do that"

Tool-specific policy. Not syntax - rules. Each tool defines its own guardrails. The Write tool checks different things than Bash. The model can't fix this by reformulating - it's a hard boundary enforced by the tool itself.

This is where domain knowledge lives. The Bash tool knows that `rm -rf /` is a bad idea. The Write tool knows that `.env` files shouldn't be overwritten without warning. The knowledge is distributed, not centralized.

**Layer 3: canUseTool()** - "User hasn't approved this, ask them"

The general permission system handles human-in-the-loop concerns: permission rules (`Bash(git *)` always allowed), hooks (pre-tool-use callbacks), user decisions (explicit approved/denied). This is where the human enters the picture.

**Why three layers?** Because recovery differs:

| Rejection from | What it means | Recovery |
|----------------|---------------|----------|
| `validateInput()` | Syntax error | Model retries |
| `checkPermissions()` | Policy violation | Tool enforces |
| `canUseTool()` | Needs approval | Escalate to human |

One layer would conflate these. Three layers keep concerns separate. When validation fails, the model knows to fix its input. When permission fails, it knows to ask. The error message tells the recovery story.

The architecture principle here: **separate by recovery strategy, not by technical layer**. Most permission systems conflate "is this valid?" with "is this allowed?" with "should I ask?". Claude Code separates them because the human has different roles in each. In validation, the human is irrelevant. In policy, the human set the rules. In approval, the human makes the call.

**The guardrails are the architecture** - not the fat interface.

## Caveats

The tradeoffs here are deliberate.

**Interface purity** was traded for expansion speed. The `buildTool()` helper with safe defaults mitigates the cognitive cost - most tools only implement 5-10 methods that matter to them. The fat interface looks scary, but in practice, it's manageable.

**Minimal surface** was traded for human-in-loop safety. This works because humans catch what guardrails miss. It would be catastrophic for autonomous systems - but Claude Code isn't autonomous. The design assumes a human is watching.

**Single-layer simplicity** was traded for debugging clarity. When something fails, you know exactly *why* - and the recovery path is obvious. The indirection pays for itself in debuggability. One pipeline with 14 stages would be a nightmare to trace. Three layers with clear boundaries is debuggable.

## Brief

OpenClaw says minimal tools. Claude Code has 45+. Both work because they solve different problems. **The hidden variable is human supervision - when humans absorb complexity, tool sprawl becomes manageable. The fat interface is debt that enabled speed; the permission layers are what actually make it work.**
