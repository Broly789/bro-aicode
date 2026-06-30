import { type KeyEvent } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, generateId } from 'ai'
import { z } from 'zod'
import { client } from '../lib/client'
import { ChatShell } from '../components/chat/ChatShell'

const ChatRouteState = z.object({
  prompt: z.string().default(''),
})

export function AiChat() {
  const location = useLocation()
  const navigate = useNavigate()
  const sentRef = useRef(false)

  const { prompt: initialPrompt } = ChatRouteState.parse(location.state ?? {})

  const sessionId = useMemo(() => generateId(), [])

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: client.api.chat.$url().toString(),
      body: { sessionId },
    }),
  })

  useKeyboard(
    useCallback(
      (event: KeyEvent) => {
        if (event.name === 'escape') {
          sentRef.current = false
          navigate('/')
        }
      },
      [navigate],
    ),
  )

  useEffect(() => {
    if (initialPrompt && !sentRef.current) {
      sentRef.current = true
      sendMessage({ text: initialPrompt })
    }
  }, [initialPrompt, sendMessage])

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
