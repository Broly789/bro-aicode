import { type UIMessage, generateId, getToolName, isToolUIPart } from 'ai'
import type { DynamicToolUIPart, ToolUIPart, UITools } from 'ai'
import type { ToolResult, ToolCallPart, CodingAgent, ToolName } from '@brocode/ai/client'
import { isToolAllowed, MODES } from '@brocode/ai/client'
import { client } from './client'
import { findPartByToolCallId, updatePartAtIndex } from './message-helpers'

type AnyToolUIPart = ToolUIPart<UITools> | DynamicToolUIPart

/**
 * 将 AI SDK 的 ToolUIPart 转换为 @brocode/ai/client 的 ToolCallPart。
 * 两者结构相似但类型定义不同，此函数做桥接转换。
 */
function toToolCallPart(part: AnyToolUIPart): ToolCallPart {
  return {
    type: part.type,
    toolCallId: part.toolCallId,
    toolName: getToolName(part) as ToolName,
    state: part.state,
    input: 'input' in part ? part.input : undefined,
  }
}

/**
 * Agent 循环过程中产生的所有事件类型。
 * 用于流式传输时实时通知 UI 更新（如逐字显示文本、工具状态变化等）。
 */
export type AgentLoopEvent =
  | { type: 'text'; id: string; text: string }           // 文本内容增量
  | { type: 'reasoning'; id: string; text: string }      // 推理过程增量（CoT）
  | { type: 'tool-start'; toolCallId: string; toolName: string }   // 工具开始（输入已就绪）
  | { type: 'tool-executing'; toolCallId: string; toolName: string } // 工具正在执行
  | { type: 'tool-end'; toolCallId: string; output: unknown }      // 工具执行完成
  | { type: 'done'; finishReason: string }               // 本轮结束
  | { type: 'error'; message: string }                   // 发生错误

/**
 * 将消息列表中的 tool parts 从 CLI 内部格式转换为 validateUIMessages 能接受的格式。
 *
 * CLI 内部格式（UI 渲染用）：
 *   { type: "tool-bash", toolCallId, toolName, state: "input-available"|"output-available"|..., input?, output?, errorText? }
 *
 * validateUIMessages 格式（AI SDK v7）：
 *   { type: "dynamic-tool", toolName, toolCallId, state: "input-available"|"output-available"|..., input, output?, errorText? }
 */
function normalizeToolParts(messages: UIMessage[]): UIMessage[] {
  return messages.map((msg) => {
    if (msg.role !== 'assistant') return msg
    const hasToolParts = msg.parts.some(
      (p) => typeof p.type === 'string' && p.type.startsWith('tool-'),
    )
    if (!hasToolParts) return msg
    return {
      ...msg,
      parts: msg.parts.map((p) => {
        if (typeof p.type === 'string' && p.type.startsWith('tool-') && 'toolCallId' in p) {
          const part = p as Record<string, unknown>
          const toolName = (p.type as string).slice(5)
          const state = part.state as string | undefined
          const normalizedState = state === 'call' ? 'input-available' : (state ?? 'input-available')
          const result: Record<string, unknown> = {
            type: 'dynamic-tool',
            toolName,
            toolCallId: part.toolCallId,
            state: normalizedState,
            input: part.input ?? {},
          }
          if ('output' in part) result.output = part.output
          if ('errorText' in part) result.errorText = part.errorText
          return result as UIMessage['parts'][number]
        }
        return p
      }),
    }
  })
}

/** 单轮 sendAndReceive 的返回结果 */
export type AgentLoopResult = {
  messages: UIMessage[]   // 包含本次新增 assistant 消息的完整消息列表
  finishReason: string    // 'stop' | 'tool-calls' 等
}

/**
 * 将原始 HTTP 流（ReadableStream）解析为 SSE 事件流。
 *
 * SSE 格式：每个事件以 "\n\n" 分隔，数据行以 "data: " 开头。
 * 服务端发送 "[DONE]" 表示流结束。
 *
 * @returns 解析后的事件对象流（已 JSON.parse）
 */
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
                // 跳过格式错误的事件
              }
            }
          }
        }
      }

      read().catch((err) => controller.error(err))
    },
  })
}

