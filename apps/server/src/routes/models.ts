import { Hono } from 'hono'
import { getAvailableModels } from '@brocode/ai/server'

const CACHE_TTL = 10_000
let cache: { data: unknown; timestamp: number } | null = null

export const modelsRoute = new Hono().get('/', (c) => {
  const now = Date.now()
  if (cache && now - cache.timestamp < CACHE_TTL) {
    return c.json(cache.data as Record<string, unknown>)
  }

  const models = getAvailableModels().map((m) => ({
    id: m.id,
    label: m.label,
    provider: m.provider,
    supportsThinking: m.supportsThinking ?? false,
    configured: !!process.env[m.apiKeyEnv],
  }))

  const data = { models }
  cache = { data, timestamp: now }
  return c.json(data)
})
