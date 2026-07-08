# Brocode

Bun workspaces monorepo (`apps/*`, `packages/*`).

## Packages

| package | path | entry | framework |
|---------|------|-------|-----------|
| `@brocode/cli` | `apps/cli` | `src/index.tsx` | OpenTUI (React) |
| `@brocode/server` | `apps/server` | `src/index.ts` | Hono |
| `@brocode/database` | `packages/database` | `src/index.ts` | Prisma (Postgres) |
| `@brocode/ai` | `packages/ai` | `src/index.ts` (shared), `./server` (agent), `./client` (runners) | — |
| `@brocode/shared` | `packages/shared` | `src/index.ts` | — |

## Workspace dependency setup

To add a workspace package to an app, declare it in the app's `package.json`:

```json
"dependencies": {
  "@brocode/database": "workspace:*"
}
```

Bun resolves `workspace:*` to the local package via symlink. No `npm publish` needed. Root `workspaces` must include `"packages/*"` for this to work.

## Commands

```sh
bun run dev            # runs server + cli concurrently (&)
bun run dev:cli        # bun --watch run apps/cli/src/index.tsx
bun run dev:server     # bun run --hot apps/server/src/index.ts
bun run build          # bun build apps/cli/src/index.tsx --target bun
bun run db:generate    # prisma generate (via proxy to packages/database)
bun run db:push        # prisma db push
bun run db:migrate     # prisma migrate dev
bun run db:deploy      # prisma migrate deploy
bun run db:studio      # prisma studio
```

## Database

Prisma schema lives in `packages/database/prisma/schema.prisma`. Generated client outputs to `packages/database/generated/` and is re-exported via `packages/database/src/index.ts`.

**Consumers:**
- `@brocode/server` — instantiates PrismaClient with `@prisma/adapter-pg` for runtime queries
- `@brocode/cli` — imports only the generated types (`Session`, `Message`, etc.)

**Singleton pattern** in `apps/server/src/lib/db.ts` uses globalThis caching to survive Bun `--hot` reloads without exhausting connection pools.

**Chat persistence flow:**
1. Client sends `POST /api/chat` with `{ sessionId, messages }`
2. Server saves incoming user messages to DB
3. `streamText` streams the AI response
4. `onFinish` callback saves assistant messages (text + reasoning + tool calls/results) to DB
5. Messages store `parts` as JSON (`UIMessagePart[]`) — source of truth for the conversation

## Quirks

- **No CI / tests / lint / typecheck** — project is scaffold-only. The `build` script will fail due to `@opentui/core` missing cross-platform native binaries (known issue, not a breakage).
- **`bun.lock` is gitignored** — unusual but intentional per `.gitignore`.
- **`tsconfig.json` overrides**: `apps/cli/tsconfig.json` uses `NodeNext` module (overrides root `ESNext`/`bundler`). `apps/server/tsconfig.json` uses `hono/jsx` (overrides root `@opentui/react`).
- **Bun workspace hoisting**: each workspace has its own `node_modules/` with symlinks to the `.bun/` virtual store. Not traditional flat hoisting.
- **No `bin` field** in `cli/package.json` yet — CLI isn't set up for direct execution (`#!/usr/bin/env bun` not present).

## OpenTUI Tool Rendering Pitfalls

Four common `TextNodeRenderable` / tool rendering bugs and their fixes:

### 1. `<text>` inside `<text>` causes "TextNodeRenderable only accepts strings"

**Error**: `TextNodeRenderable only accepts strings, TextNodeRenderable instances, or StyledText instances`

**Cause**: OpenTUI React's `<text>` (backed by `TextRenderable`) only accepts strings, `<span>`/`<b>`/`<i>`/`<u>`/`<br>`/`<a>` (backed by `TextNodeRenderable` subclasses) as children. Nesting `<text>` inside `<text>` creates a `TextRenderable` child, which is rejected.

**Fix**: Use `<span>` instead of nested `<text>`:
```tsx
// ❌ Wrong
<text>
  <text fg="green">Y</text>
  <text>es</text>
</text>

// ✅ Correct
<text>
  <span fg="green">Y</span>
  <span>es</span>
</text>
```

### 2. ToolConfirm rendered in `height={1}` status bar

