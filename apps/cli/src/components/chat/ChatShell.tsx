import { TextAttributes } from '@opentui/core'
import type { UIMessage } from 'ai'
import { ChatMessage } from './ChatMessage'
import { ChatTextArea } from './ChatTextArea'

type ChatShellProps = {
  messages: UIMessage[]
  status: 'ready' | 'submitted' | 'streaming' | 'error'
  error: Error | undefined
  onSubmit: (value: string) => void
}

export function ChatShell({ messages, status, error, onSubmit }: ChatShellProps) {
  const isLoading = status === 'submitted' || status === 'streaming'

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
          messages.map((msg) => <ChatMessage key={msg.id} msg={msg} />)
        )}
      </scrollbox>

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

      <box borderStyle="single" border={['top']} borderColor="#222" height={1} />

      <ChatTextArea onSubmit={onSubmit} disabled={isLoading} />
    </box>
  )
}
