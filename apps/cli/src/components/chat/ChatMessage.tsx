import { TextAttributes } from '@opentui/core'
import type {
  UIMessage,
  TextUIPart,
  ReasoningUIPart,
  StepStartUIPart,
  SourceUrlUIPart,
  SourceDocumentUIPart,
  FileUIPart,
  ReasoningFileUIPart,
  CustomContentUIPart,
  DynamicToolUIPart,
  ToolUIPart,
  UITools,
} from 'ai'
import { isToolUIPart, getToolName } from 'ai'

function textFromMsg(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is TextUIPart => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

type AnyToolPart = DynamicToolUIPart | ToolUIPart<UITools>

function ToolCallPart({ part }: { part: AnyToolPart }) {
  const name = getToolName(part)

  switch (part.state) {
    case 'input-streaming':
      return (
        <text attributes={TextAttributes.DIM}>[{name}] gathering input...</text>
      )
    case 'input-available':
      return <text attributes={TextAttributes.DIM}>[{name}] ready</text>
    case 'approval-requested':
      return <text fg="yellow">[{name}] needs approval</text>
    case 'approval-responded':
      return part.approval?.approved ? (
        <text attributes={TextAttributes.DIM}>[{name}] approved</text>
      ) : (
        <text fg="yellow">
          [{name}] denied
          {part.approval?.reason ? `: ${part.approval.reason}` : ''}
        </text>
      )
    case 'output-available':
      return (
        <text attributes={TextAttributes.DIM}>
          [{name}] -{'> '}
          {part.output !== undefined ? JSON.stringify(part.output) : 'done'}
        </text>
      )
    case 'output-error':
      return (
        <text fg="red">
          [{name}] error: {part.errorText ?? 'unknown'}
        </text>
      )
    case 'output-denied':
      return <text fg="yellow">[{name}] denied</text>
  }
}

type ChatMessageProps = {
  msg: UIMessage
}

export function ChatMessage({ msg }: ChatMessageProps) {
  if (msg.role === 'user') {
    return (
      <box flexDirection="column" marginBottom={1}>
        <text fg="#7ec8e3">{'> '}{textFromMsg(msg)}</text>
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
          case 'step-start':
            return (
              <box
                key={i}
                height={1}
                borderStyle="single"
                border={['top']}
                borderColor="#222"
              />
            )
          case 'source-url':
            return (
              <text key={i} attributes={TextAttributes.DIM}>
                source: {part.title ?? part.url}
              </text>
            )
          case 'source-document':
            return (
              <text key={i} attributes={TextAttributes.DIM}>
                doc: {part.title}
                {part.filename ? ` (${part.filename})` : ''}
              </text>
            )
          case 'file':
            return (
              <text key={i} attributes={TextAttributes.DIM}>
                file: {part.filename ?? part.url} ({part.mediaType})
              </text>
            )
          case 'reasoning-file':
            return (
              <text key={i} attributes={TextAttributes.DIM}>
                file ({part.mediaType})
              </text>
            )
          case 'custom':
            return (
              <text key={i} attributes={TextAttributes.DIM}>
                {part.kind}
              </text>
            )
          default: {
            if (!isToolUIPart(part)) return null
            return (
              <box key={part.toolCallId} flexDirection="column">
                <ToolCallPart part={part} />
              </box>
            )
          }
        }
      })}
    </box>
  )
}