**Cause**: `ToolConfirm` (a multi-line bordered box) was placed inside `<box height={1} paddingLeft={1}>` in `ChatShell`, making it invisible/deformed.

**Fix**: Render `ToolConfirm` outside the status bar, between the scrollbox and status bar area.

### 3. Tool executors use wrong working directory

**Cause**: `bun run --cwd "$PWD/apps/cli"` changes the process CWD to `apps/cli/`. Tool executors used `process.cwd()` as the base directory, so `bash`, `readFile`, etc. operated relative to `apps/cli/` instead of the project root.

**Fix**: Pass `PROJECT_ROOT=$PWD` in the script (`dev:cli`) and use `process.env.PROJECT_ROOT || process.cwd()` in `executor.ts`:
```sh
# package.json
"dev:cli": "PROJECT_ROOT=$PWD bun run --cwd \"$PWD/apps/cli\" dev"
```
```ts
// executor.ts
const projectRoot = process.env.PROJECT_ROOT || process.cwd()
```

### 4. AI output with HTML tags strips formatting

**Cause**: `stripHtml()` in `ChatMessage.tsx` used `s.replace(/<[^>]*>/g, '')` which removed all HTML tags without preserving formatting intent.

**Fix**: Convert common HTML tags to markdown equivalents before stripping:
```ts
s.replace(/<h2>/gi, '## ').replace(/<\/h2>/gi, '')
 .replace(/<b>/gi, '**').replace(/<\/b>/gi, '**')
 // ... then strip remaining unknown tags
```

### 5. Confirmation Y/N key leaks into ChatTextArea

**Cause**: During `confirming` state, `ChatTextArea` was only disabled when `status === 'streaming'`, so Y/N keypresses were captured by both `ToolConfirm` and the textarea.

**Fix**: Also disable ChatTextArea during confirmation:
```ts
const isInputDisabled = status === 'streaming' || status === 'confirming'
// ...
<ChatTextArea onSubmit={onSubmit} disabled={isInputDisabled} />
```

## Root scripts inconsistency

Root `package.json` uses **two different patterns** for invoking workspace scripts:

| script | pattern | example |
|--------|---------|---------|
| `dev:cli` / `build:cli` | `--cwd "$PWD/apps/cli"` | `bun run --cwd "$PWD/apps/cli" dev` |
| `dev:server` | `--filter @brocode/server` | `bun run --filter @brocode/server dev` |

**Why?** OpenTUI is a full-screen TUI framework that requires raw terminal mode. `bun run --filter` wraps the process in a way that can interfere with terminal raw mode / stdin handling. `--cwd` runs the command directly in the package directory, preserving proper TTY attachment for TUI rendering. For Hono (HTTP server), `--filter` works fine since it doesn't need terminal interaction. If migrating CLI to `--filter`, verify that terminal mode isn't broken. The `dev` script's `&` concurrent runner depends on script name strings, not flags.

## Console Overlay (调试日志面板)

OpenTUI 内置 Console Overlay，捕获所有 `console.*` 输出并显示在终端面板里。

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+`` ` | 开关 console 面板 |
| `Ctrl+L` | 清空面板日志 |
| `+` / `-` | 面板内调整大小（面板需获得焦点） |
| 方向键 | 面板内滚动日志 |

### 配置

`apps/cli/src/index.tsx`:
```ts
import { createCliRenderer, ConsolePosition } from '@opentui/core'

const renderer = await createCliRenderer({
  consoleOptions: {
    position: ConsolePosition.BOTTOM,  // TOP / BOTTOM / LEFT / RIGHT
    sizePercent: 30,                    // 占终端百分比
  },
})
```

面板默认隐藏，按 `Ctrl+`` ` 打开。

### 环境变量

| 变量 | 作用 |
|------|------|
| `SHOW_CONSOLE=true` | 启动时自动打开面板（默认关闭） |
| `OTUI_USE_CONSOLE=false` | 完全禁用 console 捕获 |

---

## Logger 用法

`packages/ai/src/lib/logger.ts` 提供通用日志模块，支持全局调用（无需 import）。

### 签名

```ts
// 2 参数：日志文件名 + 消息
logger(module: string, msg: unknown): void

