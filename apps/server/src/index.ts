import { Hono } from 'hono'
import { chatRoute } from './routes/chat'
import { llmTestRoute } from './routes/llm-test'
import { sessionsRoute } from './routes/sessions'

const app = new Hono()

app.onError((err, c) => {
  console.error('服务运行未知异常：', err)
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
