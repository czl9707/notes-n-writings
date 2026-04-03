---
title: "Learn From Claude Code: Remote Sessions"
description: How Claude Code runs agents on remote containers and streams results back — WebSocket subscriptions, permission bridging, synthetic objects, and compaction-aware reconnect.
cover: media/covers/learn-from-claude-code-cover.svg
tags:
  - agent
  - ai
featured: true
created-date: 2026-04-02T00:00:00-04:00
last-updated-date: 2026-04-02T00:00:00-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: remote sessions — how Claude Code runs an agent on a cloud container and streams the results back to your terminal.

## The Problem

Claude Code runs in your terminal. But sometimes you want the agent to run somewhere else — a cloud container with more compute, different filesystem access, or a persistent environment that outlives your terminal session.

This creates a distributed system problem:
- The agent runs on a remote container (CCR — Cloud Container Runtime)
- The user sees output in their local terminal
- Permission prompts must reach the user's machine
- The user's decision must travel back to the remote container
- Network interruptions shouldn't kill the session

The architecture that solves this is worth studying because it handles each of these concerns with specific, deliberate design decisions.

## Architecture

```
Your Terminal / claude.ai
         ↕ WebSocket (receive events)
         ↕ HTTP POST (send messages)
    [RemoteSessionManager]
         ↕
    [SessionsWebSocket]
         ↕
    [CCR Container]  ← runs the actual agent
         ↕
    [Anthropic API]
```

Five files in `src/remote/`. Each has a single, clear responsibility:

| File | Role |
|------|------|
| `SessionsWebSocket.ts` | WebSocket client with reconnect |
| `RemoteSessionManager.ts` | Message routing, permission tracking |
| `sdkMessageAdapter.ts` | SDK → REPL message conversion |
| `remotePermissionBridge.ts` | Synthetic objects for permission UI |
| `remoteSession.ts` (background) | Preconditions before creating session |

The separation is clean: transport (WebSocket), routing (manager), adaptation (adapter), bridging (permission bridge), and validation (preconditions).

## The Subscribe Pattern

The first interesting decision: **WebSocket for receiving, HTTP POST for sending**.

```typescript
// Receiving: WebSocket subscription
wss://api.anthropic.com/v1/sessions/ws/{sessionId}/subscribe?organization_uuid={orgUuid}

// Sending: HTTP POST
await sendEventToRemoteSession(sessionId, content, opts)
```

This is a pub/sub pattern, not bidirectional RPC. The WebSocket is a subscription to a stream of events. When you send a message, you POST it and trust the event stream to deliver the response.

Why? Because the WebSocket can disconnect and reconnect without losing messages. The CCR container keeps running. When your WebSocket reconnects, you pick up where you left off. HTTP POST is fire-and-forget — no connection state to manage.

Auth is in the WebSocket upgrade headers, not a message:

```typescript
headers: {
  Authorization: `Bearer ${accessToken}`,
  'anthropic-version': '2023-06-01',
}
```

No auth message, no token in the URL. The server validates at connection time.

## Reconnect: Compaction-Aware

Here's where it gets interesting. The reconnect logic has three tiers:

```typescript
const RECONNECT_DELAY_MS = 2000
const MAX_RECONNECT_ATTEMPTS = 5
const MAX_SESSION_NOT_FOUND_RETRIES = 3
```

| Close Code | Behavior |
|------------|----------|
| 4003 (unauthorized) | Permanent. No reconnect. |
| 4001 (session not found) | Retry up to 3 times with linear backoff |
| Other | Retry up to 5 times |

The 4001 handling is the interesting part. Why would a session temporarily not be found? Because of **context compaction**.

> During compaction the server may briefly consider the session stale while the CLI worker is busy with the compaction API call and not emitting events.

The code comments explain it directly. Compaction is a real-time operation that can make the server lose track of a session momentarily. The client handles this with retry logic:

```typescript
if (closeCode === 4001) {
  this.sessionNotFoundRetries++
  if (this.sessionNotFoundRetries > MAX_SESSION_NOT_FOUND_RETRIES) {
    this.callbacks.onClose?.()
    return
  }
  this.scheduleReconnect(
    RECONNECT_DELAY_MS * this.sessionNotFoundRetries, // linear backoff: 2s, 4s, 6s
    `4001 attempt ${this.sessionNotFoundRetries}/${MAX_SESSION_NOT_FOUND_RETRIES}`,
  )
}
```

This is a production-aware guardrail. The leaky source code reveals a team that's been debugging real issues — the kind that only show up when compaction and WebSocket subscriptions collide.

## Permission Bridging

This is the most impressive part. The agent runs remotely, but permission decisions must happen locally. The user needs to see "Bash: `rm -rf /tmp/old`" and decide yes/no — but the tool will execute on the CCR container, not their machine.

