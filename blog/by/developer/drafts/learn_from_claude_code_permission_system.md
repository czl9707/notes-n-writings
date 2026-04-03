---
title: "Learn From Claude Code: Permission System"
description: How Claude Code's 10+ layer permission architecture protects every tool call with rules, classifiers, hooks, denial tracking, and a remote killswitch.
cover: media/covers/learn-from-claude-code-cover.svg
tags:
  - agent
  - ai
featured: true
created-date: 2026-04-02T00:00:00-04:00
last-updated-date: 2026-04-02T00:00:00-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: the permission system - 10+ layers of guardrails between every tool call and execution.

## The Problem

An AI agent that can run arbitrary bash commands, edit files, and access the network is dangerous. One wrong command and you've wiped your repo. One bad file edit and you've committed secrets.

Most agents handle this with a simple "ask the user every time" approach. This works but is noisy - the user gets prompted hundreds of times for routine operations.

Claude Code layers multiple permission checks, each faster and cheaper than the last. Most tool calls are resolved automatically. Only ambiguous cases reach the user.

## Permission Modes

The system has several modes:

| Mode | Behavior |
|------|----------|
| `default` | Prompt for everything |
| `plan` | Read-only, no tool execution |
| `acceptEdits` | Auto-accept file edits, prompt for bash |
| `bypassPermissions` | Allow everything (dangerous, gated) |
| `dontAsk` | Allow everything (even more dangerous) |
| `auto` | Classifier decides (ant-only) |

Each mode has a title, short title, symbol, and color for the UI. The mode determines the starting point for every permission check.

Modes like `bypassPermissions` and `dontAsk` are explicitly marked with `color: 'error'` in the UI - a visual warning that you're in a dangerous mode.

## The Permission Flow

Every tool call goes through this pipeline:

```
Tool called
    ↓
[1] Tool.validateInput()     — Tool-specific validation
    ↓ (passes)
[2] Tool.checkPermissions()  — Tool-specific rules
    ↓ (returns 'ask')
[3] Permission rules          — allow/deny/ask from settings
    ↓ (no rule match)
[4] Pre-tool hooks            — User-defined scripts
    ↓ (no hook decision)
[5] Bash classifier           — ML-based safety check
    ↓ (no classifier match)
[6] User prompt               — Ask the human
    ↓ (user decides)
Decision made
    ↓
[7] Denial tracking           — Record outcome
    ↓
[8] Post-tool hooks           — Notify/audit
```

Each layer can short-circuit. If a permission rule says "allow Bash(git *)", the git command never reaches the user. If the classifier says "deny rm -rf /", the command is blocked before the user sees it.

## Layer 1: Tool-Specific Validation

Each tool defines its own validation:

```typescript
validateInput?(input, context): Promise<ValidationResult>
```

Returns `{result: false, message, errorCode}` for invalid inputs. This catches malformed paths, invalid parameters, and tool-specific constraints.

This is the fastest check - pure validation logic, no network calls, no user interaction.

## Layer 2: Tool-Specific Permissions

```typescript
checkPermissions(input, context): Promise<PermissionResult>
```

Tool-specific logic that knows about the tool's semantics. Bash tool checks for dangerous commands. FileEdit tool checks for protected paths. WebFetch tool checks domain allowlists.

Returns one of:
- `{behavior: 'allow'}` - Approved
- `{behavior: 'deny', reason}` - Denied with explanation
- `{behavior: 'ask'}` - Needs higher-level check

## Layer 3: Permission Rules

Rules configured in settings:

```typescript
type PermissionRule = {
  toolName: string          // e.g., 'Bash'
  ruleContent?: string      // e.g., 'git *'
  behavior: 'allow' | 'deny' | 'ask'
  source: PermissionRuleSource
}
```

Sources:
- User settings (`.claude/settings.json`)
- Project settings (`.claude/settings.json`)
- Enterprise policy
- Dynamic (added during session)

Rule matching uses tool-specific matchers:

