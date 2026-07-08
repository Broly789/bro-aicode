import { appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const LOG_DIR = join(process.env.PROJECT_ROOT || process.cwd(), 'logs')
try { mkdirSync(LOG_DIR, { recursive: true }) } catch {}

const LOG_ENABLED = (process.env.SEARCH_LOG || '').toLowerCase() === 'true'

/**
 * 通用日志模块。
 *
 * 用法（全局函数，无需 import）：
 *   logger('search', 'Trying baidu...')
 *   logger('session', { id: '123', title: 'test' })
 *
 * 日志写入 logs/{module}.log，需设置 SEARCH_LOG=true 开启文件写入。
 * console.error 始终输出，不受开关控制。
 */
export function logger(module: string, msg: unknown) {
  const text = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)
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
    const logFile = join(LOG_DIR, `${module}.log`)
    try { appendFileSync(logFile, line) } catch {}
  }
  console.error(line.trimEnd())
}

globalThis.logger = logger
