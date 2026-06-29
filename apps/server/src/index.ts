import { greet, PROJECT_NAME } from '@brocode/shared'
import {
  convertToModelMessages,
  createTextStreamResponse,
  streamText,
  toTextStream,
  type UIMessage,
} from 'ai'
import { deepseek } from '@ai-sdk/deepseek'
import { Hono } from 'hono'

const app = new Hono()

const route = app
  .get('/', (c) => c.text(greet(PROJECT_NAME)))
  .get('/health', (c) => c.json({ status: 'ok', runtime: 'bun' }))
  .post('/api/llm-test', async (c) => {
    const { prompt } = await c.req.json()
    const result = streamText({
      model: deepseek('deepseek-chat'),
      prompt: prompt ?? 'say hello world',
    })
    return createTextStreamResponse({
      stream: toTextStream({ stream: result.stream }),
    })
  })
  .post('/api/chat', async (c) => {
    const { messages } = await c.req.json<{ messages: UIMessage[] }>()
    const modelMessages = await convertToModelMessages(
      (messages ?? []).map(({ id, ...message }) => message),
    )
    const result = streamText({
      model: deepseek('deepseek-chat'),
      messages: modelMessages,
    })
    return createTextStreamResponse({
      stream: toTextStream({ stream: result.stream }),
    })
  })

export default app
export type AppType = typeof route