```typescript
preparePermissionMatcher?(input): Promise<(pattern: string) => boolean>
```

Bash tool: `Bash(git *)` matches `git status`, `git commit`, etc.
FileRead tool: `Read(/tmp/*)` matches any file in `/tmp`.

Without tool-specific matchers, only tool-name-level matching works (`Bash` → allow all Bash calls).

## Layer 4: Pre-Tool Hooks

User-defined scripts that run before tool execution:

```typescript
executePermissionRequestHooks(toolName, input, context)
```

Hooks can:
- Auto-approve based on custom logic
- Auto-deny based on policy
- Return suggestions for the permission dialog
- Do nothing (pass through to next layer)

Hooks are the user's escape hatch. If the built-in rules don't cover a case, write a hook.

## Layer 5: Bash Classifier

An ML model that classifies bash commands as safe or dangerous:

```typescript
const classifierResult = feature('BASH_CLASSIFIER')
  ? await ctx.tryClassifier?.(pendingCheck, updatedInput)
  : null
```

The classifier runs asynchronously. In interactive mode, it races against the user dialog. If the classifier approves before the user responds, the dialog closes automatically.

This is how "auto mode" works - the classifier handles routine commands, the user handles edge cases.

## Layer 6: User Prompt

If no automated layer resolved the permission, the user gets a dialog:

```
┌─────────────────────────────────────────┐
│ Allow Bash to run: rm -rf /tmp/test     │
│                                          │
│ [Allow Once] [Allow Always] [Deny]      │
└─────────────────────────────────────────┘
```

User decisions:
- **Allow Once** - Approve this invocation only
- **Allow Always** - Create a persistent allow rule
- **Deny** - Block with optional feedback

"Allow Always" creates a PermissionUpdate that persists to settings:

```typescript
type PermissionUpdate = {
  toolName: string
  ruleContent?: string
  behavior: 'allow' | 'deny'
  destination: PermissionUpdateDestination
}
```

## Handler Dispatch

Three different handlers for three agent contexts:

### Interactive Handler (Main Thread)

```typescript
handleInteractivePermission(params, resolve)
```

Pushes a `ToolUseConfirm` to the confirm queue. Runs hooks and classifier asynchronously, racing against user interaction. Uses a `resolveOnce` guard to prevent multiple resolutions.

The race pattern:
1. Show dialog to user
2. Start classifier check in background
3. First to resolve wins
4. Cancel the other

### Coordinator Handler (Worker)

```typescript
handleCoordinatorPermission(params): Promise<PermissionDecision | null>
```

Sequential checks only - no user dialog:
1. Try hooks
2. Try classifier
3. If neither resolves, return null (fall through to interactive)

Workers can't show their own dialogs. They rely on automated checks only.

### Swarm Worker Handler

```typescript
handleSwarmWorkerPermission(params): Promise<PermissionDecision | null>
```

Like coordinator, but forwards unresolved requests to the leader:

```typescript
// Forward to leader via mailbox
const request = createPermissionRequest({
  toolName, toolUseId, input, description, suggestions
})
sendPermissionRequestViaMailbox(request)

// Wait for leader's response
const decision = await new Promise(resolve => {
  registerPermissionCallback(toolUseId, resolve)
})
```

The leader (main terminal) shows the dialog. The worker waits. This is how swarm agents handle permissions - they delegate the UI to the leader.

## Denial Tracking

The system tracks permission denials:

```typescript
type DenialTrackingState = {
  consecutiveDenials: number
  totalDenials: number
}

const DENIAL_LIMITS = {
  maxConsecutive: 3,  // 3 denials in a row → fallback
  maxTotal: 20,       // 20 total denials → fallback
}
```

If denials exceed limits, the system falls back to prompting:

```typescript
function shouldFallbackToPrompting(state): boolean {
  return (
    state.consecutiveDenials >= 3 ||
    state.totalDenials >= 20
  )
}
```

This prevents the model from getting stuck in denial loops. After too many rejections, it stops trying automated approval and shows every request to the user.

## Permission Context

