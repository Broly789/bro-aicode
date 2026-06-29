import { TextAttributes, type InputRenderable, type KeyEvent } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { z } from 'zod'

const serverUrl = process.env.SERVER_URL ?? 'http://localhost:3000'

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
  const inputRef = useRef<InputRenderable>(null)

  const { prompt: initialPrompt } = ChatRouteState.parse(location.state ?? {})

  const { messages, sendMessage, status, error } = useChat({
    transport: new TextStreamChatTransport({
      api: `${serverUrl}/api/chat`,
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

  const handleSubmit = useCallback(() => {
    if (isLoading) return
    const el = inputRef.current
    if (!el) return
    const text = el.value.trim()
    if (!text) return
    sendMessage({ text })
    el.value = ''
  }, [isLoading, sendMessage])

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

      {/* 流式状态 / 错误提示 */}
      <box height={1} paddingLeft={1}>
        {status === 'streaming' ? (
          <text attributes={TextAttributes.DIM}>...</text>
        ) : error ? (
          <text fg="red" attributes={TextAttributes.DIM}>
            {error.message}
          </text>
        ) : null}
      </box>

      {/* 分割线 */}
      <box borderStyle="single" border={['top']} borderColor="#222" height={1} />

      {/* 输入区域 */}
      <box flexDirection="row" paddingLeft={1} paddingRight={1}>
        <text fg="#7ec8e3">&gt; </text>
        <input
          ref={inputRef}
          placeholder="Ask anything..."
          onSubmit={handleSubmit}
          focused={!isLoading}
          width="100%"
          textColor="#e6edf3"
          placeholderColor="#484f58"
          cursorColor="#00FFFF"
        />
      </box>
    </box>
  )
}
