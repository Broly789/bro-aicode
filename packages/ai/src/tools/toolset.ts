import { tool, zodSchema, type Tool } from 'ai'
import { toolSchemas } from './schemas'
import { MODES, DEFAULT_MODE, isToolAllowed } from '../modes'
import type { ModeIds } from '../modes'

type ToolSchemaMap = typeof toolSchemas
type ToolName = keyof ToolSchemaMap

const toolNames = Object.keys(toolSchemas) as ToolName[]

/** 全量工具集 — 所有可用工具，用于类型校验和历史消息验证 */
export const allCodingTools: Record<ToolName, Tool<unknown, unknown>> = toolNames.reduce(
  (acc, name) => {
    const def = toolSchemas[name]
    acc[name] = tool({
      description: def.description,
      inputSchema: zodSchema(def.inputSchema as never),
    }) as unknown as Tool<unknown, unknown>
    return acc
  },
  {} as Record<ToolName, Tool<unknown, unknown>>,
)

/** 按模式过滤后的工具集 — 用于 agent 运行时 */
export function getCodingToolsForMode(modeId: ModeIds) {
  const mode = MODES.find((m) => m.id === modeId) ?? DEFAULT_MODE
  if (mode.allowedTools.length === 0) return allCodingTools
  const filtered: Record<string, Tool<unknown, unknown>> = {}
  for (const name of toolNames) {
    if (isToolAllowed(name, mode)) {
      filtered[name] = allCodingTools[name]
    }
  }
  return filtered
}
