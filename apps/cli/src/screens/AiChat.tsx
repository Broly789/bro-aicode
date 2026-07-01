import { type KeyEvent } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { replace, useLocation, useNavigate, useParams } from 'react-router'
import type { UIMessage } from 'ai'
import { z } from 'zod'
import { client } from '../lib/client'
import { useAgentLoop } from '../lib/use-agent-loop'
import { ChatShell } from '../components/chat/ChatShell'

const ChatRouteState = z.object({
  prompt: z.string().default(''),
})

export function AiChat() {
  const { id: sessionId } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(
    null,
  )

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
            role: m.role as UIMessage['role'],
            parts:
              Array.isArray(m.parts) && m.parts.length > 0
                ? (m.parts as UIMessage['parts'])
                : [
                    {
                      type: 'text' as const,
                      text: (m.content as string) ?? '',
                    },
                  ],
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
        <text>Loading sessions...</text>
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
  initialMessages: UIMessage[]
  prompt: string
}) {
  const navigate = useNavigate()
  const sentRef = useRef(false)

  const {
    messages,
    status,
    confirmingTool,
    error,
    sendMessage,
    confirm,
    deny,
  } = useAgentLoop({ sessionId, initialMessages })

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
      sendMessage(prompt)
    }
  }, [prompt, sendMessage])

  const handleSubmit = useCallback(
    (value: string) => {
      if (status === 'streaming') return
      const text = value.trim()
      if (!text) return
      sendMessage(text)
    },
    [status, sendMessage],
  )

  return (
    <ChatShell
      messages={messages}
      status={status}
      error={error}
      confirmingTool={confirmingTool}
      onSubmit={handleSubmit}
      onConfirm={confirm}
      onDeny={deny}
    />
  )
}
