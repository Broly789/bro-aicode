import { Hono } from 'hono'
import { streamText } from 'ai'
import { deepseek } from '@ai-sdk/deepseek'

export const llmTestRoute = new Hono().post('/', async (c) => {
  const result = streamText({
    model: deepseek('deepseek-v4-flash'),
    prompt: 'Hello, world!',
  })

  return result.toDataStreamResponse()
})