// 3 参数：日志文件名 + 标记名 + 实体对象
logger(module: string, tag: string, entity?: unknown): void
```

- `module` — 日志文件名，写入 `logs/{module}.log`（如 `'search'` → `logs/search.log`）
- `tag` — 标记名，标注当前操作（如 `'fetch'`、`'open'`）
- `entity` — 实体对象，自动 JSON 序列化

### 示例

```ts
// 简单文本 → logs/search.log
logger('search', 'Trying baidu...')

// 带标记名 + 对象
logger('search', 'fetch', { url: 'https://...', status: 200 })
logger('session', 'open', { id: '123', title: 'test' })
logger('ai', item.id, item)

// 不同模块写入不同文件
logger('agent', 'Tool call received')    // → logs/agent.log
logger('db', 'Connection established')   // → logs/db.log
```

### 输出格式

```
[2026/07/08 15:30:45] [search] fetch { "url": "...", "status": 200 }
[2026/07/08 15:30:45] [session] open { "id": "123", "title": "test" }
```

### 文件日志

设置 `SEARCH_LOG=true` 同时写入 `logs/{module}.log`。

```bash
tail -f logs/search.log     # 实时监控
tail -20 logs/search.log    # 最近 20 条
grep "baidu" logs/search.log # 按引擎过滤
> logs/search.log            # 清空日志
```

### 关键文件

| 文件 | 用途 |
|------|------|
| `packages/ai/src/lib/logger.ts` | logger 实现，写文件 + console.log（面板显示） |
| `packages/ai/src/global.d.ts` | `globalThis.logger` 类型声明 |

---

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

### Rule: all API requests must use Hono RPC

Every API request in the codebase **must** go through the typed Hono client (`client.*`). Never construct URLs with string interpolation or `process.env.SERVER_URL`. If an endpoint doesn't exist on the server yet, add it first — do not fall back to a raw URL.

```ts
// ✅ Correct — typed, auto-synced with server
const res = await client.api.sessions.$post({})
const data = await client.api.sessions[':sessionId'].messages.$get({ param: { sessionId } })

// ❌ Wrong — hardcoded URL, breaks on path changes
const res = await fetch(`${serverUrl}/api/sessions`)
```

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

// POST /api/sessions — typed response
const res = await client.api.sessions.$post({})
const { id } = await res.json()

// GET /api/sessions/:sessionId/messages — typed with path param
const res = await client.api.sessions[':sessionId'].messages.$get({ param: { sessionId } })
const data = await res.json()
```

### Adding a new typed endpoint

1. Create the route file in `apps/server/src/routes/`
2. Import and chain it in `apps/server/src/index.ts`
3. `AppType` updates automatically — no manual type sync
4. The client in `apps/cli/src/lib/client.ts` picks up the new endpoint with full type inference

### Using `$url()` with AI SDK hooks (`useChat`, `useCompletion`)

When passing an API URL to `useChat` or `useCompletion`, use `$url()` to get the typed URL instead of hardcoding a string. For routes with path parameters, pass the params to `$url()`:

```ts
import { client } from "../lib/client"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

// With path params (e.g. /api/chat/:sessionId)
const { messages, sendMessage, status, error } = useChat({
  transport: new DefaultChatTransport({
    api: client.api.chat[':sessionId'].$url({ param: { sessionId } }).toString(),
  }),
})

// Without path params (e.g. /api/llm-test)
const { completion, complete } = useCompletion({
  api: client.api['llm-test'].$url().toString(),
})
```

The `$url()` method returns a typed URL derived from the Hono route definition. This keeps the API URL in sync with the server's route structure — if the path changes on the server, the client URL updates automatically via `AppType`.

### Key imports

```ts
import { hc, type InferRequestType, type InferResponseType } from "hono/client"
import type { AppType } from "@brocode/server"
```

## Web Search Integration

`@brocode/ai` provides a `search()` tool for real-time web search. Execution runs on the **CLI side** (via `packages/ai/src/tools/runners.ts` → `search/runtime.ts`), not the server.

### Supported engines