### The Flow

```
CCR: "Can I use Bash with {command: 'rm -rf /tmp/old'}?"
  → WebSocket control_request → RemoteSessionManager
  → pendingPermissionRequests.set(request_id, request)
  → callbacks.onPermissionRequest(request, request_id)
  → Local UI shows permission prompt
  → User clicks "Allow" or "Deny"
  → respondToPermissionRequest(request_id, result)
  → WebSocket control_response → CCR
CCR: Executes or skips the tool
```

The permission request type:

```typescript
type RemotePermissionResponse =
  | { behavior: 'allow'; updatedInput: Record<string, unknown> }
  | { behavior: 'deny'; message: string }
```

Notice `updatedInput`. The local client can **modify the tool's input** before the remote agent executes it. If the agent wants to run `rm -rf /tmp/old`, the user could change it to `rm -rf /tmp/old --dry-run` before it executes on the remote container.

This is a security model that trusts the local machine over the remote one. The remote container has no authority — every potentially dangerous operation must be approved (and can be edited) by the user on their local machine.

### The Server Can Cancel, Too

```typescript
if (message.type === 'control_cancel_request') {
  const pendingRequest = this.pendingPermissionRequests.get(request_id)
  this.pendingPermissionRequests.delete(request_id)
  this.callbacks.onPermissionCancelled?.(request_id, pendingRequest?.tool_use_id)
}
```

The CCR container can cancel a pending permission request. This handles the case where the agent has already moved on (maybe it retried with a different approach) and the permission prompt is stale.

## Synthetic Objects

Here's where the adapter pattern shines. The local permission UI expects two things:
1. An `AssistantMessage` containing the `tool_use` block
2. A `Tool` object with rendering logic

But in remote mode, neither exists locally. The tool use runs on CCR. The tool might not even be registered locally (it could be an MCP tool only available on the remote container).

The solution: create synthetic versions.

```typescript
function createSyntheticAssistantMessage(
  request: SDKControlPermissionRequest,
  requestId: string,
): AssistantMessage {
  return {
    type: 'assistant',
    uuid: randomUUID(),
    message: {
      id: `remote-${requestId}`,
      type: 'message',
      role: 'assistant',
      content: [{
        type: 'tool_use',
        id: request.tool_use_id,
        name: request.tool_name,
        input: request.input,
      }],
      // ... empty usage, null stop_reason
    }
  }
}
```

A fake AssistantMessage constructed from the permission request data. It has the right shape — `tool_use` content block with the correct tool name, ID, and input — but it was never actually generated by the API. It's purely for the UI.

For unknown tools (MCP tools that exist on CCR but not locally), a stub is created:

```typescript
function createToolStub(toolName: string): Tool {
  return {
    name: toolName,
    inputSchema: {} as Tool['inputSchema'],
    isEnabled: () => true,
    userFacingName: () => toolName,
    renderToolUseMessage: (input) => {
      // Show first 3 key-value pairs
      return entries.slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ')
    },
    call: async () => ({ data: '' }),  // no-op
    isReadOnly: () => false,
    needsPermissions: () => true,       // safer default
  }
}
```

The stub provides enough for the permission UI to render a meaningful prompt. First 3 input fields shown, always requires permissions, no-op execution. The real execution happens on CCR — this stub just satisfies the local type contract.

This is a pattern worth remembering: when you need to bridge two systems with different type contracts, create synthetic objects that satisfy one system's requirements using data from the other.

## Message Adaptation

The CCR container sends SDK-format messages. The local REPL expects internal Message types. The `sdkMessageAdapter` converts between them.

What's interesting is the filtering logic:

```typescript
case 'result':
  // Only show result messages for errors. Success results are noise
  // in multi-turn sessions (isLoading=false is sufficient signal).
  if (msg.subtype !== 'success') {
    return { type: 'message', message: convertResultMessage(msg) }
  }
  return { type: 'ignored' }

case 'user':
  // User-typed messages are already added locally by REPL.
  // In CCR mode, all user messages are ignored.
  return { type: 'ignored' }
```

Success results are noise. User messages are duplicated. The adapter filters these out because the local REPL already has them — showing them again would be confusing.

Unknown message types are logged and ignored:

```typescript
default: {
  logForDebugging(`[sdkMessageAdapter] Unknown message type: ${msg.type}`)
  return { type: 'ignored' }
}
```

This forward-compatibility means a backend update that adds new message types won't crash old clients. The comment explains the reasoning:

> The backend may send new types before the client is updated; logging helps with debugging without crashing or losing the session.

## Preconditions

Before creating a remote session, six checks run:

