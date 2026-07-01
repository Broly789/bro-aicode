import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  generateId,
} from 'ai'
import { deepseek } from '@ai-sdk/deepseek'
import { validateJson } from '../lib/validate'
import { prisma } from '../lib/db'
import { tools } from '../lib/tools'

const MODEL = 'deepseek-v4-flash'

const chatBodySchema = z.object({
  messages: z.array(z.unknown()),
})

const chatParamSchema = z.object({
  sessionId: z.string(),
})

export const chatRoute = new Hono().post(
  '/:sessionId',
  zValidator('param', chatParamSchema),
  validateJson(chatBodySchema),
  async (c) => {
    const { sessionId } = c.req.valid('param')
    const { messages } = c.req.valid('json')

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    })
    if (!session) {
      return c.json({ success: false, error: 'Session not found' }, 404)
    }

    const validatedMessages = await validateUIMessages({
      messages: messages ?? [],
    })

    try {
      await prisma.message.createMany({
        data: validatedMessages.map((msg) => ({
          id: msg.id,
          sessionId,
          role: msg.role,
          content: msg.parts
            .filter((p) => p.type === 'text' || p.type === 'reasoning')
            .map((p) => String((p as Record<string, unknown>).text ?? ''))
            .join('\n'),
          parts: msg.parts as object,
        })),
        skipDuplicates: true,
      })
    } catch (err) {
      console.error('Failed to persist user messages:', err)
    }

    const modelMessages = await convertToModelMessages(
      validatedMessages.map(({ id, ...message }) => message),
    )

    const result = streamText({
      model: deepseek(MODEL),
      messages: modelMessages,
      tools,
      stopWhen: isStepCount(5),
      providerOptions: {
        deepseek: {
          thinking: { type: 'enabled' },
        },
      },
      onFinish: async ({ text, toolCalls, toolResults, finalStep }) => {
        const parts: Array<object> = []
        const reasoningText = finalStep.reasoningText

        if (reasoningText) {
          parts.push({ type: 'reasoning', text: reasoningText, state: 'done' })
        }

        if (text) {
          parts.push({ type: 'text', text, state: 'done' })
        }

        for (const tc of toolCalls) {
          const tr = toolResults.find((r) => r.toolCallId === tc.toolCallId)
          const part: Record<string, unknown> = {
            type: `tool-${tc.toolName}`,
            toolCallId: tc.toolCallId,
            state: 'output-available',
            input: tc.input,
          }
          if (tr) part.output = tr.output
          parts.push(part)
        }

        try {
          const msgId = generateId()
          await prisma.message.upsert({
            where: { id: msgId },
            create: {
              id: msgId,
              sessionId,
              role: 'assistant',
              content: text,
              parts,
              model: MODEL,
            },
            update: {
              content: text,
              parts,
              model: MODEL,
            },
          })

          await prisma.session.update({
            where: { id: sessionId },
            data: {},
          })
        } catch (err) {
          console.error('Failed to persist assistant message:', err)
        }
      },
      onError: (err) => {
        console.error('Stream error:', err)
      },
    })

    const stream = toUIMessageStream({
      stream: result.stream,
      sendReasoning: true,
      originalMessages: validatedMessages,
    })

    return createUIMessageStreamResponse({
      stream,
    })
  },
)
