import { tool, zodSchema } from 'ai'
import { toolSchemas } from './schemas'
import { MODES, DEFAULT_MODE, isToolAllowed } from '../modes'

type ToolSchemaMap = typeof toolSchemas
type ToolName = keyof ToolSchemaMap

const toolNames = Object.keys(toolSchemas) as ToolName[]

/** 全量工具集 — 所有可用工具，用于类型校验和历史消息验证 */
export const allCodingTools = toolNames.reduce(
  (acc, name) => {
    const def = toolSchemas[name]
    acc[name] = tool({
      description: def.description,
      inputSchema: zodSchema(def.inputSchema as never),
    })
    return acc
  },
  {} as { [K in ToolName]: ReturnType<typeof tool> },
)

/** 按模式过滤后的工具集 — 用于 agent 运行时 */
export function getCodingToolsForMode(modeId: string) {
  const mode = MODES.find((m) => m.id === modeId) ?? DEFAULT_MODE
  if (mode.allowedTools.length === 0) return allCodingTools
  const filtered: Record<string, ReturnType<typeof tool>> = {}
  for (const name of toolNames) {
    if (isToolAllowed(name, mode)) {
      filtered[name] = allCodingTools[name]
    }
  }
  return filtered
}
