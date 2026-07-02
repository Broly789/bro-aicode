import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import {
  tool,
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  generateId,
} from 'ai'
import { deepseek } from '@ai-sdk/deepseek'
import { toolDefs } from '@brocode/tools'
import { validateJson } from '../lib/validate'
import { prisma } from '../lib/db'

const tools = Object.fromEntries(
  toolDefs.map((def) => [
    def.name,
    tool({ description: def.description, inputSchema: def.inputSchema }),
  ]),
) as unknown as { [K in (typeof toolDefs)[number]['name']]: ReturnType<typeof tool> }

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
      system:
        'You are a CLI coding assistant. Rules:\n' +
        '1. Output ONLY plain text / Markdown (no HTML tags ever).\n' +
        '2. Use ## headings, **bold**, `code` in Markdown, never <h2>, <b>, <code>.\n' +
        '3. For file listings use code blocks.\n' +
        '4. Keep responses concise — this is a terminal.\n' +
        '5. For real-time information: use search() to find pages, ' +
        'then fetch-url() to read article content. ' +
        'If search returns content mentioning specific sites (weibo, sohu, baike, news sites), ' +
        'use fetch-url() on those URLs. ' +
        'Try different query formulations if search fails, ' +
        'but limit to 3 attempts total. ' +
        'If all searches fail, answer from your training data.\n',
      messages: modelMessages,
      tools,
      stopWhen: isStepCount(20),
      providerOptions: {
        deepseek: {
          thinking: { type: 'enabled' },
        },
      },
      onFinish: async ({ text, toolCalls, finalStep }) => {
        const parts: Array<object> = []
        const reasoningText = finalStep.reasoningText

        if (reasoningText) {
          parts.push({ type: 'reasoning', text: reasoningText, state: 'done' })
        }

        if (text) {
          parts.push({ type: 'text', text, state: 'done' })
        }

        for (const tc of toolCalls) {
          parts.push({
            type: `tool-${tc.toolName}`,
            toolCallId: tc.toolCallId,
            state: 'call',
            input: tc.input,
          })
        }

        const displayContent = [reasoningText, text].filter((s) => s).join('\n')

        try {
          const msgId = generateId()
          await prisma.message.upsert({
            where: { id: msgId },
            create: {
              id: msgId,
              sessionId,
              role: 'assistant',
              content: displayContent,
              parts,
              model: MODEL,
            },
            update: {
              content: displayContent,
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
