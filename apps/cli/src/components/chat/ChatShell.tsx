import { TextAttributes } from '@opentui/core'
import { useEffect, useState } from 'react'
import type { UIMessage } from 'ai'
import { ChatMessage } from './ChatMessage'
import { ChatTextArea } from './ChatTextArea'
import { ToolConfirm } from './ToolConfirm'
import type { ToolCallPart } from '../../tools/executor'

export type AgentLoopStatus = 'ready' | 'streaming' | 'confirming' | 'error'

type ChatShellProps = {
  messages: UIMessage[]
  status: AgentLoopStatus
  error: Error | undefined
  confirmingTool: ToolCallPart | null
  onSubmit: (value: string) => void
  onConfirm: () => void
  onDeny: () => void
}

export function ChatShell({
  messages,
  status,
  error,
  confirmingTool,
  onSubmit,
  onConfirm,
  onDeny,
}: ChatShellProps) {
  const isInputDisabled = status === 'streaming' || status === 'confirming'

  const [frame, setFrame] = useState(0)
  useEffect(() => {
    if (status !== 'streaming') {
      setFrame(0)
      return
    }
    const id = setInterval(() => setFrame((f) => (f + 1) % 4), 400)
    return () => clearInterval(id)
  }, [status])

  const frames = ['思考中', '思考中.', '思考中..', '思考中...']

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

      {status === 'confirming' && confirmingTool ? (
        <ToolConfirm
          toolName={confirmingTool.toolName}
          input={confirmingTool.input}
          onConfirm={onConfirm}
          onDeny={onDeny}
        />
      ) : null}

      <box height={1} paddingLeft={1}>
        {status === 'streaming' ? (
          <text attributes={TextAttributes.DIM | TextAttributes.ITALIC}>
            {frames[frame]}
          </text>
        ) : status === 'error' ? (
          <text fg="red" attributes={TextAttributes.DIM}>
            Failed: {error?.message ?? 'Unknown error'}
          </text>
        ) : null}
      </box>

      <box
        borderStyle="single"
        border={['top']}
        borderColor="#222"
        height={1}
      />

      <ChatTextArea onSubmit={onSubmit} disabled={isInputDisabled} />
    </box>
  )
}
