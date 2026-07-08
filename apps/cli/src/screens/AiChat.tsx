import { type KeyEvent } from '@opentui/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import type { UIMessage } from 'ai'
import { z } from 'zod'
import { client } from '../lib/client'
import { useAgentLoop } from '../lib/use-agent-loop'
import { useModeContext } from '../lib/modes'
import { ChatShell } from '../components/chat/ChatShell'
import { CodingAgent, DEFAULT_MODE } from '@brocode/ai/client'
import { useChatCommands } from '../hooks/use-chat-commands'
import { useLayerKeyboard, useLayer } from '../lib/layers'

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

  // Navigate ref — stable for useEffect deps, always reads latest function
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  useEffect(() => {
    if (!sessionId) return

    let cancelled = false
    setInitialMessages(null)

    client.api.sessions[':sessionId'].messages
      .$get({ param: { sessionId } })
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 404) {
          navigateRef.current('/', {
            state: { sessionExpired: true },
            replace: true,
          })
          return
        }
        const data = (await res.json()) as {
          messages: Array<Record<string, unknown>>
        }
        if (cancelled) return
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
      .catch(() => {
        if (cancelled) return
        setInitialMessages([])
      })

    return () => {
      cancelled = true
    }
  }, [sessionId])

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
  const { mode } = useModeContext()
  const chatCommands = useChatCommands()

  useLayer('chat')

  const agentRef = useRef(new CodingAgent(DEFAULT_MODE))

  useEffect(() => {
    agentRef.current.setMode(mode)
  }, [mode])

  const {
    messages,
    status,
    confirmingTool,
    error,
    sendMessage,
    confirm,
    deny,
    stop,
  } = useAgentLoop({ sessionId, initialMessages, agent: agentRef.current })

  useLayerKeyboard((event: KeyEvent) => {
    if (event.name === 'escape') {
      if (status === 'streaming') {
        stop()
      } else {
        navigate('/')
      }
    }
    // Capture Ctrl+C to stop streaming instead of exiting
    if (event.ctrl && event.name === 'c') {
      event.preventDefault()
      event.stopPropagation()
      if (status === 'streaming') {
        stop()
      }
    }
  }, 'chat')

  useEffect(() => {
    if (prompt && !sentRef.current) {
      sentRef.current = true
      sendMessage(prompt)
    }
  }, [prompt, sendMessage])

  const handleSubmit = useCallback(
    async (value: string) => {
      if (status === 'streaming') return
      const text = value.trim()
      if (!text) return
      if (await chatCommands(text)) return
      sendMessage(text)
    },
    [status, sendMessage, chatCommands],
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
