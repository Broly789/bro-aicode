import { useCallback, useRef, useState } from 'react'
import type { UIMessage } from 'ai'
import { client } from './client'
import type { AgentLoopEvent } from './agent-loop'
import { runAgentLoop } from './agent-loop'
import { executeTool, needsConfirmation } from '@brocode/ai/client'
import type { ToolCallPart } from '@brocode/ai/client'
import {
  ensureAssistantLast,
  findPartByToolCallId,
  updatePartAtIndex,
} from './message-helpers'

/** Agent 循环的 UI 状态 */
export type AgentLoopStatus =
  | 'ready'       // 空闲，可以发送新消息
  | 'streaming'   // 正在接收流式响应
  | 'confirming'  // 等待用户确认工具执行（弹出确认框）
  | 'error'       // 发生错误

/**
 * Agent 循环的 React Hook，管理聊天状态和消息流。
 *
 * 职责：
 * 1. 维护消息列表（messages）和 UI 状态（status）
 * 2. 发送消息并驱动 agent-loop 的流式事件循环
 * 3. 处理工具确认流程（confirming → 用户批准/拒绝 → 继续执行）
 *
 * 状态流转：
 *   ready → streaming → ready（正常完成）
 *   ready → streaming → confirming → streaming → ready（需要工具确认）
 *   ready → streaming → error（出错）
 */
