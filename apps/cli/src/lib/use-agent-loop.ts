import { useCallback, useRef, useState } from 'react'
import type { UIMessage } from 'ai'
import { client } from './client'
import type { AgentLoopEvent } from './agent-loop'
import { runAgentLoop } from './agent-loop'
import { executeTool, needsConfirmation } from '@brocode/ai/client'
import type { ToolCallPart } from '@brocode/ai/client'

export type AgentLoopStatus =
  | 'ready'
  | 'streaming'
  | 'confirming'
  | 'error'

export function useAgentLoop({
  sessionId,
  initialMessages,
}: {
  sessionId: string
  initialMessages: UIMessage[]
}) {
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages)
  const [status, setStatus] = useState<AgentLoopStatus>('ready')
  const [confirmingTool, setConfirmingTool] = useState<ToolCallPart | null>(null)
  const [error, setError] = useState<Error | undefined>(undefined)
  const runningRef = useRef(false)
  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const apiUrl = client.api.chat[':sessionId']
    .$url({ param: { sessionId } })
    .toString()

  const sendMessage = useCallback(
    async (text: string) => {
      if (runningRef.current) return
      runningRef.current = true

      setStatus('streaming')
      setError(undefined)

      const userMsg: UIMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        parts: [{ type: 'text', text }],
      }

      const currentMessages = [...messagesRef.current, userMsg]
      setMessages(currentMessages)

      try {
        const assistantIdRef = { current: `msg-${Date.now()}-stream` }

        const result = await runAgentLoop(
          apiUrl,
          currentMessages,
          executeTool,
          needsConfirmation,
          (event: AgentLoopEvent) => {
            setMessages((prev) => {
              const msgs = [...prev]
              let last = msgs[msgs.length - 1]

              if (event.type === 'text' || event.type === 'reasoning') {
                if (last?.role !== 'assistant') {
                  last = { id: assistantIdRef.current, role: 'assistant', parts: [] }
                  msgs.push(last)
                }
                const partIndex = last.parts.findIndex((p) => p.type === event.type)
                if (partIndex === -1) {
                  last = { ...last, parts: [...last.parts, { type: event.type, text: event.text, state: event.type === 'reasoning' ? 'streaming' : undefined } as unknown as UIMessage['parts'][number]] }
                  msgs[msgs.length - 1] = last
                } else {
                  const part = last.parts[partIndex] as Record<string, unknown>
                  const updatedPart = { ...part, text: event.text } as UIMessage['parts'][number]
                  const newParts = [...last.parts]
                  newParts[partIndex] = updatedPart
                  last = { ...last, parts: newParts }
                  msgs[msgs.length - 1] = last
                }
              }

              if (event.type === 'tool-start') {
                if (last?.role !== 'assistant') {
                  last = { id: assistantIdRef.current, role: 'assistant', parts: [] }
                  msgs.push(last)
                }
                const exists = last.parts.some((p) => 'toolCallId' in p && p.toolCallId === event.toolCallId)
                if (!exists) {
                  const newPart = {
                    type: `tool-${event.toolName}`,
                    toolCallId: event.toolCallId,
                    toolName: event.toolName,
                    state: 'input-available',
                    input: undefined,
                  } as unknown as UIMessage['parts'][number]
                  last = { ...last, parts: [...last.parts, newPart] }
                  msgs[msgs.length - 1] = last
                }
              }

              if (event.type === 'tool-executing') {
                const partIdx = last?.parts?.findIndex(
                  (p) => 'toolCallId' in p && p.toolCallId === event.toolCallId,
                )
                if (partIdx !== undefined && partIdx >= 0) {
                  const part = { ...(last.parts[partIdx] as Record<string, unknown>), state: 'executing' }
                  const newParts = [...last.parts]
                  newParts[partIdx] = part as UIMessage['parts'][number]
                  last = { ...last, parts: newParts }
                  msgs[msgs.length - 1] = last
                }
              }

              if (event.type === 'tool-end') {
                const partIdx = last?.parts?.findIndex(
                  (p) => 'toolCallId' in p && p.toolCallId === event.toolCallId,
                )
                if (partIdx !== undefined && partIdx >= 0) {
                  const part = { ...(last.parts[partIdx] as Record<string, unknown>), state: 'output-available', output: event.output }
                  const newParts = [...last.parts]
                  newParts[partIdx] = part as UIMessage['parts'][number]
                  last = { ...last, parts: newParts }
                  msgs[msgs.length - 1] = last
                }
              }

              return msgs
            })
          },
          async (toolPart: ToolCallPart): Promise<boolean> => {
            setStatus('confirming')
            setConfirmingTool(toolPart)

            const approved = await new Promise<boolean>((resolve) => {
              confirmResolveRef.current = resolve
            })

            setConfirmingTool(null)
            setStatus('streaming')
            return approved
          },
        )

        setMessages(result.messages)
        setStatus('ready')
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        setStatus('error')
      } finally {
        runningRef.current = false
      }
    },
    [apiUrl],
  )

  const confirm = useCallback(() => {
    confirmResolveRef.current?.(true)
  }, [])

  const deny = useCallback(() => {
    confirmResolveRef.current?.(false)
  }, [])

  return {
    messages,
    status,
    confirmingTool,
    error,
    sendMessage,
    confirm,
    deny,
  }
}
