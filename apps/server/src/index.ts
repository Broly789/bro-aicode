import { Hono } from 'hono'
import { appendFile } from 'node:fs/promises'
import { chatRoute } from './routes/chat'
import { llmTestRoute } from './routes/llm-test'
import { sessionsRoute } from './routes/sessions'

const app = new Hono()

app.onError(async (err, c) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    request: { method: c.req.method, path: c.req.path },
    error: {
      name: err.name,
      message: err.message,
      cause: (err as any).cause,
      stack: err.stack,
    },
  }

  const formatted = JSON.stringify(errorInfo, null, 2)

  console.error(`\n╔═══ SERVER ERROR [${c.req.method} ${c.req.path}] ═══`)
  console.error(formatted)
  console.error(`╚══════════════════════════════════╝\n`)

  try {
    await appendFile('logs/server-error.log', `\n${formatted}\n${'─'.repeat(60)}\n`)
  } catch {}

  return c.json({ success: false, error: err.message }, 500)
})

const route = app
  .route('/api/chat', chatRoute)
  .route('/api/llm-test', llmTestRoute)
  .route('/api/sessions', sessionsRoute)

const server = Bun.serve({
  fetch: app.fetch,
  port: 3000,
  idleTimeout: 120,
})

console.log(`Started: http://localhost:${server.port}`)

export type AppType = typeof route