All permission state lives in a frozen context:

```typescript
type ToolPermissionContext = DeepImmutable<{
  mode: PermissionMode
  additionalWorkingDirectories: Map<string, AdditionalWorkingDirectory>
  alwaysAllowRules: ToolPermissionRulesBySource
  alwaysDenyRules: ToolPermissionRulesBySource
  alwaysAskRules: ToolPermissionRulesBySource
  isBypassPermissionsModeAvailable: boolean
  isAutoModeAvailable?: boolean
  strippedDangerousRules?: ToolPermissionRulesBySource
  shouldAvoidPermissionPrompts?: boolean
  awaitAutomatedChecksBeforeDialog?: boolean
  prePlanMode?: PermissionMode
}>
```

`DeepImmutable` ensures no accidental mutation. Rules are organized by source (user, project, enterprise) so precedence is clear.

## Bypass Killswitch

A remote killswitch can disable bypass permissions:

```typescript
async function checkAndDisableBypassPermissionsIfNeeded(context) {
  if (!context.isBypassPermissionsModeAvailable) return
  if (bypassPermissionsCheckRan) return
  bypassPermissionsCheckRan = true

  const shouldDisable = await shouldDisableBypassPermissions()
  if (!shouldDisable) return

  // Remotely disable bypass mode
  setAppState(prev => ({
    ...prev,
    toolPermissionContext: createDisabledBypassPermissionsContext(prev)
  }))
}
```

This runs once before the first query. If the remote gate says "no bypass for this org", the local setting is overridden. The user can't bypass this - it's a server-side policy.

After `/login`, the check resets so the new org's policy takes effect.

## Permission Persistence

User decisions can be persisted to settings:

```typescript
applyPermissionUpdates(updates, context, setAppState)
persistPermissionUpdates(updates, destination)
```

Destinations:
- **session** - Current session only
- **project** - `.claude/settings.json` in project
- **user** - `~/.claude/settings.json` globally

Persistence destinations follow the same precedence as config scopes. Enterprise policies override user settings.

## Caveats

### Complexity

10+ layers is a lot. Understanding the full permission flow requires tracing through validation → rules → hooks → classifier → user → denial tracking → persistence. Each layer has its own semantics and failure modes.

### Classifier Dependency

The bash classifier is feature-flagged and requires an ML model. If the model is unavailable or slow, permissions fall back to user prompting. The system degrades gracefully but the "auto mode" experience depends on classifier availability.

### Race Conditions

The interactive handler races classifier checks against user input. This requires careful synchronization (`resolveOnce` guard, `userInteracted` flag). Incorrect synchronization could cause double-resolution or missed approvals.

### Remote Killswitch

The bypass permissions killswitch queries a remote service. If the service is down, bypass permissions might remain enabled when they shouldn't be (or vice versa). The system assumes the network check is reliable.

## Brief

The permission system is a multi-layer defense:

- **6 check layers** - Validation, tool rules, settings rules, hooks, classifier, user prompt
- **3 handler types** - Interactive, coordinator, swarm worker
- **6 permission modes** - From default to bypass
- **Denial tracking** - Prevents automated approval loops
- **Remote killswitch** - Server-side override for dangerous modes
- **Persistence** - Rules saved to project or user settings
- **Deep immutable context** - No accidental mutation

What makes it work:
- **Short-circuit evaluation** - Fastest checks first, expensive checks last
- **Race pattern** - Classifier races user dialog in interactive mode
- **Graceful degradation** - Missing classifier? Fall back to user. Missing hooks? Fall back to rules.
- **Context-dependent** - Different handler for main thread, workers, swarm
- **Remote override** - Enterprise can disable dangerous modes server-side

The impressive part is the defense-in-depth. No single layer is sufficient, but together they handle every case: tool-specific logic for fast paths, rules for policy, hooks for custom logic, classifier for ML-based safety, and user prompt as the final backstop.

A permission system that actually protects you without making you want to turn it off.

Next blog: Sandboxing - how Claude Code isolates tool execution.
