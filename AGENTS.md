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
