import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { prisma } from '../lib/db'
import { DEFAULT_MODEL_ID, getModelConfig } from '@brocode/ai/server'
import { validateJson } from '../lib/validate'

export const sessionsRoute = new Hono()
  .get('/', async (c) => {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { content: true },
        },
        _count: { select: { messages: true } },
      },
    })

    return c.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        modelId: s.modelId,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        title: s.messages[0]?.content ?? null,
        messageCount: s._count.messages,
      })),
    })
  })
  .post('/', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const modelId = body?.modelId || DEFAULT_MODEL_ID
    const session = await prisma.session.create({ data: { modelId } })
    return c.json({ id: session.id, modelId: session.modelId }, 201)
  })
  .get('/:sessionId/messages', async (c) => {
    const sessionId = c.req.param('sessionId')

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!session) {
      return c.json({ success: false, error: 'Session not found' }, 404)
    }

    return c.json({ messages: session.messages, modelId: session.modelId })
  })
  .patch(
    '/:sessionId/model',
    zValidator('param', z.object({ sessionId: z.string() })),
    validateJson(z.object({ modelId: z.string() })),
    async (c) => {
      const { sessionId } = c.req.valid('param')
      const { modelId } = c.req.valid('json')

      const config = getModelConfig(modelId)
      if (!config) {
        return c.json({ success: false, error: `Unknown model: ${modelId}` }, 400)
      }

      const session = await prisma.session.update({
        where: { id: sessionId },
        data: { modelId: config.id },
      })

      return c.json({ id: session.id, modelId: session.modelId })
    },
  )
