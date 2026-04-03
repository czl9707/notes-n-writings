---
title: "Learn From Claude Code: OAuth & Authentication"
description: How Claude Code handles OAuth 2.0 with PKCE, token refresh with cross-process safety, multi-environment config, and the race conditions that make distributed auth hard.
cover: media/covers/learn-from-claude-code-cover.svg
tags:
  - agent
  - ai
featured: true
created-date: 2026-04-03T00:00:00-04:00
last-updated-date: 2026-04-03T00:00:00-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: authentication — OAuth 2.0 with PKCE, token refresh with cross-process safety, and the race conditions that make distributed auth genuinely hard.

## The Problem

Claude Code runs in terminals. Users need to authenticate. The system has to handle:

1. **Browser-based login** — User clicks a link, logs in with Anthropic, gets redirected back
2. **Token refresh** — Tokens expire. They need to be refreshed before that happens
3. **Multiple processes** — User might have 3 Claude Code terminals open simultaneously
4. **Cross-process state** — All processes share the same token store (keychain/file)
5. **Headless environments** — CI/CD can't open a browser

The auth system handles all of these with specific guardrails at each decision point.

## Auth Sources

`getAuthTokenSource()` checks in priority order:

```
1. --bare mode: apiKeyHelper only (hermetic, no OAuth)
2. ANTHROPIC_AUTH_TOKEN: external auth token
3. CLAUDE_CODE_OAUTH_TOKEN: OAuth token override
4. File descriptor tokens: CCR/SDK tokens
5. apiKeyHelper: configured shell command
6. claude.ai OAuth: stored tokens with inference scope
7. none: no auth found
```

The priority matters. A user might have both `ANTHROPIC_API_KEY` set AND OAuth tokens stored. The system picks one deterministically.

`isAnthropicAuthEnabled()` gates OAuth entirely. Disabled for:
- Bare mode (`--bare`)
- SSH with Unix socket (auth injected by proxy)
- Third-party services (Bedrock/Vertex/Foundry)
- External API keys or auth tokens

This is a guardrail: the system explicitly disables OAuth when it would conflict with other auth mechanisms.

## OAuth 2.0 with PKCE

### The PKCE Pattern

```typescript
generateCodeVerifier(): base64URLEncode(randomBytes(32))
generateCodeChallenge(verifier): base64URLEncode(sha256(verifier))
generateState(): base64URLEncode(randomBytes(32))
```

Standard OAuth 2.0 with PKCE (Proof Key for Code Exchange). The flow:
1. Generate random verifier
2. Hash it → challenge
3. Send challenge to server when starting auth
4. Prove you have the verifier when exchanging the code

No client secret needed. The verifier proves you're the same client that started the flow.

### Two Auth Paths

The system runs both simultaneously:

```typescript
const manualFlowUrl = buildAuthUrl({ ...opts, isManual: true })
const automaticFlowUrl = buildAuthUrl({ ...opts, isManual: false })

// Start automatic flow in browser
openBrowser(automaticFlowUrl)

// Also show manual URL to user
showURL(manualFlowUrl)
```

**Automatic**: Browser opens → redirects to `localhost:{port}/callback?code=...` → local HTTP server captures the code

**Manual**: User visits URL in browser → copies auth code → pastes into terminal

Whichever resolves first wins. The manual path handles headless servers, remote SSH, and misconfigured browsers.

### Localhost Callback Server

`AuthCodeListener` starts a temporary HTTP server on an OS-assigned port:

```typescript
class AuthCodeListener {
  async start(port?: number): Promise<number>  // OS assigns if not specified
  async waitForAuthorization(state, onReady): Promise<string>
  handleSuccessRedirect(scopes): void  // Redirect browser to success page
}
```

Flow:
1. Start HTTP server on random port
2. Browser redirects to `http://localhost:{port}/callback?code=...&state=...`
3. Validate state parameter (CSRF protection)
4. Extract authorization code
5. Store pending response object
6. After token exchange: redirect browser to success page

The state parameter is critical — without it, an attacker could construct a malicious redirect URL that authorizes the wrong account.

### Token Installation

After OAuth completes:

```typescript
async installOAuthTokens(tokens):
  1. performLogout({ clearOnboarding: false })  // Clear old state first
  2. Fetch and store profile info
  3. saveOAuthTokensIfNeeded(tokens)            // Secure storage
  4. clearOAuthTokenCache()                     // Invalidate in-memory cache
  5. Fetch and store user roles
  6. If claude.ai auth: fetch first token date
  7. If Console auth: create and store API key
```

Step 1 matters: clear old state before saving new credentials. Without this, a partial failure could leave inconsistent state.

