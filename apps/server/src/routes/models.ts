import { Hono } from 'hono'
import { getAvailableModels } from '@brocode/ai/server'

export const modelsRoute = new Hono().get('/', (c) => {
  const models = getAvailableModels().map((m) => ({
    id: m.id,
    label: m.label,
    provider: m.provider,
    supportsThinking: m.supportsThinking ?? false,
    configured: !!process.env[m.apiKeyEnv],
  }))
  return c.json({ models })
})
