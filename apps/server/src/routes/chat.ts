import { Hono } from 'hono'
import { z } from 'zod'
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from 'ai'
import { deepseek } from '@ai-sdk/deepseek'
import { validateJson } from '../lib/validate'

const chatBodySchema = z.object({
  messages: z.array(z.unknown()),
})

export const chatRoute = new Hono().post(
  '/chat',
  validateJson(chatBodySchema),
  async (c) => {
    const { messages } = c.req.valid('json')
    const validatedMessages = await validateUIMessages({
      messages: messages ?? [],
    })
    const modelMessages = await convertToModelMessages(
      validatedMessages.map(({ id, ...message }) => message),
    )
    const result = streamText({
      model: deepseek('deepseek-v4-flash'),
      messages: modelMessages,
    })
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    })
  },
)
