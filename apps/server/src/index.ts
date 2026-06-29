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
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()

app.onError((err, c) => {
  console.error('服务运行未知异常：', err)
  return c.json({ success: false, error: err.message }, 500)
})

const validateJson = <T extends z.ZodTypeAny>(schema: T) =>
  zValidator('json', schema, (result, c) => {
    if (!result.success) {
      console.error('\n========== Zod 校验错误 ==========')
      console.error(JSON.stringify(result.error.issues, null, 2))
      return c.json({ success: false, error: result.error.message, issues: result.error.issues }, 400)
    }
  })

const llmTestSchema = z.object({
  prompt: z.string().optional(),
})

const chatMessageSchema = z
  .object({
    id: z.string(),
    role: z.enum(['system', 'user', 'assistant', 'data']),
    content: z.string().default(''),
  })
  .catchall(z.unknown())

const chatSchema = z.object({
  messages: z.array(chatMessageSchema),
})

const route = app
  .get('/', (c) => c.text(greet(PROJECT_NAME)))
  .get('/health', (c) => c.json({ status: 'ok', runtime: 'bun' }))

  .post('/api/llm-test', validateJson(llmTestSchema), async (c) => {
    const { prompt } = c.req.valid('json')
    const result = streamText({
      model: deepseek('deepseek-chat'),
      prompt: prompt ?? 'say hello world',
    })
    return createTextStreamResponse({
      stream: toTextStream({ stream: result.stream }),
    })
  })

  .post('/api/chat', validateJson(chatSchema), async (c) => {
    const { messages } = c.req.valid('json') as unknown as { messages: UIMessage[] }
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