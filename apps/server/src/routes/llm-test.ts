import { Hono } from 'hono'
import { createUIMessageStreamResponse, streamText, toUIMessageStream } from 'ai'
import { deepseek } from '@ai-sdk/deepseek'

export const llmTestRoute = new Hono().post('/', async (c) => {
  const result = streamText({
    model: deepseek('deepseek-v4-flash'),
    prompt: 'Hello, world!',
  })

   return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
})
