import { TextAttributes } from '@opentui/core'
import { useEffect, useState } from 'react'
import type { UIMessage } from 'ai'
import { ChatMessage } from './ChatMessage'
import { ChatTextArea } from './ChatTextArea'
import { ToolConfirm } from './ToolConfirm'
import type { ToolCallPart } from '@brocode/ai/client'
import type { AgentLoopStatus } from '../../lib/use-agent-loop'

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

  const spinners = ['⠋', '⠙', '⠹', '⠸']

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
              <text fg="#00FFFF" attributes={TextAttributes.BOLD}>
                Start a conversation
              </text>
              <text fg="#666" attributes={TextAttributes.DIM}>
                Type your message below to begin
              </text>
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

      {/* Status Bar */}
      <box height={1} paddingLeft={1}>
        {status === 'streaming' ? (
          <text fg="#00FFFF">
            {spinners[frame]} Thinking...
          </text>
        ) : status === 'error' ? (
          <text fg="red">
            ✗ {error?.message ?? 'Unknown error'}
          </text>
        ) : status === 'confirming' ? (
          <text fg="yellow" attributes={TextAttributes.BOLD}>
            ? Confirm action
          </text>
        ) : null}
      </box>

      {/* Separator */}
      <box height={1} width="100%">
        <text fg="#333">{'─'.repeat(100)}</text>
      </box>

      <ChatTextArea onSubmit={onSubmit} disabled={isInputDisabled} />
    </box>
  )
}
