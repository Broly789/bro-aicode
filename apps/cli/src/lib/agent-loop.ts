import type { UIMessage } from 'ai'
import { getToolName, isToolUIPart } from 'ai'
import type { DynamicToolUIPart, ToolUIPart, UITools } from 'ai'
import type { ToolResult } from '../tools/executor'
import type { ToolCallPart } from '../tools/executor'

type AnyToolUIPart = ToolUIPart<UITools> | DynamicToolUIPart

function toToolCallPart(part: AnyToolUIPart): ToolCallPart {
  return {
    type: part.type,
    toolCallId: part.toolCallId,
    toolName: getToolName(part),
    state: part.state,
    input: 'input' in part ? part.input : undefined,
  }
}

export type AgentLoopEvent =
  | { type: 'text'; id: string; text: string }
  | { type: 'reasoning'; id: string; text: string }
  | { type: 'tool-start'; toolCallId: string; toolName: string }
  | { type: 'tool-end'; toolCallId: string; output: unknown }
  | { type: 'done'; finishReason: string }
  | { type: 'error'; message: string }

export type AgentLoopResult = {
  messages: UIMessage[]
  finishReason: string
}

function parseSSE(stream: ReadableStream<Uint8Array>): ReadableStream<unknown> {
  const decoder = new TextDecoder()
  let buffer = ''

  return new ReadableStream({
    start(controller) {
      const reader = stream.getReader()

      async function read() {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            controller.close()
            return
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                controller.close()
                return
              }
              try {
                controller.enqueue(JSON.parse(data))
              } catch {
                // skip malformed events
              }
            }
          }
        }
      }

      read().catch((err) => controller.error(err))
    },
  })
}

export async function sendAndReceive(
  apiUrl: string,
  messages: UIMessage[],
  onStreamEvent?: (event: AgentLoopEvent) => void,
): Promise<{
  events: AgentLoopEvent[]
  result: AgentLoopResult
}> {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`Server error ${res.status}: ${text}`)
  }

  if (!res.body) throw new Error('Empty response body')

  const events: AgentLoopEvent[] = []
  const parts: Array<{
    id?: string
    type: string
    text?: string
    toolCallId?: string
    toolName?: string
    input?: unknown
    state?: string
  }> = []

  let messageId: string | undefined

  const stream = parseSSE(res.body)

  const reader = stream.getReader()

  let finishReason = 'stop'
  let errorText: string | undefined

  function emit(event: AgentLoopEvent) {
    events.push(event)
    onStreamEvent?.(event)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = value as {
      type: string
      id?: string
      messageId?: string
      delta?: string
      text?: string
      finishReason?: string
      errorText?: string
      toolCallId?: string
      toolName?: string
      input?: unknown
      output?: unknown
    }

    switch (chunk.type) {
      case 'start': {
        messageId = chunk.messageId
        parts.length = 0
        break
      }

      case 'text-start': {
        parts.push({ id: chunk.id, type: 'text', text: '' })
        break
      }
      case 'text-delta': {
        const part = parts.find((p) => p.id === chunk.id)
        if (part && part.type === 'text') {
          part.text = (part.text ?? '') + chunk.delta
          emit({
            type: 'text',
            id: chunk.id as string,
            text: part.text ?? '',
          })
        }
        break
      }
      case 'text-end': {
        break
      }

      case 'reasoning-start': {
        parts.push({ id: chunk.id, type: 'reasoning', text: '' })
        break
      }
      case 'reasoning-delta': {
        const part = parts.find((p) => p.id === chunk.id)
        if (part && part.type === 'reasoning' && chunk.id) {
          part.text = (part.text ?? '') + (chunk.delta ?? '')
          emit({
            type: 'reasoning',
            id: chunk.id,
            text: part.text,
          })
        }
        break
      }
      case 'reasoning-end': {
        const part = parts.find((p) => p.id === chunk.id)
        if (part && part.type === 'reasoning' && chunk.id) {
          emit({
            type: 'reasoning',
            id: chunk.id,
            text: part.text ?? '',
          })
        }
        break
      }

      case 'tool-input-available': {
        const { toolCallId, toolName } = chunk
        if (!toolCallId || !toolName) break

        parts.push({
          type: `tool-${toolName}`,
          toolCallId,
          toolName,
          state: 'input-available',
          input: chunk.input,
        })
        emit({
          type: 'tool-start',
          toolCallId,
          toolName,
        })
        break
      }

      case 'tool-output-available': {
        const { toolCallId, output } = chunk
        if (!toolCallId) break

        emit({
          type: 'tool-end',
          toolCallId,
          output,
        })
        break
      }

      case 'finish': {
        finishReason = chunk.finishReason ?? 'stop'
        break
      }

      case 'error': {
        const message = chunk.errorText ?? 'Unknown error'
        errorText = message
        emit({ type: 'error', message })
        break
      }
    }
  }

  if (errorText) throw new Error(errorText)

  const assistantParts: UIMessage['parts'] = []

  for (const part of parts) {
    if (part.type === 'text') {
      assistantParts.push({ type: 'text', text: part.text ?? '' })
    } else if (part.type === 'reasoning') {
      assistantParts.push({
        type: 'reasoning',
        text: part.text ?? '',
        state: 'done',
      })
    } else if (part.toolName) {
      assistantParts.push({
        type: `tool-${part.toolName}` as `tool-${string}`,
        toolCallId: part.toolCallId!,
        state: 'input-available',
        input: part.input,
      })
    }
  }

  const assistantMsg: UIMessage = {
    id: messageId ?? `msg-${Date.now()}`,
    role: 'assistant',
    parts: assistantParts,
  }

  const newMessages = [...messages, assistantMsg]

  return {
    events,
    result: { messages: newMessages, finishReason },
  }
}

