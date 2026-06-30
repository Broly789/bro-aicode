import { Hono } from 'hono'
import { z } from 'zod'
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  tool,
  validateUIMessages,
  generateId,
} from 'ai'
import { deepseek } from '@ai-sdk/deepseek'
import { PrismaClient } from '@brocode/database'
import { PrismaPostgresAdapter } from '@prisma/adapter-ppg'

const db = new PrismaClient({
  adapter: new PrismaPostgresAdapter({ connectionString: process.env.DATABASE_URL! }),
})

const SESSION_ID = 'debug-' + Date.now()

console.log('=== Testing DB save ===')
console.log('Session:', SESSION_ID)

// Simulate incoming request
const messages = [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }]
const validatedMessages = await validateUIMessages({ messages })

// Save user message
const userMsg = validatedMessages.find(m => m.role === 'user')
if (userMsg) {
  await db.message.create({
    data: {
      id: userMsg.id,
      sessionId: SESSION_ID,
      role: userMsg.role,
      content: 'hi',
      parts: userMsg.parts as object,
    },
  })
  console.log('User message saved')
}

// Stream
const modelMessages = await convertToModelMessages(
  validatedMessages.map(({ id, ...message }) => message),
)

const result = streamText({
  model: deepseek('deepseek-v4-flash'),
  messages: modelMessages,
  tools: {},
  stopWhen: isStepCount(5),
  providerOptions: { deepseek: { thinking: { type: 'enabled' } } },
  onFinish: async ({ text, reasoningText, toolCalls, toolResults }) => {
    console.log('onFinish fired')
    const parts: Array<object> = []
    if (reasoningText) parts.push({ type: 'reasoning', text: reasoningText, state: 'done' })
    if (text) parts.push({ type: 'text', text, state: 'done' })

    await db.message.create({
      data: {
        id: generateId(),
        sessionId: SESSION_ID,
        role: 'assistant',
        content: text,
        parts,
      },
    })
    console.log('Assistant message saved')
  },
})

// Consume the stream
const reader = result.stream.getReader()
while (true) {
  const { done } = await reader.read()
  if (done) break
}

// Verify
const saved = await db.message.findMany({ where: { sessionId: SESSION_ID } })
console.log('Total saved:', saved.length)

// Cleanup
await db.message.deleteMany({ where: { sessionId: SESSION_ID } })
await db.$disconnect()
