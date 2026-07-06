import { Component } from 'react'
import { TextAttributes } from '@opentui/core'
import type {
  UIMessage,
  TextUIPart,
  DynamicToolUIPart,
  ToolUIPart,
  UITools,
} from 'ai'
import { isToolUIPart, getToolName } from 'ai'

class ChatErrorBoundary extends Component<
  { children: React.ReactNode; part: unknown; index: number },
  { hasError: boolean }
> {
  constructor(props: {
    children: React.ReactNode
    part: unknown
    index: number
  }) {
    super(props)
    this.state = { hasError: false }
  }
  componentDidCatch(error: Error) {
    console.error(
      '[ChatErrorBoundary] error=' +
        error.message +
        ' part=' +
        JSON.stringify(this.props.part).slice(0, 500) +
        ' index=' +
        this.props.index,
    )
    this.setState({ hasError: true })
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
type ToolPartState = AnyToolPart['state'] | 'executing'

function toolSummary(part: AnyToolPart): string {
  const input = (part as Record<string, unknown>).input
  if (!input || typeof input !== 'object') return ''
  const obj = input as Record<string, unknown>
  if (typeof obj.command === 'string') return obj.command.slice(0, 80)
  if (typeof obj.path === 'string') return obj.path
  if (typeof obj.pattern === 'string') return obj.pattern
  const s = JSON.stringify(input).slice(0, 60)
  return s
}

function ToolCallPart({ part }: { part: AnyToolPart }) {
  const name = typeof getToolName === 'function' ? getToolName(part) : 'tool'
  const summary = toolSummary(part)
  const state = part.state as ToolPartState

  // 搜索工具输出中提取搜索引擎来源
  const searchSource = name === 'search' && part.state === 'output-available'
    ? ((part as Record<string, unknown>).output as Record<string, unknown>)?.source
    : null

  switch (state) {
    case 'input-streaming':
      return (
        <text fg="#666" attributes={TextAttributes.DIM}>
          ⏳ {String(name)} gathering input...
        </text>
      )
    case 'input-available':
      return (
        <text fg="#888" attributes={TextAttributes.DIM}>
          → {String(name)}
          {summary ? ` ${summary}` : ''}...
        </text>
      )
    case 'executing':
      return (
        <text fg="#FFA500" attributes={TextAttributes.BOLD}>
          ⚡ {String(name)}
          {summary ? ` ${summary}` : ''}
        </text>
      )
    case 'approval-requested':
      return (
        <text fg="#FFD700" attributes={TextAttributes.BOLD}>
          ? {String(name)} needs approval
        </text>
      )
    case 'approval-responded':
      return part.approval?.approved ? (
        <text fg="#00FF00" attributes={TextAttributes.DIM}>
          ✓ {String(name)} approved
        </text>
      ) : (
        <text fg="#FF6B6B">
          ✗ {String(name)} denied
          {part.approval?.reason ? `: ${String(part.approval.reason)}` : ''}
        </text>
      )
    case 'output-available':
      return (
        <text fg="#00FF00" attributes={TextAttributes.DIM}>
          ✓ {String(name)}
          {searchSource ? ` (${String(searchSource)})` : ''}
        </text>
      )
    case 'output-error':
      return (
        <text fg="#FF6B6B">
          ✗ {String(name)}: {String(part.errorText ?? 'unknown')}
        </text>
      )
    case 'output-denied':
      return (
        <text fg="#FFD700">
          ✗ {String(name)} denied
        </text>
      )
    default:
      return (
        <text fg="#666" attributes={TextAttributes.DIM}>
          [{String(name)}] {String((part as AnyToolPart).state)}
        </text>
      )
  }
}

type ChatMessageProps = {
  msg: UIMessage
}

export function ChatMessage({ msg }: ChatMessageProps) {
  if (msg.role === 'user') {
    return (
      <box flexDirection="column" marginBottom={1} paddingLeft={1}>
        <box flexDirection="row" gap={1} marginBottom={0}>
          <text fg="#00FFFF" attributes={TextAttributes.BOLD}>
            ›
          </text>
          <text fg="#00FFFF" attributes={TextAttributes.BOLD}>
            You
          </text>
        </box>
        <text fg="#E0E0E0" paddingLeft={2} wrapMode="word">
          {textFromMsg(msg)}
        </text>
      </box>
    )
  }

  return (
    <box flexDirection="column" marginBottom={1} paddingLeft={1}>
      {msg.parts.map((part, i) => {
        const el = (() => {
          switch (part.type) {
            case 'text':
              return (
                <text key={i} wrapMode="word" fg="#E0E0E0">
                  {stripHtml(part.text)}
                </text>
              )
            case 'reasoning':
              return (
                <text
                  key={i}
                  wrapMode="word"
                  fg="#888"
                  attributes={TextAttributes.ITALIC}
                >
                  💭 {stripHtml(part.text)}
                </text>
              )
            case 'step-start':
              return (
                <box
                  key={i}
                  height={1}
                  marginTop={1}
                  marginBottom={1}
                >
                  <text fg="#333">{'─'.repeat(40)}</text>
                </box>
              )
            case 'source-url':
              return (
                <text key={i} fg="#666" attributes={TextAttributes.DIM}>
                  🔗 {part.title ?? part.url}
                </text>
              )
            case 'source-document':
              return (
                <text key={i} fg="#666" attributes={TextAttributes.DIM}>
                  📄 {part.title}
                  {part.filename ? ` (${part.filename})` : ''}
                </text>
              )
            case 'file':
              return (
                <text key={i} fg="#666" attributes={TextAttributes.DIM}>
                  📁 {part.filename ?? part.url} ({part.mediaType})
                </text>
              )
            case 'reasoning-file':
              return (
                <text key={i} fg="#666" attributes={TextAttributes.DIM}>
                  📁 file ({part.mediaType})
                </text>
              )
            case 'custom':
              return (
                <text key={i} fg="#666" attributes={TextAttributes.DIM}>
                  {part.kind}
                </text>
              )
            default: {
              if (!isToolUIPart(part)) {
                console.error(
                  '[ChatMessage] unknown part type=' +
                    (part as any).type +
                    ' data=' +
                    JSON.stringify(part).slice(0, 300),
                )
                return null
              }
              return (
                <box key={part.toolCallId} flexDirection="column" paddingLeft={1}>
                  <ToolCallPart part={part} />
                </box>
              )
            }
          }
        })()
        return (
          <ChatErrorBoundary
            key={
              part.type === 'text' || part.type === 'reasoning'
                ? i
                : 'part-' + i
            }
            part={part}
            index={i}
          >
            {el}
          </ChatErrorBoundary>
        )
      })}
    </box>
  )
}