Steps 6-7 show two auth paths:
- **claude.ai subscribers** use OAuth tokens directly
- **Console users** get an API key created server-side

Two different backend flows from the same OAuth code.

## Token Refresh

### Proactive Refresh

Tokens expire. The system refreshes them *before* that happens:

```typescript
async checkAndRefreshOAuthTokenIfNeeded():
  1. Check if disk cache changed (another process may have refreshed)
  2. Get cached tokens
  3. If not expired → return false
  4. Clear cache, re-read from async storage
  5. If another process refreshed → return false (race resolved)
  6. Acquire lockfile
  7. Double-check after acquiring lock
  8. Call refreshOAuthToken()
  9. Save new tokens
  10. Clear cache
```

Three race condition guards:
1. **Disk cache check**: Detect if another process modified the token file
2. **Async re-read**: Another process may have refreshed while we were checking
3. **Lockfile + double-check**: Prevent concurrent refresh across processes

### Lockfile Pattern

```typescript
const lock = await lockfile.acquire('oauth-refresh', { timeout: 5000 })
if (!lock) {
  if (retryCount < MAX_RETRIES) {
    await sleep(1000 + Math.random() * 1000)
    return checkAndRefreshOAuthTokenIfNeeded(retryCount + 1)
  }
  return false
}
```

Up to 5 retries with 1-2 second random delay. The randomness prevents all processes from retrying simultaneously (thundering herd).

### In-Flight Dedup

Within a single process, multiple code paths might call refresh simultaneously:

```typescript
let pendingRefreshCheck: Promise<boolean> | null = null

function checkAndRefreshOAuthTokenIfNeeded() {
  if (pendingRefreshCheck) return pendingRefreshCheck  // Dedupe

  const promise = checkAndRefreshOAuthTokenIfNeededImpl()
  pendingRefreshCheck = promise.finally(() => {
    pendingRefreshCheck = null
  })
  return pendingRefreshCheck
}
```

Singleton promise pattern. All concurrent callers share the same promise.

### Profile Optimization

A comment in the code reveals a production optimization:

> Skip the extra /api/oauth/profile round-trip when we already have both the global-config profile fields AND the secure-storage subscription data. Routine refreshes satisfy both, so we cut ~7M req/day fleet-wide.

```typescript
const haveProfileAlready =
  config.oauthAccount?.billingType !== undefined &&
  config.oauthAccount?.accountCreatedAt !== undefined &&
  config.oauthAccount?.subscriptionCreatedAt !== undefined &&
  existing?.subscriptionType != null &&
  existing?.rateLimitTier != null
```

This is production-aware engineering. The comment explicitly quantifies the savings.

## JWT Token Refresh Scheduler

The bridge system uses a more sophisticated scheduler for long-running sessions:

```typescript
createTokenRefreshScheduler({
  getAccessToken,   // Function to get current OAuth token
  onRefresh,        // Callback when token needs refresh
  refreshBufferMs,  // Default: 5 minutes before expiry
})
```

### Timing Constants

```typescript
TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000      // Refresh 5 min before expiry
FALLBACK_REFRESH_INTERVAL_MS = 30 * 60 * 1000  // 30 min fallback
MAX_REFRESH_FAILURES = 3
REFRESH_RETRY_DELAY_MS = 60_000              // 1 min retry delay
```

After a refresh, a fallback timer is scheduled at 30 minutes. This ensures long-running sessions (days/weeks) stay authenticated even if the JWT expiry is miscalculated.

### Generation Counter

The cleverest pattern in the scheduler:

```typescript
const generations = new Map<string, number>()

function nextGeneration(sessionId): number {
  const gen = (generations.get(sessionId) ?? 0) + 1
  generations.set(sessionId, gen)
  return gen
}
```

Every `schedule()` or `cancel()` bumps the generation. When the async `doRefresh()` completes, it checks if its generation is still current:

```typescript
if (generations.get(sessionId) !== gen) {
  // Stale — session was rescheduled or cancelled during async gap
  return
}
```

This prevents orphaned timers. If a token is refreshed multiple times quickly, only the latest refresh's follow-up timer is kept.

## Expiry Check

```typescript
function isOAuthTokenExpired(expiresAt): boolean {
  const bufferTime = 5 * 60 * 1000  // 5 minute buffer
  return (Date.now() + bufferTime) >= expiresAt
}
```

5-minute buffer before actual expiry. Tokens are refreshed before they fail. The buffer matches the JWT refresh scheduler's buffer.

## 401 Recovery

When the API returns 401:

```typescript
handleOAuth401Error(failedAccessToken):
  1. Clear caches
  2. Re-read tokens async from secure storage
  3. If different token available → recovered (another process refreshed)
  4. If same token → force refresh (bypass local expiry check)
```

