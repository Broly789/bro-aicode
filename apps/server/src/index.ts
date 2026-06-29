import { greet, PROJECT_NAME } from '@brocode/shared'
import { generateText } from 'ai'
import { deepseek } from '@ai-sdk/deepseek'
import { Hono } from 'hono'

const app = new Hono()

const route = app
  .get('/', (c) => c.text(greet(PROJECT_NAME)))
  .get('/health', (c) => c.json({ status: 'ok', runtime: 'bun' }))
  .get('/api/llm', async (c) => {
    const { text } = await generateText({
      model: deepseek('deepseek-chat'),
      prompt: c.req.query('prompt') ?? 'say hello world',
    })
    return c.text(text)
  })

export default app
export type AppType = typeof route