```typescript
async function checkBackgroundRemoteSessionEligibility() {
  // 1. Policy check (hard gate)
  if (!isPolicyAllowed('allow_remote_sessions')) return [{ type: 'policy_blocked' }]

  // 2-4. Parallel checks
  const [needsLogin, hasRemoteEnv, repository] = await Promise.all([
    checkNeedsClaudeAiLogin(),
    checkHasRemoteEnvironment(),
    detectCurrentRepositoryWithHost(),
  ])

  // 5. Git repo
  if (!checkIsInGitRepo()) errors.push({ type: 'not_in_git_repo' })

  // 6. GitHub app (conditional on repo host)
  if (repository.host === 'github.com')
    checkGithubAppInstalled(repository.owner, repository.name)
}
```

Policy check is a hard gate — if blocked, no further checks needed. The remaining checks run in parallel for speed.

There's also a bundle seeding path:

```typescript
// When bundle seeding is enabled, GitHub remote + app are NOT required
// CCR can seed from a local bundle instead
const bundleSeedGateOn =
  isEnvTruthy(process.env.CCR_FORCE_BUNDLE) ||
  await checkGate_CACHED_OR_BLOCKING('tengu_ccr_bundle_seed_enabled')
```

Two paths to remote sessions:
1. **GitHub-based**: Git remote → GitHub app → CCR clones from GitHub
2. **Bundle-based**: Local `.git` → bundle upload → CCR seeds from bundle

Bundle seeding removes the GitHub requirement. You can use remote sessions with any git repo, even private ones not on GitHub.

## Viewer Mode

```typescript
type RemoteSessionConfig = {
  viewerOnly?: boolean  // claude assistant mode
}
```

When `viewerOnly` is true:
- Ctrl+C/Escape do NOT send interrupt
- 60s reconnect timeout is disabled
- Session title is never updated

This is used by `claude assistant` — a passive viewer that watches a session without controlling it. It's a clean read vs write access separation at the protocol level.

## Worker Side: Heartbeats

Inside the CCR container, the `ccrClient` maintains the connection to the control plane:

```typescript
const DEFAULT_HEARTBEAT_INTERVAL_MS = 20_000  // 20s heartbeats
// Server TTL is 60s, so 3 heartbeats per window

const MAX_CONSECUTIVE_AUTH_FAILURES = 10
// 10 × 20s ≈ 200s to ride out transient auth issues
```

Auth failure handling is nuanced:

> An expired JWT short-circuits immediately — deterministic, retry is futile. The threshold is for the uncertain case: token's exp is in the future but server says 401 (userauth down, KMS hiccup, clock skew).

This is production-hardened logic. The code distinguishes between deterministic failures (expired token) and uncertain failures (server hiccup) and handles them differently.

## Caveats

### Permissive Validation

The WebSocket message validator accepts anything with a string `type` field:

```typescript
function isSessionsMessage(value: unknown): value is SessionsMessage {
  if (typeof value !== 'object' || value === null || !('type' in value)) return false
  return typeof value.type === 'string'
}
```

The comment explains: "A hardcoded allowlist here would silently drop new message types the backend starts sending before the client is updated." This is a deliberate tradeoff: forward-compatibility over strict validation.

### No Queue on Client Side

User messages are sent via HTTP POST, fire-and-forget. There's no local queue for outgoing messages. If the POST fails, the user is notified but the message is lost. This is acceptable because the user can see the failure and retype, but it means there's no offline support.

### Tool Stubs Are Minimal

The stubs created for unknown MCP tools have empty schemas and no validation. The permission UI shows the first 3 key-value pairs of input. This works for simple tools but might be confusing for complex MCP tools with nested input schemas.

## Brief

Remote sessions are a distributed system with five key design decisions:

1. **Subscribe pattern** — WebSocket for receiving, HTTP POST for sending. Reconnect without state loss.
2. **Compaction-aware reconnect** — Close code 4001 gets special retry logic because context compaction can make sessions temporarily invisible.
3. **Local permissions, remote execution** — Every tool approval happens on the user's machine. The `updatedInput` field lets users modify inputs before remote execution.
4. **Synthetic bridge objects** — Fake AssistantMessages and Tool stubs satisfy local UI contracts while execution is remote.
5. **Forward-compatible validation** — Permissive message typing so backend updates don't crash old clients.

What makes this impressive isn't the WebSocket code — that's standard. It's the guardrails:
- Compaction can break WebSocket subscriptions → explicit retry logic
- Remote tools don't exist locally → synthetic objects bridge the gap
- Backend might send unknown message types → logged and ignored, not crashed
- Auth failures might be transient → ride them out, but exit immediately for expired tokens
- GitHub might not be available → bundle seeding as alternative path

Each guardrail addresses a specific production issue. The code reads like a log of incidents that happened and were handled.

---

Next: OAuth & Authentication — how Claude Code manages tokens, refresh flows, and analytics integration.
