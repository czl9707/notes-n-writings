---
title: "Learn From Claude Code: Bridge System"
description: How Claude Code communicates with VS Code, JetBrains, and claude.ai - bidirectional message routing, JWT auth, permission forwarding, and multi-session management.
cover: media/covers/learn-from-claude-code-cover.svg
tags:
  - agent
  - ai
featured: true
created-date: 2026-04-02T00:00:00-04:00
last-updated-date: 2026-04-02T00:00:00-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: the bridge system - how Claude Code's terminal talks to IDE extensions and claude.ai.

## The Problem

Claude Code runs in a terminal. But users also interact with it through VS Code, JetBrains, and claude.ai. These external clients need to:
- Send messages to Claude Code
- Receive streaming responses
- Handle permission prompts remotely
- Manage sessions

The bridge system makes this work. It's a bidirectional communication layer between the terminal REPL and external clients.

## Architecture

31 files in `src/bridge/`. The key components:

```
claude.ai / VS Code / JetBrains
         ↕ HTTP/WebSocket
    [Bridge API Server]
         ↕
    [bridgeMain.ts]         ← Standalone mode
    [replBridge.ts]          ← REPL mode (in-process)
         ↕
    [Claude Code REPL]
```

Two bridge modes:
- **Standalone** (`bridgeMain.ts`) - `claude remote-control` command. Runs a persistent server that spawns Claude Code sessions on demand.
- **REPL bridge** (`replBridge.ts`) - In-process bridge. The REPL connects to claude.ai while running.

## Transport Layer

Two transport versions:

```typescript
// V1: HTTP polling
createV1ReplTransport(config): ReplBridgeTransport

// V2: WebSocket (preferred)
createV2ReplTransport(config): ReplBridgeTransport
```

V2 uses WebSocket for real-time bidirectional communication. V1 falls back to HTTP polling (slower, but works everywhere).

The `HybridTransport` wraps both:

```typescript
// Try V2 first, fall back to V1
const transport = new HybridTransport(v2Config, v1Config)
```

## Message Flow

### Outbound: REPL → Client

Messages flow from the REPL to external clients:

```typescript
export function isEligibleBridgeMessage(m: Message): boolean {
  if ((m.type === 'user' || m.type === 'assistant') && m.isVirtual) {
    return false  // Virtual messages stay internal
  }
  return (
    m.type === 'user' ||
    m.type === 'assistant' ||
    (m.type === 'system' && m.subtype === 'local_command')
  )
}
```

Only user, assistant, and local command messages cross the bridge. Tool results, progress messages, and internal REPL chatter stay local.

This filtering is deliberate. The external client doesn't need to see every internal message - just the conversation turns.

### Inbound: Client → REPL

Messages arrive from external clients:

```typescript
export function isSDKMessage(value: unknown): value is SDKMessage {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    typeof value.type === 'string'
  )
}
```

Three message types from clients:
- **`SDKMessage`** - User messages, tool results
- **`SDKControlRequest`** - Permission prompts, configuration changes
- **`SDKControlResponse`** - Responses to permission requests

### Echo Deduplication

The bridge uses a `BoundedUUIDSet` to prevent echo loops:

```typescript
class BoundedUUIDSet {
  private seen = new Set<string>()
  constructor(private maxSize: number) {}

  add(uuid: string): boolean {
    if (this.seen.has(uuid)) return false  // Already seen = echo
    this.seen.add(uuid)
    if (this.seen.size > this.maxSize) {
      // Evict oldest (implementation simplified)
    }
    return true
  }
}
```

If the REPL sends a message to the client, and the client echoes it back, the bridge detects it by UUID and drops the duplicate.

## Authentication

### JWT Token Management

```typescript
function createTokenRefreshScheduler({
  getAccessToken,
  onRefresh,
  label,
  refreshBufferMs = 5 * 60 * 1000,  // 5 minutes before expiry
}) {
  // Schedule refresh before token expires
  // Retry on failure (max 3 consecutive)
  // Fall back to 30-minute interval if expiry unknown
}
```

