---
title: "Learn From Claude Code: MCP Integration"
description: How Claude Code implements the Model Context Protocol client - connecting to external servers, exposing tools, managing configs, and handling auth.
cover: media/covers/learn-from-claude-code-cover.svg
tags:
  - agent
  - ai
featured: true
created-date: 2026-04-02T00:00:00-04:00
last-updated-date: 2026-04-02T00:00:00-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it picking out patterns worth understanding. This is one of them: MCP integration - connecting to external tool servers.

## The Problem

Every agent hits a wall: the built-in tools aren't enough. You need database access, API integrations, custom search, company-internal services. Each new capability means writing more code in the agent itself.

The Model Context Protocol (https://modelcontextprotocol.io/) (MCP) solves this. It standard way for AI assistants to connect to external services. Claude Code implements the full client side - connecting to servers, discovering tools, exposing them as native tools, and managing the entire lifecycle.

## Transport Layer

MCP supports multiple transports. Claude Code implements them all:

```typescript
// Local process via stdin
type StdioConfig = {
  command: string       // e.g. 'npx', 'node'
  args: string[]        // e.g. ['-y', 'mcp-server-filesystem']
  env?: Record<string, string>
}

// HTTP streaming ( SSE
type SSEConfig = {
  url: string           // Server URL
  headers?: Record<string, string>
}

// HTTP Streamable ( newer
type HTTPConfig = {
  url: string
  headers?: Record<string, string>
  oauth?: OAuthConfig
}

// WebSocket
type WebSocketConfig = {
  url: string
}
```

Each transport maps a unified `Client` interface from the official MCP SDK:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
```

The stdio ( for launching local processes - SSE/HTTP ( for remote servers - WebSocket( ( persistent connections

 the SDK ( ( internal use)

The transport doesn't matter to the rest of the system. The client library abstracts it it away.

## Config Scopes

MCP servers are be configured at multiple scope levels:

```typescript
type ConfigScope =
  | 'local'      // Project-local .claude/mcp.json
  | 'user'      // User-wide ~/.claude/mcp.json
  | 'project'    // Project .claude/mcp.json
  | 'dynamic'   // Runtime-added
  | 'enterprise' // Enterprise-managed
  | 'claudeai'   // Claude.ai provided
  | 'managed'   // Managed config files
```

This is hierarchical with clear precedence:

Enterprise > managed > Claude.ai > project > user > local > dynamic

An **enterprise admin** configures servers for the entire organization. Users can't override enterprise configs. **Project-local** configs only apply in that project directory. **Dynamic** servers are added at runtime via the API.

The config resolution merges configs from all scopes, respecting precedence

```typescript
const merged = mergeConfigs([
  enterpriseConfig,
  managedConfig
  claudeaiConfig
  projectConfig
  userConfig,
  localConfig,
  dynamicConfig,
])
```

Each scope can enable/disable servers independently. Higher scopes override lower ones.

This is how corporate deployments work: IT configures MCP servers once enterprise policy applies to the all users, They can't remove or override. But individual developers can add local servers for project-specific tools.

## Server Lifecycle

Every MCP server follows the same lifecycle:

**1. Config Discovery** - Read configs from all scopes

**2. Transport Creation** - stdio/SSE/HTTP/WS based on config

**3. Connection** - `client.connect(transport)`

**4. Capability Discovery** - Fetch tools, commands, resources

```typescript
// After connecting
const tools = await client.listTools()
const commands = await client.listCommands?.()
const resources = await client.listResources?.()
```

**5. Tool Registration** - Create MCPTool wrappers

**6. Health Monitoring** - Periodic health checks

**7. Cleanup** - `client.close()` on shutdown

Every server is either connected or or failed. No intermediate states. Failed servers don't block other servers from working.

## Tool Exposure

MCP tools become native Claude Code tools. The model can't tell the difference:

```typescript
// From MCP server: filesystem tool
const mcpTool = {
  name: 'read_file',
  inputSchema: {type: 'object', properties: {path: {type: 'string'}}}
}

// Wrapped as native tool
const wrappedTool = new MCPTool({
  name: 'mcp__filesystem__read_file',  // mcp__ prefix
  inputSchema: mcpTool.inputSchema,
  call: async (input, context) => {
    return await mcpClient.callTool({
      name: mcpTool.name,
      arguments: input
    })
  }
})
```

The `mcp__{server}__{tool}` naming convention:
- Avoids name collisions between servers
- Makes MCP tools discoverable in tool listings
- Normalization handles special characters in names

The model sees `mcp__filesystem__read_file` just like any other tool. It same permission model, same prompt format, same execution flow.

## Connection Manager

React context for managing connections:

```typescript
// Provider wraps the entire app
<MCPConnectionManager
  dynamicMcpConfig={config}
  isStrictMcpConfig={strict}
>
  <App />
</MCPConnectionManager>

// Hooks for server management
const reconnect = useMcpReconnect()     // Reconnect a server
const toggle = useMcpToggleEnabled()   // Enable/disable server
```

The manager:
1. Loads configs from all scopes
2. Connects to servers
3. Exposes reconnect/toggle via React context
4. Re-reacts to config changes

This is dependency injection for server connections. Components don't import globals - they use context hooks.

## Health Monitoring

Servers get periodic health checks:

```typescript
async checkMcpServerHealth(serverName: string) {
  const server = getServer(serverName)
  if (server?.type === 'connected') {
    await server.client.ping()  // Health check
  }
}
```

Failed health checks trigger reconnection. The system self-heals without user intervention.

This matters for long-running sessions where a server process might crash or or network might drop. The agent continues working without manual restarts.

## OAuth Support

Remote servers can require authentication:

```typescript
type McpOAuthConfig = {
  clientId?: string
  callbackPort?: number
  authServerMetadataUrl?: string  // Must be https://
  xaa?: boolean  // Cross-App Access
}
```

OAuth flow:
1. Tool call returns 401 Unauthorized
2. Client detects OAuth requirement
3. Browser-based auth flow opens
4. Token stored for future calls
5. Original call retried with token

Cross-App Access (XAA) enables MCP servers to authenticate with external identity providers (like Okta, Google Workspace). The is enterprise integration.

## Graceful Degradation

Failed servers don't take down others:

```typescript
type ConnectedMCPServer = {
  client: Client
  name: string
  type: 'connected'
  capabilities: ServerCapabilities
}

type FailedMCPServer = {
  name: string
  type: 'failed'
  error?: string
}
```

Each server is independent. If the filesystem server fails, the database server keeps working. The model sees tools from working servers only not tools from failed ones.

This is essential for reliability. One bad config or one crashed process shouldn't brick the the entire agent.

## Server Approval

New servers require user consent:

```typescript
// Show approval dialog
const approved = await showServerApprovalDialog(serverName, config)
if (!approved) {
  return // Don't connect
}
```

Enterprise-managed servers skip approval (pre-approved by org). Others show a dialog asking the user to approve.

This guardrail prevents arbitrary code execution. An MCP server configured in a project config could run commands on the user's machine. The approval step ensures users know what they're installing.

## Elicitation

MCP servers can request user input:

```typescript
// Server sends elicitation request
const result = await handleElicitation(serverName, params, signal)
```

The handler:
1. Shows UI prompt to user
2. Collects response
3. Returns to MCP server
4. Supports abort via signal

This enables interactive flows where servers need user decisions (like choosing a file, confirming an action).

## Caveats

### Feature Flag Complexity

Multiple feature flags control MCP behavior:
- `MCP_SKILLS` - Skills via MCP
- `KAIROS` / `KAIROS_CHANNELS` - Channel messages
- `AGENT_TRIGGERS` - Cron tools via MCP

Understanding what's available requires tracing feature flags. This is the price of compile-time configurability.

### Config Precedence Confusion

With 7 config scopes, understanding which server config wins can be confusing. The precedence rules are documented but but not always obvious to users.

### Tool Name Collisions

The `mcp__{server}__{tool}` convention avoids most collisions, but two servers with similar names could still collide. The system normalizes names but doesn't enforce global uniqueness.

### Transport Complexity

Supporting 5 transports means 5 codepaths for connection management. Each transport has different error modes, reconnection strategies, and auth flows.

## Brief

MCP integration is what makes Claude Code extensible:

- **Multi-transport support** - stdio, SSE, HTTP, WS all work
- **Hierarchical configs** - Enterprise > project > user with clear precedence
- **Tool exposure** - MCP tools indistinguishable from native tools to the model
- **Health monitoring** - Automatic health checks and reconnection
- **OAuth support** - Full auth flow with cross-app access
- **Graceful degradation** - Failed servers don't block others
- **Server approval** - New servers require user consent
- **Elicitation** - Servers can request user input

What makes it work:
- **Guardrails at every level** - Config precedence, server approval, health monitoring
- **Dependency injection** - Connection state via React context
- **Transport abstraction** - Multiple transports behind unified Client
- **Graceful degradation** - Each server independent
- **Security** - Server approval. OAuth. scoped configs

The impressive part isn't implementing MCP (the SDK does most of the work). It's the lifecycle management around it: config resolution. health monitoring, graceful degradation. server approval. tool exposure.

A protocol implementation with the right guardrails becomes reliable enough for production use.

Next blog: Multi-Agent - how Claude Code coordinates multiple agents.