export async function runAgentLoop(
  apiUrl: string,
  initialMessages: UIMessage[],
  executeFn: (part: ToolCallPart) => Promise<ToolResult>,
  needsConfirmFn: (toolName: string) => boolean,
  onEvent?: (event: AgentLoopEvent) => void,
  onConfirm?: (toolCall: ToolCallPart) => Promise<boolean>,
): Promise<AgentLoopResult> {
  let messages = initialMessages

  for (let round = 0; round < 20; round++) {
    const { result } = await sendAndReceive(apiUrl, messages, onEvent)
    messages = result.messages

    if (result.finishReason !== 'tool-calls') {
      return { messages, finishReason: result.finishReason }
    }

    let lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'assistant') {
      return { messages, finishReason: result.finishReason }
    }

    const pendingToolParts = lastMsg.parts
      .map((part, idx) => ({ part, idx }))
      .filter(
        (entry): entry is { part: AnyToolUIPart; idx: number } =>
          isToolUIPart(entry.part) && entry.part.state === 'input-available',
      )

    if (pendingToolParts.length === 0) {
      return { messages, finishReason: result.finishReason }
    }

    for (const { part, idx } of pendingToolParts) {
      const toolPart = toToolCallPart(part)

      if (needsConfirmFn(toolPart.toolName)) {
        if (onConfirm) {
          const approved = await onConfirm(toolPart)
          if (!approved) {
            const rejectedPart = {
              ...part,
              state: 'output-denied' as const,
              approval: {
                id: `approval-${part.toolCallId}`,
                approved: false as const,
              },
            }
            const newParts = [
              ...lastMsg.parts.slice(0, idx),
              rejectedPart as UIMessage['parts'][number],
              ...lastMsg.parts.slice(idx + 1),
            ]
            lastMsg = { ...lastMsg, parts: newParts }
            messages[messages.length - 1] = lastMsg
            continue
          }
        }
      }

      const toolResult = await executeFn(toolPart)

      const outputPart = toolResult.ok
        ? {
            ...part,
            state: 'output-available' as const,
            output: toolResult.output,
          }
        : {
            ...part,
            state: 'output-error' as const,
            errorText: toolResult.error,
          }
      const newParts = [
        ...lastMsg.parts.slice(0, idx),
        outputPart as UIMessage['parts'][number],
        ...lastMsg.parts.slice(idx + 1),
      ]
      lastMsg = { ...lastMsg, parts: newParts }
      messages[messages.length - 1] = lastMsg
    }
  }

  return { messages, finishReason: 'max-steps' }
}
