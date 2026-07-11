import { Hono } from 'hono'
import { createUIMessageStreamResponse, streamText, toUIMessageStream } from 'ai'
import { resolveModel, DEFAULT_MODEL_ID } from '@brocode/ai/server'

export const llmTestRoute = new Hono().post('/', async (c) => {
  const result = streamText({
    model: resolveModel(DEFAULT_MODEL_ID).model,
    prompt: 'Hello, world!',
  })

   return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
})