/**
 * 流式传输过程中的中间 part 状态。
 * 用于在流式接收过程中累积 text delta，最终构建成完整的 UIMessage parts。
 */
type StreamPart = {
  id?: string        // text/reasoning part 的唯一标识，用于 delta 追加匹配
  type: string       // 'text' | 'reasoning' | `tool-${name}`
  text?: string      // 累积的文本内容（text/reasoning 类型）
  toolCallId?: string
  toolName?: string
  input?: unknown
  state?: string
}

/**
 * 向服务端发送消息列表，接收流式响应。
 *
 * 整体流程：
 * 1. POST 请求到 /api/chat/:sessionId，body 为完整消息列表
 * 2. 通过 SSE 接收流式事件（文本增量、工具调用等）
 * 3. 实时触发 onStreamEvent 回调，让 UI 能即时更新
 * 4. 流结束后，将累积的 parts 构建成一条完整的 assistant 消息
 *
 * @returns 所有事件记录 + 更新后的消息列表
 */
export async function sendAndReceive(
  sessionId: string,
  messages: UIMessage[],
  agent: CodingAgent,
  onStreamEvent?: (event: AgentLoopEvent) => void,
  signal?: AbortSignal,
  think: boolean = true,
): Promise<{
  events: AgentLoopEvent[]
  result: AgentLoopResult
}> {
  let res: Response
  try {
    const normalized = normalizeToolParts(messages)
    res = await client.api.chat[':sessionId'].$post(
      {
        param: { sessionId },
        json: { messages: normalized, mode: agent.modeId, think },
      },
      { init: { signal } },
    )
  } catch (err) {
    if (signal?.aborted) {
      return {
        events: [],
        result: { messages, finishReason: 'aborted' },
      }
    }
    throw err
  }

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    try {
      const body = JSON.parse(text)
      console.log('[SERVER ERROR]', JSON.stringify({ status: res.status, sessionId, body }, null, 2))
    } catch {
      console.log('[SERVER ERROR]', text)
    }
    throw new Error(`Server error ${res.status}: ${text}`)
  }

  if (!res.body) throw new Error('Empty response body')

  const events: AgentLoopEvent[] = []
  const parts: StreamPart[] = []
  // 用 Map 做 O(1) 查找，避免每次 delta 都遍历数组
  const partsById = new Map<string, StreamPart>()

  const stream = parseSSE(res.body)
  const reader = stream.getReader()

  let finishReason = 'stop'
  let errorText: string | undefined

  /** 记录事件并通知 UI */
  function emit(event: AgentLoopEvent) {
    events.push(event)
    onStreamEvent?.(event)
  }

  /** 添加新 part 并注册到 Map 索引 */
  function addPart(part: StreamPart) {
    parts.push(part)
    if (part.id) partsById.set(part.id, part)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (signal?.aborted) break

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
      // ---- 流开始：重置状态 ----
      case 'start': {
        parts.length = 0
        partsById.clear()
        break
      }

      // ---- 文本流：逐字追加 ----
      case 'text-start': {
        addPart({ id: chunk.id, type: 'text', text: '' })
        break
      }
      case 'text-delta': {
        // 按 id 找到对应 part，追加 delta 文本
        const part = partsById.get(chunk.id!)
        if (part && part.type === 'text') {
          part.text = (part.text ?? '') + chunk.delta
          emit({ type: 'text', id: chunk.id!, text: part.text ?? '' })
        }
        break
      }

      // ---- 推理流（Chain-of-Thought）：与文本类似 ----
      case 'reasoning-start': {
        addPart({ id: chunk.id, type: 'reasoning', text: '' })
        break
      }
      case 'reasoning-delta': {
        const part = partsById.get(chunk.id!)
        if (part && part.type === 'reasoning' && chunk.id) {
          part.text = (part.text ?? '') + (chunk.delta ?? '')
          emit({ type: 'reasoning', id: chunk.id, text: part.text })
        }
        break
      }
      case 'reasoning-end': {
        const part = partsById.get(chunk.id!)
        if (part && part.type === 'reasoning' && chunk.id) {
          emit({ type: 'reasoning', id: chunk.id, text: part.text ?? '' })
        }
        break
      }

      // ---- 工具调用 ----
      case 'tool-input-available': {
        // 服务端解析完工具输入，通知 UI 显示工具卡片
        const { toolCallId, toolName } = chunk
        if (!toolCallId || !toolName) break

        addPart({
          type: `tool-${toolName}`,
          toolCallId,
          toolName,
          state: 'input-available',
          input: chunk.input,
        })
        emit({ type: 'tool-start', toolCallId, toolName })
        break
      }

      case 'tool-output-available': {
        // 服务端执行完工具（或客户端执行后回传），返回结果
        if (!chunk.toolCallId) break
        emit({ type: 'tool-end', toolCallId: chunk.toolCallId, output: chunk.output })
        break
      }

      // ---- 结束 / 错误 ----
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

  // ---- 将累积的 StreamPart 转换为标准 UIMessage parts ----
  // 使用 dynamic-tool 格式，validateUIMessages 要求 input 字段必填
  const assistantParts: UIMessage['parts'] = []
  for (const part of parts) {
    if (part.type === 'text') {
      assistantParts.push({ type: 'text', text: part.text ?? '' })
    } else if (part.type === 'reasoning') {
      assistantParts.push({ type: 'reasoning', text: part.text ?? '', state: 'done' })
    } else if (part.toolName) {
      assistantParts.push({
        type: 'dynamic-tool',
        toolName: part.toolName,
        toolCallId: part.toolCallId!,
        state: 'input-available',
        input: part.input ?? {},
      } as unknown as UIMessage['parts'][number])
    }
  }

  const assistantMsg: UIMessage = {
    // Generate a fresh client-side id for every reconstructed assistant message.
    // The server reuses the previous assistant message's id as the response id
    // when the request's `originalMessages` ends in an assistant message (e.g.
    // the tool-call turn in a multi-step agent loop), so trusting server
    // `messageId` here would make two distinct assistant messages share an id
    // and get collapsed/dropped by ChatShell's dedup.
    id: generateId(),
    role: 'assistant',
    parts: assistantParts,
  }

  return {
    events,
    result: { messages: [...messages, assistantMsg], finishReason },
  }
}

