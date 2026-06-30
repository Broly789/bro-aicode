# brocode

Bun workspaces monorepo — a terminal UI chat application powered by AI.

## Structure

| package | path | description |
|---------|------|-------------|
| `@brocode/cli` | `apps/cli` | Terminal UI (OpenTUI) with AI chat |
| `@brocode/server` | `apps/server` | Hono HTTP server (DeepSeek API) |
| `@brocode/shared` | `packages/shared` | Shared utilities |

## Getting Started

```sh
bun install
bun run dev
```

Runs the server and CLI concurrently. The CLI opens a full-screen TUI in your terminal.

## Commands

| command | description |
|---------|-------------|
| `bun run dev` | Run both server and CLI |
| `bun run dev:server` | Run server only (hot reload) |
| `bun run dev:cli` | Run CLI only (watch mode) |
| `bun run build` | Build CLI binary |

## Stack

- **Runtime**: Bun
- **CLI**: OpenTUI (React), react-router v8, Hono RPC client
- **Server**: Hono, AI SDK, DeepSeek
- **AI**: `@ai-sdk/react` (`useChat`), `@ai-sdk/deepseek`
