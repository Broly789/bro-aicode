import { appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const LOG_ENABLED = (process.env.SEARCH_LOG || '').toLowerCase() === 'true'

function getLogDir(): string {
  return join(process.env.PROJECT_ROOT || process.cwd(), 'logs')
}

// Ensure log directory exists at import time (best-effort, uses current cwd)
try { mkdirSync(getLogDir(), { recursive: true }) } catch {}

/**
 * 通用日志模块。
 *
 * 用法（全局函数，无需 import）：
 *   logger('search', 'Trying baidu...')
 *   logger('search', 'fetch', { url: '...', status: 200 })
 *   logger('session', 'open', { id: '123', title: 'test' })
 *
 * 日志写入 logs/{module}.log，需设置 SEARCH_LOG=true 开启文件写入。
 * 同时通过 console.log 输出到 OpenTUI Console Overlay（SHOW_CONSOLE=true 或按 Ctrl+` 键打开）。
 */
export function logger(module: string, tag: string, entity?: unknown): void
export function logger(module: string, msg: unknown): void
export function logger(module: string, tagOrMsg: unknown, entity?: unknown) {
  const hasEntity = entity !== undefined
  const text = hasEntity
    ? `${tagOrMsg} ${typeof entity === 'string' ? entity : JSON.stringify(entity, null, 2)}`
    : typeof tagOrMsg === 'string' ? tagOrMsg : JSON.stringify(tagOrMsg, null, 2)
  const now = new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const line = `[${now}] [${module}] ${text}\n`
  if (LOG_ENABLED) {
    const logFile = join(getLogDir(), `${module}.log`)
    try { appendFileSync(logFile, line) } catch {}
  }
  console.log(line.trimEnd())
}

globalThis.logger = logger
