---
title: "Learn From Claude Code: Permission System"
description: Learning Claude Code's permission system by inspecting its leaked source code.
cover: media/covers/learn-from-claude-code-cover.svg
tags:
  - agent
  - ai
featured: false
created-date: 2026-04-02T00:00:00-04:00
last-updated-date: 2026-04-08T22:16:18-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: the permission system - multiple layers of guardrails between every tool call and execution.

Other posts in this series: [App State](blog/by/developer/learn_from_claude_code_app_state_machine.md), [Query Engine](blog/by/developer/learn_from_claude_code_query_engine.md), [Tool System](blog/by/developer/learn_from_claude_code_tool_system.md), [Memory](blog/by/developer/learn_from_claude_code_memory.md), [Context Compaction](blog/by/developer/learn_from_claude_code_context_compaction.md), [MCP Integration](blog/by/developer/learn_from_claude_code_mcp_integration.md), [Multi-Agent](blog/by/developer/learn_from_claude_code_multi_agent.md), [Agent Spawning](blog/by/developer/learn_from_claude_code_agent_spawning.md).

## The Problem

AI agents will take actions that users don't allow, that's why we need a permission system. Every [tool call](blog/by/developer/learn_from_claude_code_tool_system.md) flows through this pipeline. Claude Code layers multiple permission checks, with each layer following a short-circuit design.

## Permission Decisions

Every permission check returns one of three results: `allow`, `deny`, and `ask`. `allow` and `deny` exits immediately, only `ask` continues down the pipeline.

```typescript
type PermissionDecision =
  | { behavior: 'allow', updatedInput?, decisionReason? }
  | { behavior: 'deny', message, decisionReason }
  | { behavior: 'ask', message, suggestions?, decisionReason? }
```

## Permission Modes

Modes determine the default behavior.

- **`default`** - Prompt for everything (normal interactive use)
- **`acceptEdits`** - Auto-accept file edits in working directory
- **`plan`** - Read-only, no tool execution
- **`bypassPermissions`** - Allow everything except safety checks (dangerous)
- **`dontAsk`** - Convert all asks to denies (fail-closed automation)
- **`auto`** - AI classifier decides (hands-free operation)

## Permission Sources

Rules come from 7 sources with strict precedence. A rule from a higher source overrides conflicting rules from lower sources.

```typescript
type PermissionRuleSource =
  | 'cliArg'        // --permission-mode flag
  | 'command'       // /command configuration
  | 'session'       // Current session only
  | 'policySettings' // Enterprise policy
  | 'flagSettings'  // Enterprise feature flags
  | 'projectSettings' // .claude/settings.json in project
  | 'userSettings'    // ~/.claude/settings.json
```

## Permission Flow

Every tool call flows through this pipeline:

```
┌────────────────────────────────────────────────────────────┐
│ 1. RULE-BASED CHECKS                                       │
│    • Tool denied? → deny                                   │
│    • Tool has ask rule? → ask                              │
│    • Tool's own checkPermissions() → deny/allow/ask        │
│    • Safety checks (.git/, .claude/) → ask                 │
│    • Tool allowed? → allow                                 │
└────────────────────────────────────────────────────────────┘
                         ↓ (if ask)
┌────────────────────────────────────────────────────────────┐
│ 2. MODE-BASED CHECKS                                       │
│    • bypassPermissions mode? → allow                       │
│    • dontAsk mode? → deny                                  │
│    • default mode? → ask                                   │
│    • acceptEdits mode? → ask (unless file edit)            │
│    • auto mode? → Run classifier                           │
└────────────────────────────────────────────────────────────┘
                         ↓ (if ask in auto mode)
┌────────────────────────────────────────────────────────────┐
│ 3. AUTO MODE CLASSIFIER                                    │
│    • Would acceptEdits allow? → allow (fast path)          │
│    • Tool on safe allowlist? → allow (fast path)           │
│    • Run YOLO classifier → allow/deny/ask                  │
└────────────────────────────────────────────────────────────┘
                         ↓ (if still ask)
┌────────────────────────────────────────────────────────────┐
│ 4. USER PROMPT                                             │
│    • Show permission dialog                                │
│    • User decides: Allow Once / Always / Deny              │
│    • "Always" creates persistent rule                      │
└────────────────────────────────────────────────────────────┘
```

