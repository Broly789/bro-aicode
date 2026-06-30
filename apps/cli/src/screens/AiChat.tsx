import { TextAttributes, type KeyEvent } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { z } from 'zod'
import { client } from '../lib/client'
import { TextArea } from '../components/TextArea'

const ChatRouteState = z.object({
  prompt: z.string().default(''),
})

function textFromParts(msg: UIMessage): string {
  return msg.parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export function AiChat() {
  const location = useLocation()
  const navigate = useNavigate()
  const sentRef = useRef(false)

  const { prompt: initialPrompt } = ChatRouteState.parse(location.state ?? {})

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: client.api.chat.$url().toString(),
    }),
  })

  const isLoading = status === 'submitted' || status === 'streaming'

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
      if (isLoading) return
      const text = value.trim()
      if (!text) return
      sendMessage({ text })
    },
    [isLoading, sendMessage],
  )

  return (
    <box flexDirection="column" flexGrow={1}>
      <scrollbox flexGrow={1} stickyScroll stickyStart="bottom">
        {messages.length === 0 ? (
          <box
            flexDirection="column"
            flexGrow={1}
            alignItems="center"
            justifyContent="center"
          >
            <box flexDirection="column" gap={1} alignItems="center">
              <text attributes={TextAttributes.BOLD | TextAttributes.DIM}>
                AI Chat
              </text>
              <text attributes={TextAttributes.DIM}>Ask anything...</text>
            </box>
          </box>
        ) : (
          messages.map((msg) => (
            <box key={msg.id} flexDirection="column" marginBottom={1}>
              {msg.role === 'user' ? (
                <text fg="#7ec8e3">{'> '}{textFromParts(msg)}</text>
              ) : (
                <text wrapMode="word">{textFromParts(msg)}</text>
              )}
            </box>
          ))
        )}
      </scrollbox>

      {/* 状态提示 */}
      <box height={1} paddingLeft={1}>
        {status === 'submitted' ? (
          <text attributes={TextAttributes.DIM}>Sending...</text>
        ) : status === 'streaming' ? (
          <text attributes={TextAttributes.DIM}>...</text>
        ) : status === 'error' ? (
          <text fg="red" attributes={TextAttributes.DIM}>
            Failed: {error?.message ?? 'Unknown error'}
          </text>
        ) : null}
      </box>

      {/* 分割线 */}
      <box borderStyle="single" border={['top']} borderColor="#222" height={1} />

      {/* 输入区域 */}
      <TextArea onSubmit={handleSubmit} disabled={isLoading} />
    </box>
  )
}