/** 插入一条兜底的 assistant 文本消息（用于工具循环耗尽等异常场景） */
function insertFallback(messages: UIMessage[], text: string): UIMessage[] {
  return [
    ...messages,
    {
      id: `fb-${Date.now()}`,
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text }],
    },
  ]
}

/**
 * Agent 主循环：反复调用 sendAndReceive 直到模型不再请求工具调用。
 *
 * 单轮流程：
 *   1. 发送消息，接收流式响应
 *   2. 如果 finishReason !== 'tool-calls'，说明模型已完成，直接返回
 *   3. 否则提取待执行的工具 parts，逐个执行
 *   4. 将工具结果更新到消息中，进入下一轮
 *
 * 安全保护：
 *   - 最多 20 轮，防止无限循环
 *   - 连续 3 轮无文本输出 → 工具循环耗尽，插入兜底回答
 *   - 连续 2 轮所有工具均失败 → 网络/API 异常，插入兜底回答
 *
 * @param executeFn    执行工具调用的函数（由 @brocode/ai/client 提供）
 * @param needsConfirmFn 判断工具是否需要用户确认（如文件写入、命令执行）
 * @param onEvent      流式事件回调，实时通知 UI
 * @param onConfirm    需要确认时的回调，返回用户是否批准
 */
export async function runAgentLoop(
  sessionId: string,
  initialMessages: UIMessage[],
  agent: CodingAgent,
  executeFn: (part: ToolCallPart) => Promise<ToolResult>,
  needsConfirmFn: (toolName: string) => boolean,
  onEvent?: (event: AgentLoopEvent) => void,
  onConfirm?: (toolCall: ToolCallPart) => Promise<boolean>,
  signal?: AbortSignal,
  think: boolean = true,
): Promise<AgentLoopResult> {
  let messages = initialMessages
  let consecutiveToolOnlyRounds = 0   // 连续无文本输出的轮次计数
  let consecutiveAllErrorRounds = 0   // 连续全部工具失败的轮次计数

  for (let round = 0; round < 20; round++) {
    const { result } = await sendAndReceive(sessionId, messages, agent, onEvent, signal, think)
    messages = result.messages

    // 模型不再请求工具调用 → 本轮结束
    if (result.finishReason !== 'tool-calls') {
      return { messages, finishReason: result.finishReason }
    }

    let lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'assistant') {
      return { messages, finishReason: result.finishReason }
    }

    // Guard 1：连续多轮只有工具调用没有文本输出 → 可能陷入死循环
    const hasContent = lastMsg.parts.some(
      (p) => p.type === 'text' || p.type === 'reasoning',
    )
    if (!hasContent) {
      consecutiveToolOnlyRounds++
    } else {
      consecutiveToolOnlyRounds = 0
    }
    if (consecutiveToolOnlyRounds >= 3) {
      messages = insertFallback(
        messages,
        '⚠️ 多次工具调用均未返回有效内容，无法获取实时信息。以下是基于已有知识的回答：\n\n' +
          '(Real-time search is unavailable. The tools did not return usable data after multiple attempts.)',
      )
      return { messages, finishReason: 'tool-loop-exhausted' }
    }

    // 提取状态为 input-available 的工具 parts（等待执行）
    const pendingToolParts = lastMsg.parts
      .map((part, idx) => ({ part, idx }))
      .filter(
        (entry): entry is { part: AnyToolUIPart; idx: number } =>
          isToolUIPart(entry.part) && entry.part.state === 'input-available',
      )

    if (pendingToolParts.length === 0) {
      return { messages, finishReason: result.finishReason }
    }

    let executedCount = 0
    let errorCount = 0

    for (const { part, idx } of pendingToolParts) {
      const toolPart = toToolCallPart(part)

      // 模式限制：当前模式不允许此工具 → 跳过
      if (!agent.isToolAllowed(toolPart.toolName)) {
        lastMsg = {
          ...lastMsg,
          parts: updatePartAtIndex(lastMsg.parts, idx, {
            state: 'output-error',
            errorText: `Tool "${toolPart.toolName}" is not available in ${agent.mode.label} mode.`,
          }),
        }
        messages[messages.length - 1] = lastMsg
        continue
      }

      // 需要用户确认的工具（如 bash、writeFile），先弹确认框
      if (needsConfirmFn(toolPart.toolName) && onConfirm) {
        const approved = await onConfirm(toolPart)
        if (!approved) {
          // 用户拒绝 → 标记为 denied，跳过此工具
          lastMsg = {
            ...lastMsg,
            parts: updatePartAtIndex(lastMsg.parts, idx, {
              state: 'output-denied',
              approval: {
                id: `approval-${part.toolCallId}`,
                approved: false,
              },
            }),
          }
          messages[messages.length - 1] = lastMsg
          continue
        }
      }

      // 通知 UI 工具开始执行（显示 loading 状态）
      onEvent?.({
        type: 'tool-executing',
        toolCallId: part.toolCallId,
        toolName: getToolName(part),
      })

      // 执行工具并更新 part 状态
      const toolResult = await executeFn(toolPart)
      executedCount++
      if (!toolResult.ok) errorCount++

      lastMsg = {
        ...lastMsg,
        parts: updatePartAtIndex(lastMsg.parts, idx, toolResult.ok
          ? { state: 'output-available', output: toolResult.output }
          : { state: 'output-error', errorText: toolResult.error }),
      }
      messages[messages.length - 1] = lastMsg
    }

    // Guard 2：本轮所有工具都失败 → 可能是网络问题
    if (executedCount > 0 && errorCount >= executedCount) {
      consecutiveAllErrorRounds++
    } else {
      consecutiveAllErrorRounds = 0
    }

    if (consecutiveAllErrorRounds >= 2) {
      messages = insertFallback(
        messages,
        '⚠️ 所有工具调用均失败，可能由于网络不通或 API 不可用。以下是基于已有知识的回答：\n\n' +
          '(All tool calls failed. Network or API may be unavailable. Please check connectivity and try again.)',
      )
      return { messages, finishReason: 'tool-loop-exhausted' }
    }
  }

  return { messages, finishReason: 'max-steps' }
}