The core logic lives in `hasPermissionsToUseToolInner()`:

```typescript
async function hasPermissionsToUseToolInner(
  tool: Tool,
  input: { [key: string]: unknown },
  context: ToolUseContext,
): Promise<PermissionDecision> {
  // 1a. Tool-level deny rule
  const denyRule = getDenyRuleForTool(context, tool)
  if (denyRule) return { behavior: 'deny', decisionReason: { type: 'rule', rule: denyRule } }

  // 1b. Tool-level ask rule
  const askRule = getAskRuleForTool(context, tool)
  if (askRule) return { behavior: 'ask', decisionReason: { type: 'rule', rule: askRule } }

  // 1c. Tool's own permission check
  const toolResult = await tool.checkPermissions(parsedInput, context)
  if (toolResult?.behavior === 'deny') return toolResult
  if (toolResult?.behavior === 'ask') return toolResult

  // 2a. Bypass mode
  if (mode === 'bypassPermissions') return { behavior: 'allow' }

  // 2b. Tool-level allow rule
  const allowRule = toolAlwaysAllowedRule(context, tool)
  if (allowRule) return { behavior: 'allow', decisionReason: { type: 'rule', rule: allowRule } }

  // 3. Convert passthrough to ask
  return { behavior: 'ask', message: createPermissionRequestMessage(tool.name) }
}
```

The wrapper `hasPermissionsToUseTool()` handles post-processing:

```typescript
export const hasPermissionsToUseTool = async (tool, input, context) => {
  const result = await hasPermissionsToUseToolInner(tool, input, context)

  // Early exit for allow/deny
  if (result.behavior === 'allow') return result

  // Mode transformations for 'ask'
  if (result.behavior === 'ask') {
    if (mode === 'dontAsk') return { behavior: 'deny' }
    if (mode === 'auto') {
	   // classifyYoloAction(...) 
    } 
  }

  return result
}
```

### Permission Rules

Rules are the configuration layer collected from multiple sources, from `~/.claude/settings.json`, `{project}/.claude/settings.json` and etc.

``` typescript
{
	"permissions": {
		"allow": [
			"Bash(xargs awk:*)",
			"Bash(uv sync:*)",
			"Bash(git *)",
			...
		]
		"deny": []
	}
}
```

`Bash(git *)` matches `git status`, `git commit`, etc. Without a matcher, only tool-name-level matching works.

### Auto Mode Classifier

Auto mode is not released yet at this moment. The classifier enables **hands-free operation**. Instead of showing a permission dialog, it utilize LLM's capability to decide if the action is safe.

#### Two-Stage Classification

The classifier uses a cascading approach: try cheap first, escalate to expensive only when needed.

Most of the cases are common cases. **Fast stage** is optimized for the common case, safe operations. With only 64 tokens and a stop sequence, it's fast and cheap. If something looks safe, it returns `allow` immediately.

**Thinking Stage** only runs when Fast Stage says `block`. This is the expensive path - 4096 tokens, chain-of-thought reasoning, deeper analysis. It double-checks whether the block is justified or if there's context that makes it safe.

Two stages use different prompt, fast stage:

```
<transcript>
  [recent conversation history]
  [tool call being classified]
</transcript>
Err on the side of blocking. <block> immediately.
```

While thinking stage has some more:

```
<transcript>
  [recent conversation history]
  [tool call being classified]
</transcript>
Review the classification process and follow it carefully, making sure 
you deny actions that should be blocked. As a reminder, explicit (not 
suggestive or implicit) user confirmation is required to override blocks. 
Use <thinking> before responding with <block>.
```

## Caveats

Some details that make this work in practice.

### Safety Checks Are Bypass-Immune

Even in `bypassPermissions` mode, safety checks for sensitive paths (`.git/`, `.claude/`, shell configs) still prompt. These can't be disabled by mode - only explicit rules can override them.

## Brief

3 permission results, 6 modes, 14 stages permission checks—Claude Code has a complex permission system.

Auto mode is something not released yet, but indeed an interesting concept. It solves a real problem: we need something between blindly allowing everything and reviewing everything. Meanwhile, Auto mode has a strong purpose of serving their "KARIOS" mode (background daemon).

There is not much to comment. But it is good to have a mental model about the mechanism of the permission system.
