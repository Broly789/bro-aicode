import { TextAttributes } from '@opentui/core'
import type { UIMessage } from 'ai'

function textFromParts(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is typeof p & { type: 'text' } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

type ChatMessageProps = {
  msg: UIMessage
}

export function ChatMessage({ msg }: ChatMessageProps) {
  if (msg.role === 'user') {
    return (
      <box flexDirection="column" marginBottom={1}>
        <text fg="#7ec8e3">{'> '}{textFromParts(msg)}</text>
      </box>
    )
  }

  return (
    <box flexDirection="column" marginBottom={1}>
      {msg.parts.map((part, i) => {
        switch (part.type) {
          case 'text':
            return (
              <text key={i} wrapMode="word">
                {part.text}
              </text>
            )
          case 'reasoning':
            return (
              <text
                key={i}
                wrapMode="word"
                attributes={TextAttributes.DIM | TextAttributes.ITALIC}
              >
                {part.text}
              </text>
            )
          default:
            return null
        }
      })}
    </box>
  )
}
