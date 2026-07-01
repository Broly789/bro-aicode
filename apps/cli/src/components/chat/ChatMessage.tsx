import { Component } from 'react'
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

class ChatErrorBoundary extends Component<{ children: React.ReactNode; part: unknown; index: number }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode; part: unknown; index: number }) {
    super(props)
    this.state = { hasError: false }
  }
  componentDidCatch(error: Error) {
    globalThis.__opencodeDebug?.("[ChatErrorBoundary] error=" + error.message + " part=" + JSON.stringify(this.props.part).slice(0, 500) + " index=" + this.props.index)
  }
  render() {
    if (this.state.hasError) {
      return <text fg="red">[render error]</text>
    }
    return this.props.children
  }
}

function stripHtml(s: string): string {
  return s
    .replace(/<h1[^>]*>/gi, '# ')
    .replace(/<\/h1>/gi, '')
    .replace(/<h2[^>]*>/gi, '## ')
    .replace(/<\/h2>/gi, '')
    .replace(/<h3[^>]*>/gi, '### ')
    .replace(/<\/h3>/gi, '')
    .replace(/<strong[^>]*>/gi, '**')
    .replace(/<\/strong>/gi, '**')
    .replace(/<b[^>]*>/gi, '**')
    .replace(/<\/b>/gi, '**')
    .replace(/<em[^>]*>/gi, '*')
    .replace(/<\/em>/gi, '*')
    .replace(/<i[^>]*>/gi, '*')
    .replace(/<\/i>/gi, '*')
    .replace(/<code[^>]*>/gi, '`')
    .replace(/<\/code>/gi, '`')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{4,}/g, '\n\n\n')
}

function textFromMsg(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is TextUIPart => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

type AnyToolPart = DynamicToolUIPart | ToolUIPart<UITools>

function ToolCallPart({ part }: { part: AnyToolPart }) {
  const name = typeof getToolName === 'function' ? getToolName(part) : 'tool'

  switch (part.state) {
    case 'input-streaming':
      return (
        <text attributes={TextAttributes.DIM}>[{String(name)}] gathering input...</text>
      )
    case 'input-available':
      return <text fg="#888" attributes={TextAttributes.DIM}>→ {String(name)}...</text>
    case 'approval-requested':
      return <text fg="yellow">[{String(name)}] needs approval</text>
    case 'approval-responded':
      return part.approval?.approved ? (
        <text attributes={TextAttributes.DIM}>[{String(name)}] approved</text>
      ) : (
        <text fg="yellow">
          [{String(name)}] denied
          {part.approval?.reason ? `: ${String(part.approval.reason)}` : ''}
        </text>
      )
    case 'output-available':
      return (
        <text attributes={TextAttributes.DIM}>
          ✓ {String(name)}
        </text>
      )
    case 'output-error':
      return (
        <text fg="red">
          [{String(name)}] error: {String(part.errorText ?? 'unknown')}
        </text>
      )
    case 'output-denied':
      return <text fg="yellow">[{String(name)}] denied</text>
    default:
      return <text attributes={TextAttributes.DIM}>[{String(name)}] {String(part.state)}</text>
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
        const el = (() => {
          switch (part.type) {
            case 'text':
              return (
                <text key={i} wrapMode="word">
                  {stripHtml(part.text)}
                </text>
              )
            case 'reasoning':
              return (
                <text
                  key={i}
                  wrapMode="word"
                  attributes={TextAttributes.DIM | TextAttributes.ITALIC}
                >
                  {stripHtml(part.text)}
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
              if (!isToolUIPart(part)) {
                globalThis.__opencodeDebug?.("[ChatMessage] unknown part type=" + (part as any).type + " data=" + JSON.stringify(part).slice(0, 300))
                return null
              }
              return (
                <box key={part.toolCallId} flexDirection="column">
                  <ToolCallPart part={part} />
                </box>
              )
            }
          }
        })()
        return (
          <ChatErrorBoundary key={part.type === 'text' || part.type === 'reasoning' ? i : 'part-' + i} part={part} index={i}>
            {el}
          </ChatErrorBoundary>
        )
      })}
    </box>
  )
}
