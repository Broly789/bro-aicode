import type { UIMessage } from 'ai'

/** assistant 消息中任意一种 part 的类型 */
export type AssistantPart = UIMessage['parts'][number]

/**
 * 按 toolCallId 在 parts 数组中查找对应 part 的索引。
 * 用于工具执行/完成时快速定位要更新的 part。
 * @returns 匹配的索引，未找到返回 -1
 */
export function findPartByToolCallId(
  parts: AssistantPart[],
  toolCallId: string,
): number {
  return parts.findIndex(
    (p) => 'toolCallId' in p && p.toolCallId === toolCallId,
  )
}

/**
 * 不可变地更新 parts 数组中指定索引的 part。
 * 返回新数组，原数组不受影响（React state 不可变更新）。
 */
export function updatePartAtIndex(
  parts: AssistantPart[],
  idx: number,
  updates: Partial<Record<string, unknown>>,
): AssistantPart[] {
  const newParts = [...parts]
  newParts[idx] = { ...(newParts[idx] as Record<string, unknown>), ...updates } as AssistantPart
  return newParts
}

/**
 * 确保消息列表的最后一条是 assistant 消息。
 * 流式传输开始时，第一条事件到达时可能还没有 assistant 消息，
 * 此时需要创建一条空的 assistant 消息作为占位。
 *
 * @returns 更新后的消息列表和最后一条 assistant 消息的引用
 */
export function ensureAssistantLast(
  msgs: UIMessage[],
  id: string,
): { msgs: UIMessage[]; last: UIMessage } {
  let last = msgs[msgs.length - 1]
  if (last?.role !== 'assistant') {
    last = { id, role: 'assistant', parts: [] }
    msgs = [...msgs, last]
  }
  return { msgs, last }
}