The scheduler:
1. Decodes JWT to find expiry
2. Schedules refresh 5 minutes before expiration
3. On refresh, calls `getAccessToken()` for a new token
4. Delivers new token via `onRefresh(sessionId, oauthToken)`
5. Retries up to 3 times on failure
6. Falls back to 30-minute interval if JWT has no expiry

```typescript
// Decode JWT without signature verification (transport is already TLS)
function decodeJwtPayload(token: string): unknown | null {
  const jwt = token.startsWith('sk-ant-si-')
    ? token.slice('sk-ant-si-'.length)
    : token
  const parts = jwt.split('.')
  if (parts.length !== 3 || !parts[1]) return null
  return jsonParse(Buffer.from(parts[1], 'base64url').toString('utf8'))
}
```

The `sk-ant-si-` prefix is stripped before JWT parsing. This is a session-ingress token format specific to Anthropic.

### Trusted Device Tokens

```typescript
getTrustedDeviceToken(): Promise<string | null>
```

Trusted device tokens allow reconnection without re-authentication. Stored securely on the device, used to resume sessions across restarts.

## Session Management

### Spawn Modes

```typescript
type SpawnMode = 'single-session' | 'worktree' | 'same-dir'
```

| Mode | Behavior | Use Case |
|------|----------|----------|
| `single-session` | One session, bridge dies when it ends | Quick tasks |
| `worktree` | Each session gets isolated git worktree | Parallel work |
| `same-dir` | All sessions share working directory | Simple sharing |

Worktree mode creates isolated branches for each session:

```typescript
createAgentWorktree(sessionId) → { worktreePath, branch }
// Session works in isolation
removeAgentWorktree(worktreePath) → void
// Cleanup after session ends
```

### Multi-Session

The bridge can manage multiple sessions:

```typescript
const SPAWN_SESSIONS_DEFAULT = 32
```

Up to 32 concurrent sessions (configurable). Each session is independent with its own worktree, messages, and state.

Feature-gated via GrowthBook:

```typescript
async function isMultiSessionSpawnEnabled(): Promise<boolean> {
  return checkGate_CACHED_OR_BLOCKING('tengu_ccr_bridge_multi_session')
}
```

### Session Lifecycle

```typescript
type SessionDoneStatus = 'completed' | 'failed' | 'interrupted'
type SessionActivityType = 'tool_start' | 'text' | 'result' | 'error'

type SessionActivity = {
  type: SessionActivityType
  summary: string     // "Editing src/foo.ts"
  timestamp: number
}
```

The bridge reports session activity to the client for UI display. Activity summaries are human-readable ("Editing src/foo.ts", "Running tests").

## Permission Forwarding

The bridge forwards permission prompts to the external client:

```typescript
type BridgePermissionCallbacks = {
  sendRequest(requestId, toolName, input, toolUseId, description, suggestions): void
  sendResponse(requestId, response): void
  cancelRequest(requestId): void
  onResponse(requestId, handler): () => void  // Returns unsubscribe
}

type BridgePermissionResponse = {
  behavior: 'allow' | 'deny'
  updatedInput?: Record<string, unknown>
  updatedPermissions?: PermissionUpdate[]
  message?: string
}
```

Flow:
1. Claude Code needs permission for a tool call
2. Bridge sends `sendRequest` to client
3. Client shows permission dialog in IDE/web
4. User approves/denies
5. Client calls `sendResponse` with decision
6. Bridge resolves the permission promise

The response can include:
- **`updatedInput`** - Modified tool input (e.g., sanitized command)
- **`updatedPermissions`** - New permission rules to persist
- **`message`** - Feedback about the decision

This is how permission prompts appear in VS Code's UI instead of the terminal.

## Work Secrets

Sessions are bootstrapped with a work secret:

