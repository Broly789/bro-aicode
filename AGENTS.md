# Brocode

Bun workspaces monorepo (`apps/*`). Two packages under `apps/`.

## Packages

| package | path | entry | framework |
|---------|------|-------|-----------|
| `@brocode/cli` | `apps/cli` | `src/index.tsx` | OpenTUI (React) |
| `@brocode/server` | `apps/server` | `src/index.ts` | Hono |
| `@brocode/shared` | `packages/shared` | `src/index.ts` | — |

## Workspace dependency setup

To add `@brocode/shared` to an app, declare it in the app's `package.json`:

```json
"dependencies": {
  "@brocode/shared": "workspace:*"
}
```

Bun resolves `workspace:*` to the local `packages/shared` package via symlink. No `npm publish` needed — changes in `packages/shared` are instantly visible to consumers. Root `workspaces` must include `"packages/*"` for this to work.

## Commands

```sh
bun run dev          # runs both concurrently (&)
bun run dev:cli      # bun --watch run apps/cli/src/index.tsx
bun run dev:server   # bun run --hot apps/server/src/index.ts
bun run build        # bun build apps/cli/src/index.tsx --target bun
```

## Quirks

- **No CI / tests / lint / typecheck** — project is scaffold-only. The `build` script will fail due to `@opentui/core` missing cross-platform native binaries (known issue, not a breakage).
- **`bun.lock` is gitignored** — unusual but intentional per `.gitignore`.
- **`tsconfig.json` overrides**: `apps/cli/tsconfig.json` uses `NodeNext` module (overrides root `ESNext`/`bundler`). `apps/server/tsconfig.json` uses `hono/jsx` (overrides root `@opentui/react`).
- **Bun workspace hoisting**: each workspace has its own `node_modules/` with symlinks to the `.bun/` virtual store. Not traditional flat hoisting.
- **No `bin` field** in `cli/package.json` yet — CLI isn't set up for direct execution (`#!/usr/bin/env bun` not present).

## Root scripts inconsistency

Root `package.json` uses **two different patterns** for invoking workspace scripts:

| script | pattern | example |
|--------|---------|---------|
| `dev:cli` / `build:cli` | `--cwd "$PWD/apps/cli"` | `bun run --cwd "$PWD/apps/cli" dev` |
| `dev:server` | `--filter @brocode/server` | `bun run --filter @brocode/server dev` |

**Why?** OpenTUI is a full-screen TUI framework that requires raw terminal mode. `bun run --filter` wraps the process in a way that can interfere with terminal raw mode / stdin handling. `--cwd` runs the command directly in the package directory, preserving proper TTY attachment for TUI rendering. For Hono (HTTP server), `--filter` works fine since it doesn't need terminal interaction. If migrating CLI to `--filter`, verify that terminal mode isn't broken. The `dev` script's `&` concurrent runner depends on script name strings, not flags.

## CLI Routing

`@brocode/cli` uses `react-router` v8 with `createMemoryRouter` (no browser URL since this is a TUI).

### Route structure

Routes are defined in `apps/cli/src/router.tsx` as a single `createMemoryRouter` call. All routes are children of `RootLayout` which provides header/footer chrome and keyboard navigation.

| Key | Path | Component | Description |
|-----|------|-----------|-------------|
| `1` | `/` | `screens/Home` | Main screen — AsciiArt + TextArea |
| `2` | `/chat` | `screens/Chat` | Chat/messages screen |
| `3` | `/about` | `screens/About` | Project info |
| `4` | `/settings` | `screens/Settings` | Configuration |
| `*` | — | `screens/NotFound` | Catch-all 404 |

### Adding a new screen

1. Create `src/screens/Foo.tsx` exporting a default component
2. Add route to `src/router.tsx` under the root route's `children` array
3. Add keyboard shortcut in `src/layouts/RootLayout.tsx` (both `useKeyboard` handler and `navItems` array)

### Keeping screens minimal

Screens should be presentational — no data-fetching, no routing logic. The `RootLayout` owns all keyboard navigation and chrome. Screens receive no props and render directly into `<Outlet />`.

### Reading location.state

Always parse `location.state` with a zod schema instead of inline casts or explicit types:

```ts
const RouteState = z.object({
  prompt: z.string().default(''),
})

const { prompt } = RouteState.parse(location.state ?? {})
```

This applies to **all apps** (CLI and server alike). Using zod gives you:
- **Single source of truth** for the shape — no type/interface to maintain separately
- **Defaults in the schema** via `.default()` — no `?? ''` scattered in the component
- **Runtime validation** — catches unexpected `null`/`undefined`/wrong types early
- **Zod v4** syntax used throughout — `z.object({ ... }).parse(...)` with `.default()` for optional fields

Do NOT use inline casts or separate interface types:

```ts
// ❌ Avoid
const value = (location.state as { prompt?: string })?.prompt ?? ''
type ChatRouteState = { prompt?: string }
```

### Key imports

```ts
import { TextAttributes, type KeyEvent } from '@opentui/core'
import { useKeyboard, useRenderer } from '@opentui/react'
import { createMemoryRouter, RouterProvider, Outlet, useNavigate, useLocation } from 'react-router'
```

## Server RPC (Hono Client)

`@brocode/server` exports a typed `AppType` via Hono's RPC mechanism. Routes **must be chained** in the server for type inference to work (`app.get(...).get(...)`).

### Client setup

```ts
// apps/cli/src/lib/client.ts
import { hc } from "hono/client"
import type { AppType } from "@brocode/server"

const serverUrl = process.env.SERVER_URL ?? "http://localhost:3000"
export const client = hc<AppType>(serverUrl)
```

### Usage

Import the typed client from any screen or component:

```ts
import { client } from "../lib/client"

// GET / — typed response
const res = await client.index.$get()
const text = await res.text()

// GET /api/health — typed response
const res = await client.api.health.$get()
const data = await res.json()
// data.status is typed as string
```

### Adding a new typed endpoint

1. Add a chained route in `apps/server/src/index.ts`
2. `AppType` updates automatically — no manual type sync
3. The client in `apps/cli/src/lib/client.ts` picks up the new endpoint with full type inference

### Using RPC URL with `useChat`

When integrating `@ai-sdk/react`'s `useChat` with a Hono RPC endpoint, use `$url()` to get the typed URL instead of hardcoding a string:

```ts
import { client } from "../lib/client"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

const { messages, sendMessage, status, error } = useChat({
  transport: new DefaultChatTransport({
    api: client.api.chat.$url().toString(),
  }),
})
```

The `$url()` method returns a typed URL derived from the Hono route definition. This keeps the API URL in sync with the server's route structure — if the path changes on the server, the client URL updates automatically via `AppType`.

### Key imports

```ts
import { hc, type InferRequestType, type InferResponseType } from "hono/client"
import type { AppType } from "@brocode/server"
```
