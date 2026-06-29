import { greet, PROJECT_NAME } from '@brocode/shared'
import { Hono } from 'hono'

const app = new Hono()

const route = app
  .get('/', (c) => c.text(greet(PROJECT_NAME)))
  .get('/health', (c) => c.json({ status: 'ok', runtime: 'bun' }))

export default app
export type AppType = typeof route
