import { type KeyEvent } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { replace, useLocation, useNavigate, useParams } from 'react-router'
import { useChat, type Message } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { z } from 'zod'
import { client } from '../lib/client'
import { ChatShell } from '../components/chat/ChatShell'

const ChatRouteState = z.object({
  prompt: z.string().default(''),
})

export function AiChat() {
  const { id: sessionId } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [initialMessages, setInitialMessages] = useState<Message[] | null>(null)

  const { prompt } = ChatRouteState.parse(location.state ?? {})

  useEffect(() => {
    if (!sessionId) return

    client.api.sessions[':sessionId'].messages
      .$get({ param: { sessionId } })
      .then(async (res) => {
        if (res.status === 404) {
          navigate('/', { state: { sessionExpired: true }, replace: true })
          return
        }
        const data = (await res.json()) as {
          messages: Array<Record<string, unknown>>
        }
        setInitialMessages(
          data.messages.map((m) => ({
            id: m.id as string,
            role: m.role as 'user' | 'assistant',
            content: (m.content as string) ?? '',
            parts: m.parts as Array<Record<string, unknown>>,
            createdAt: m.createdAt
              ? new Date(m.createdAt as string)
              : undefined,
          })),
        )
      })
  }, [sessionId, navigate])

  const handleEsc = useCallback(
    (event: KeyEvent) => {
      if (event.name === 'escape') {
        navigate('/')
      }
    },
    [navigate],
  )
  useKeyboard(handleEsc)

  if (initialMessages === null) {
    return (
      <box alignItems="center" justifyContent="center" flexGrow={1}>
        <text>Thinking...</text>
      </box>
    )
  }

  return (
    <AiChatInner
      key={sessionId}
      sessionId={sessionId!}
      initialMessages={initialMessages}
      prompt={prompt}
    />
  )
}

function AiChatInner({
  sessionId,
  initialMessages,
  prompt,
}: {
  sessionId: string
  initialMessages: Message[]
  prompt: string
}) {
  const navigate = useNavigate()
  const sentRef = useRef(false)

  const serverUrl = process.env.SERVER_URL ?? 'http://localhost:3000'

  const { messages, sendMessage, status, error } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: `${serverUrl}/api/chat/${sessionId}`,
    }),
    onError: (err) => {
      if (err.message?.includes('404')) {
        navigate('/', { state: { sessionExpired: true } })
      }
    },
  })

  const handleEsc = useCallback(
    (event: KeyEvent) => {
      if (event.name === 'escape') {
        navigate('/')
      }
    },
    [navigate],
  )
  useKeyboard(handleEsc)

  useEffect(() => {
    if (prompt && !sentRef.current) {
      sentRef.current = true
      sendMessage({ text: prompt })
    }
  }, [prompt, sendMessage])

  const handleSubmit = useCallback(
    (value: string) => {
      if (status === 'submitted' || status === 'streaming') return
      const text = value.trim()
      if (!text) return
      sendMessage({ text })
    },
    [status, sendMessage],
  )

  return (
    <ChatShell
      messages={messages}
      status={status}
      error={error}
      onSubmit={handleSubmit}
    />
  )
}