```typescript
type WorkSecret = {
  version: number
  session_ingress_token: string
  api_base_url: string
  sources: Array<{
    type: string
    git_info?: { type: string; repo: string; ref?: string; token?: string }
  }>
  auth: Array<{ type: string; token: string }>
  claude_code_args?: Record<string, string>
  mcp_config?: unknown
  environment_variables?: Record<string, string>
}
```

The work secret contains everything needed to start a session:
- Auth tokens
- API endpoint
- Git source information
- Claude Code arguments
- MCP configuration
- Environment variables

The secret is base64url-encoded JSON, passed during session creation.

## Backoff Strategy

Connection failures use exponential backoff:

```typescript
const DEFAULT_BACKOFF: BackoffConfig = {
  connInitialMs: 2_000,       // 2 seconds
  connCapMs: 120_000,         // 2 minutes max
  connGiveUpMs: 600_000,      // 10 minutes → give up
  generalInitialMs: 500,
  generalCapMs: 30_000,
  generalGiveUpMs: 600_000,
}
```

Two backoff tracks:
- **Connection** - For establishing transport (2s → 2min, give up after 10min)
- **General** - For other operations (500ms → 30s, give up after 10min)

The bridge keeps trying for 10 minutes before giving up. This handles temporary network issues without infinite retry.

## Capacity Wake

The bridge can wake up based on capacity:

```typescript
createCapacityWake(config): CapacitySignal
```

When the server has work available, it signals the bridge. The bridge wakes up, creates a session, and starts processing. This is how claude.ai dispatches work to connected terminals.

## Flush Gate

Message batching for efficiency:

```typescript
class FlushGate {
  // Collect messages during a turn
  // Flush them as a batch when turn completes
}
```

Instead of sending each message individually, the flush gate batches messages during a turn and sends them together. This reduces HTTP/WebSocket overhead.

## Caveats

### Transport Complexity

Two transport versions (V1 polling, V2 WebSocket) means two codepaths. The hybrid transport tries V2 first, but fallback logic adds complexity.

### Echo Deduplication

The bounded UUID set prevents echo loops but has a maximum size. If the set fills up, old UUIDs are evicted, potentially allowing stale echoes through.

### JWT Without Verification

JWT tokens are decoded without signature verification:

```typescript
// Decode JWT payload without verifying signature
// Transport is already TLS, so MITM isn't a concern
```

This is safe because the transport layer (HTTPS/WSS) provides integrity. But it means the bridge trusts the network layer for token authenticity.

### Multi-Session Isolation

Worktree mode provides git isolation, but sessions share the same filesystem unless explicitly configured otherwise. `same-dir` mode has no isolation - sessions can conflict.

## Brief

The bridge system is Claude Code's external communication layer:

- **Two modes** - Standalone server and REPL bridge
- **Two transports** - WebSocket (V2) and HTTP polling (V1)
- **Message filtering** - Only conversation turns cross the bridge
- **Echo deduplication** - Bounded UUID set prevents loops
- **JWT token refresh** - Proactive refresh 5 minutes before expiry
- **Permission forwarding** - Remote clients handle permission prompts
- **Multi-session** - Up to 32 concurrent sessions with worktree isolation
- **Work secrets** - Session bootstrap data (auth, config, env vars)

What makes it work:
- **Guardrails at the transport level** - Message filtering, echo dedup
- **Graceful degradation** - V2 falls back to V1, refresh retries 3 times
- **Defense in depth** - TLS transport + JWT auth + session tokens
- **Isolation** - Worktree mode for safe parallel sessions
- **Backoff** - Exponential backoff with 10-minute give-up

The impressive part isn't the individual components (WebSocket, JWT, polling are standard). It's the integration: permission forwarding across process boundaries, echo deduplication, worktree-per-session isolation, and token refresh that survives network blips.

A bridge is only as good as its edge case handling. Claude Code handles the edge cases.

Next blog: Remote Sessions & Coordination.