export function useAgentLoop({
  sessionId,
  initialMessages,
  mode = 'build',
}: {
  sessionId: string
  initialMessages: UIMessage[]
  mode?: string
}) {
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages)
  const [status, setStatus] = useState<AgentLoopStatus>('ready')
  const [confirmingTool, setConfirmingTool] = useState<ToolCallPart | null>(null)
  const [error, setError] = useState<Error | undefined>(undefined)

  // 防止并发发送：同一时刻只允许一个 sendMessage 在运行
  const runningRef = useRef(false)

  // 用于中断流式请求的 AbortController
  const abortRef = useRef<AbortController | null>(null)

  // 工具确认的 Promise resolve 函数。
  // sendMessage 内部 await 一个 Promise，confirm/deny 调用 resolve 来恢复执行。
  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null)

  // 用 ref 保持 messages 的最新值，避免 useCallback 依赖 messages 导致频繁重建
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  // 通过 Hono RPC 类型安全地构建 API URL
  const apiUrl = client.api.chat[':sessionId']
    .$url({ param: { sessionId } })
    .toString()

  /**
   * 发送用户消息并启动 agent 循环。
   *
   * 核心流程：
   * 1. 将用户消息追加到消息列表
   * 2. 调用 runAgentLoop 发送请求并接收流式响应
   * 3. 通过 onEvent 回调实时更新消息列表（逐字显示文本、工具状态变化）
   * 4. 通过 onConfirm 回调处理需要用户确认的工具调用
   */
  const sendMessage = useCallback(
    async (text: string) => {
      if (runningRef.current) return
      runningRef.current = true

      const controller = new AbortController()
      abortRef.current = controller

      setStatus('streaming')
      setError(undefined)

      // 构造用户消息并追加到列表
      const userMsg: UIMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        parts: [{ type: 'text', text }],
      }

      const currentMessages = [...messagesRef.current, userMsg]
      setMessages(currentMessages)

      try {
        // 用于创建临时 assistant 消息的 id（流式传输时还没有服务端返回的 id）
        const assistantIdRef = { current: `msg-${Date.now()}-stream` }

        const result = await runAgentLoop(
          apiUrl,
          currentMessages,
          executeTool,
          needsConfirmation,
          // ---- 流式事件回调：实时更新 UI ----
          (event: AgentLoopEvent) => {
            setMessages((prev) => {
              let msgs = [...prev]

              // 确保最后一条消息是 assistant 消息（首条事件到达时可能还没有）
              let { msgs: updatedMsgs, last } = ensureAssistantLast(
                msgs,
                assistantIdRef.current,
              )
              msgs = updatedMsgs

              switch (event.type) {
                // 文本/推理增量：追加或更新对应 part 的文本
                case 'text':
                case 'reasoning': {
                  const partIndex = last.parts.findIndex(
                    (p) => p.type === event.type,
                  )
                  if (partIndex === -1) {
                    // 首次收到该类型 part，创建新 part
                    last = {
                      ...last,
                      parts: [
                        ...last.parts,
                        {
                          type: event.type,
                          text: event.text,
                          state: event.type === 'reasoning' ? 'streaming' : undefined,
                        } as unknown as UIMessage['parts'][number],
                      ],
                    }
                  } else {
                    // 已有该 part，追加文本（streaming 模式下文本是累积的）
                    last = {
                      ...last,
                      parts: updatePartAtIndex(last.parts, partIndex, {
                        text: event.text,
                      }),
                    }
                  }
                  msgs[msgs.length - 1] = last
                  break
                }

                // 工具开始：添加一个 input-available 状态的 tool part
                case 'tool-start': {
                  const exists = last.parts.some(
                    (p) => 'toolCallId' in p && p.toolCallId === event.toolCallId,
                  )
                  if (!exists) {
                    last = {
                      ...last,
                      parts: [
                        ...last.parts,
                        {
                          type: `tool-${event.toolName}`,
                          toolCallId: event.toolCallId,
                          toolName: event.toolName,
                          state: 'input-available',
                          input: undefined,
                        } as unknown as UIMessage['parts'][number],
                      ],
                    }
                    msgs[msgs.length - 1] = last
                  }
                  break
                }

                // 工具正在执行：更新 state 为 executing（UI 显示 loading）
                case 'tool-executing': {
                  const idx = findPartByToolCallId(last.parts, event.toolCallId)
                  if (idx >= 0) {
                    last = {
                      ...last,
                      parts: updatePartAtIndex(last.parts, idx, {
                        state: 'executing',
                      }),
                    }
                    msgs[msgs.length - 1] = last
                  }
                  break
                }

                // 工具执行完成：更新 state 和 output
                case 'tool-end': {
                  const idx = findPartByToolCallId(last.parts, event.toolCallId)
                  if (idx >= 0) {
                    last = {
                      ...last,
                      parts: updatePartAtIndex(last.parts, idx, {
                        state: 'output-available',
                        output: event.output,
                      }),
                    }
                    msgs[msgs.length - 1] = last
                  }
                  break
                }
              }

              return msgs
            })
          },
          // ---- 工具确认回调：暂停执行等待用户操作 ----
          async (toolPart: ToolCallPart): Promise<boolean> => {
            setStatus('confirming')
            setConfirmingTool(toolPart)

            // 挂起 Promise，等待用户点击确认/拒绝按钮
            const approved = await new Promise<boolean>((resolve) => {
              confirmResolveRef.current = resolve
            })

            setConfirmingTool(null)
            setStatus('streaming')
            return approved
          },
          controller.signal,
          mode,
        )

        // 循环结束，用最终消息列表覆盖流式更新的消息
        setMessages(result.messages)
        setStatus('ready')
      } catch (err) {
        if (controller.signal.aborted) {
          setStatus('ready')
        } else {
          setError(err instanceof Error ? err : new Error(String(err)))
          setStatus('error')
        }
      } finally {
        runningRef.current = false
        abortRef.current = null
      }
    },
    [apiUrl, mode],
  )

  /** 用户点击确认按钮：resolve 等待中的 Promise，恢复 agent 循环 */
  const confirm = useCallback(() => {
    confirmResolveRef.current?.(true)
  }, [])

  /** 用户点击拒绝按钮：resolve 等待中的 Promise，跳过该工具执行 */
  const deny = useCallback(() => {
    confirmResolveRef.current?.(false)
  }, [])

  /** 中断当前流式请求 */
  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    messages,
    status,
    confirmingTool,
    error,
    sendMessage,
    confirm,
    deny,
    stop,
  }
}
