# brocode

AI-powered terminal coding assistant. Bun workspaces monorepo.

## Quick Start

```sh
git clone <repo>
cd brocode
bun install

# 开发模式（开两个终端，或直接用 &）
bun run dev:server    # HTTP server
bun run dev:cli       # TUI client
```

## 安装为全局命令

```sh
# 在项目目录下
bun link

# 之后任意目录可直接使用
brocode
```

卸载：`bun unlink`（在项目目录下执行）。

## 环境变量配置

### 方式一：`.env.local`（推荐开发用）

在项目根目录创建 `.env.local`，参考 `.env.example`：

```bash
# ── AI 模型 Key（必须，至少配一个） ──
BROCODE_DEEPSEEK_API_KEY="sk-..."
# BROCODE_OPENAI_API_KEY="sk-..."
# BROCODE_ANTHROPIC_API_KEY="sk-ant-..."

# ── 搜索 Key（可选，不配则搜索用爬虫 fallback） ──
TAVILY_API_KEY="tvly-..."
BAIDU_API_KEY="bce-v3/..."

# ── 服务地址（默认即可） ──
SERVER_URL="http://localhost:3000"
```

### 方式二：`.zshrc`（推荐给用户安装）

```bash
# ~/.zshrc
# brocode 相关环境变量

# AI 模型 Key（至少一个）
export BROCODE_DEEPSEEK_API_KEY="sk-..."
# export BROCODE_ANTHROPIC_API_KEY="sk-ant-..."

# 搜索
export TAVILY_API_KEY="tvly-..."
export BAIDU_API_KEY="bce-v3/..."
export SEARCH_PRIORITY="tavily"    # tavily | baidu | 留空自动

# 服务地址
export SERVER_URL="http://localhost:3000"
```

配完后 `source ~/.zshrc`。

### 三级优先级

```
.zshrc exports              → 最高（用户 shell 配置）
PROJECT_ROOT/.env.local     → 项目目录配置
brocode 安装目录/.env.local → API keys 兜底
```

后面的不会覆盖前面已有的变量。

## 使用

```sh
# 先启动服务端
bun run dev:server

# 再启动 CLI（开另一个终端）
brocode

# 或一键启动
bun run dev
```

### CLI 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Enter` | 发送消息 |
| `Shift+Enter` | 换行 |
| `Tab` | 切换模式 |
| `Ctrl+`` ` | 开关调试日志面板 |
| `Ctrl+L` | 清空调试日志 |
| `Shift+Q` | 退出 |


### 模式

- **BUILD** — 全工具可用（读、写、执行命令）
- **PLAN** — 只读分析（不能写文件或执行命令）

## 搜索

| 引擎 | 适用场景 | 免费额度 | 配置 |
|------|----------|----------|------|
| **Tavily** | 英文/国际内容 | 1000 次/月 | `TAVILY_API_KEY` |
| **百度千帆** | 中文内容 | 1500 次/月 | `BAIDU_API_KEY` |
| 爬虫 (Bing) | API 不可用时自动降级 | 无限制 | 无需配置 |

搜索自动路由：中文 → 百度优先，英文 → Tavily 优先。
通过 `SEARCH_PRIORITY=tavily` 或 `SEARCH_PRIORITY=baidu` 强制指定。

如需自定义搜索 API 地址（例如使用自建代理），通过环境变量覆盖：

```bash
export SEARCH_URL_TAVILY="https://your-proxy/tavily/search"
export SEARCH_URL_BAIDU="https://your-proxy/baidu/search"
```

不配则使用代码内置的默认地址。

> 爬虫兜底（Bing）仅在 API 全部不可用时自动降级。

## Commands

| command | description |
|---------|-------------|
| `bun run dev` | 同时启动 server + CLI |
| `bun run dev:server` | 启动 server（hot reload） |
| `bun run dev:cli` | 启动 CLI（watch mode） |
| `bun run build` | 构建 CLI 二进制 |
| `bun run link` | 注册全局 `brocode` 命令 |

## Project Structure

```
brocode/
├── apps/
│   ├── cli/          # TUI client (OpenTUI + React)
│   └── server/       # HTTP server (Hono + AI SDK)
├── packages/
│   ├── ai/           # AI 逻辑（工具、指令、模型）
│   ├── database/     # Prisma + Postgres
│   └── shared/       # 共享类型
├── .env.example      # 环境变量模板
└── package.json
```

## Stack

- **Runtime**: Bun
- **CLI**: OpenTUI (React), react-router v8
- **Server**: Hono, AI SDK
- **AI Models**: DeepSeek, OpenAI, Anthropic
- **Search**: Tavily, Baidu AI Search, web scraper
