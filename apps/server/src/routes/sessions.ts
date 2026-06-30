import { Hono } from 'hono'
import { prisma } from '../lib/db'

export const sessionsRoute = new Hono()
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
