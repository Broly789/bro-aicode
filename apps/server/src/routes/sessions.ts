import { Hono } from 'hono'
import { prisma } from '../lib/db'

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
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        title: s.messages[0]?.content ?? null,
        messageCount: s._count.messages,
      })),
    })
  })
  .post('/', async (c) => {
    const session = await prisma.session.create({})
    return c.json({ id: session.id }, 201)
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

    return c.json({ messages: session.messages })
  })