The force flag bypasses the local expiry check. The server says the token is invalid — trust the server over local calculations.

## Multi-Environment Config

Three environments with explicit config:

```typescript
// Production
PROD_OAUTH_CONFIG = {
  BASE_API_URL: 'https://api.anthropic.com',
  CONSOLE_AUTHORIZE_URL: 'https://platform.claude.com/oauth/authorize',
  CLIENT_ID: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
  // ...
}

// Staging (ant-only)
STAGING_OAUTH_CONFIG = { /* staging.ant.dev */ }

// Local dev
getLocalOauthConfig() { /* localhost:8000/4000/3000 */ }
```

Plus a custom override for FedStart/PubSec:

```typescript
const ALLOWED_OAUTH_BASE_URLS = [
  'https://claude.fedstart.com',
  'https://claude-staging.fedstart.com',
]

if (oauthBaseUrl && !ALLOWED_OAUTH_BASE_URLS.includes(oauthBaseUrl)) {
  throw new Error('CLAUDE_CODE_CUSTOM_OAUTH_URL is not an approved endpoint.')
}
```

Allowlisting prevents credential leakage to arbitrary endpoints. The comment is explicit: "Only FedStart/PubSec deployments are permitted to prevent OAuth tokens from being sent to arbitrary endpoints."

## Headless Login

For CI/CD:

```bash
export CLAUDE_CODE_OAUTH_REFRESH_TOKEN=...
export CLAUDE_CODE_OAUTH_SCOPES="user:inference user:profile"
claude auth login  # No browser needed
```

The code:

```typescript
const envRefreshToken = process.env.CLAUDE_CODE_OAUTH_REFRESH_TOKEN
if (envRefreshToken) {
  const scopes = process.env.CLAUDE_CODE_OAUTH_SCOPES.split(/\s+/)
  const tokens = await refreshOAuthToken(envRefreshToken, { scopes })
  await installOAuthTokens(tokens)
  // Skip browser flow entirely
}
```

Both env vars are required. The scopes are necessary because the refresh token might have been issued with different scopes than the current session needs.

## Scopes

Two auth paths produce different scopes:

```typescript
CONSOLE_OAUTH_SCOPES = ['org:create_api_key', 'user:profile']
CLAUDE_AI_OAUTH_SCOPES = [
  'user:profile', 'user:inference',
  'user:sessions:claude_code',
  'user:mcp_servers', 'user:file_upload',
]
```

`shouldUseClaudeAIAuth(scopes)` checks for `user:inference`. That single scope determines whether the user gets direct inference (claude.ai subscriber) or needs an API key (Console user).

## Caveats

### No Signature Verification

JWT decoding doesn't verify signatures:

```typescript
function decodeJwtPayload(token): unknown | null {
  const parts = jwt.split('.')
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString())
}
```

This is fine for reading claims locally (expiry, etc.) but shouldn't be trusted for security decisions. The API verifies the actual token.

### Lockfile Timeout

The lockfile has a 5-second timeout. Under extreme contention (many processes, slow storage), refresh could fail. The retry logic helps, but there's an upper bound.

### Browser Dependency

Automatic flow requires a browser. For truly headless environments (no browser installed), manual flow or env var login is required.

## Brief

OAuth & authentication in Claude Code is a distributed system with specific guardrails:

1. **PKCE flow** — Standard OAuth 2.0, no client secret, dual automatic/manual paths
2. **Lockfile for cross-process safety** — Multiple processes share token store, lockfile prevents concurrent refresh
3. **Generation counter for timer safety** — Prevents orphaned timers from stale async callbacks
4. **Multi-environment config** — prod/staging/local/custom, allowlisted to prevent credential leakage
5. **Proactive refresh** — 5-minute buffer before expiry, fallback timer for long sessions
6. **Race condition guards** — Disk cache check, async re-read, in-flight dedup, lockfile double-check
7. **Headless login** — Environment variable refresh tokens for CI/CD

What makes this impressive isn't the OAuth code itself — that's standard. It's the production hardening:
- "~7M req/day fleet-wide" optimization by caching profile data
- Lockfile + generation counter + in-flight dedup to handle concurrent processes
- Allowlisted custom URLs to prevent credential leakage
- 401 recovery that trusts server over local calculations
- Buffer times that match across expiry checks and refresh schedulers

Each guardrail addresses a specific production issue. The code reads like a log of incidents that happened and were handled.

---

This concludes the Claude Code architecture blog series. The recurring theme: impressive systems aren't impressive because of clever algorithms. They're impressive because of the guardrails — the specific, deliberate constraints that make distributed systems behave predictably.