| Engine | Best for | Free tier | API key env var | Docs |
|--------|----------|-----------|-----------------|------|
| [Baidu AI Search](https://cloud.baidu.com/doc/qianfan-api/s/Wmbq4z7e5) | Chinese content, news, entertainment | 50 次/天 | `BAIDU_API_KEY` | [API 文档](https://cloud.baidu.com/doc/qianfan-api/s/Wmbq4z7e5) |
| [Tavily](https://tavily.com/) | International content, AI-optimized search | 1,000 次/月 | `TAVILY_API_KEY` | [API 文档](https://docs.tavily.com/) |
| Scraper (fallback) | When APIs fail | unlimited | none | — |

**Engine intros:**

- **Baidu AI Search (千帆 AI Search)** — 百度官方搜索 API，基于百度搜索大数据，返回结构化的网页引用（references）。对中文内容（娱乐、新闻、百科）质量极高，支持时效性过滤。认证方式为 `Authorization: Bearer <api_key>`，接口 `POST /v2/ai_search/web_search`。免费额度 50 次/天（按天发放，用完当天需等次日or开通付费），1,500 次/月。[额度查询](https://console.bce.baidu.com/qianfan/studio/resource)

- **Tavily** — AI 专用搜索引擎，专为 LLM RAG 场景优化。返回干净的文本内容 + AI 生成的 Answer 摘要，无需二次抓取。适合英文/国际内容查询。免费额度 1,000 次/月，支持 `basic` 和 `advanced` 两种搜索深度。[额度查询](https://app.tavily.com/home)

### Configuration

Set keys in root `.env.local` (also symlinked to `apps/cli/.env.local`):

```bash
TAVILY_API_KEY="tvly-dev-..."
BAIDU_API_KEY="bce-v3/..."
# SEARCH_PRIORITY: tavily | baidu | (empty = smart routing)
SEARCH_PRIORITY=
# SEARCH_LOG: true = enable file logging, false or empty = disable
SEARCH_LOG=true
# 搜索 API 地址（一般无需修改）
SEARCH_URL_TAVILY="https://api.tavily.com/search"
SEARCH_URL_BAIDU="https://qianfan.baidubce.com/v2/ai_search/web_search"
# 兜底爬虫 URL（{q} 会被替换为搜索词）
SCRAPER_URL_BING="https://www.bing.com/search?q={q}&cc=cn"
SCRAPER_URL_DUCKDUCKGO="https://html.duckduckgo.com/html/?q={q}"
SCRAPER_URL_BAIDU="https://www.baidu.com/s?wd={q}"
SCRAPER_URL_SOGOU="https://www.sogou.com/web?query={q}"
SCRAPER_URL_GOOGLE="https://www.google.com/search?q={q}&hl=zh-CN"
```

**Smart routing** (default): Chinese queries → Baidu first, English → Tavily first.  
**Manual override**: Set `SEARCH_PRIORITY=tavily` or `SEARCH_PRIORITY=baidu` to force one engine.

### How it works

1. AI calls `search()` tool with `{ query: "..." }`
2. CLI executes `runSearch()` from `packages/ai/src/tools/search/runtime.ts`
3. Based on `SEARCH_PRIORITY` or language detection, tries engines in order
4. Returns `{ source, url, content }` — content includes full snippets, no need for follow-up `fetch-url()`
5. UI displays `✓ search (baidu)` / `✓ search (tavily)` / `✓ search (bing)` showing which engine was used

### Logs

Search calls are logged to `logs/search.log` via the shared `logger` module (`packages/ai/src/lib/logger.ts`):

```
[2026/07/08 15:30:44] [search] fetch { "query": "周杰伦", "priority": "auto" }
[2026/07/08 15:30:44] [search] Trying baidu...
[2026/07/08 15:30:45] [search] SUCCESS via baidu, contentLength=11722
```

Logger 用法见上方 [Logger 用法](#logger-用法) 章节。

### Key files

| File | Purpose |
|------|---------|
| `packages/ai/src/lib/logger.ts` | Shared logger module — writes to `logs/{module}.log` |
| `packages/ai/src/tools/search/runtime.ts` | Search logic: Baidu API, Tavily API, scraper fallback |
| `packages/ai/src/tools/search/schema.ts` | Tool schema and description |
| `packages/ai/src/instructions.ts` | System prompt (tells AI to use search, not fetch-url after) |
| `packages/ai/src/tools/runners.ts` | Maps `search` → `runSearch` for CLI execution |
| `apps/cli/src/components/chat/ChatMessage.tsx` | UI rendering of search source label |
