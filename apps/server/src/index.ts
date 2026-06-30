import { Hono } from 'hono'
import { chatRoute } from './routes/chat'

const app = new Hono()

app.onError((err, c) => {
  console.error('服务运行未知异常：', err)
  return c.json({ success: false, error: err.message }, 500)
})

const route = app.route('/api', chatRoute)

const server = Bun.serve({
  fetch: app.fetch,
  port: 3000,
  idleTimeout: 120,
})

console.log(`Started: http://localhost:${server.port}`)

export type AppType = typeof route
