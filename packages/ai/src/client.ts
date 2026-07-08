export {
  toolRunners,
  confirmableTools,
  needsConfirmation,
  executeTool,
  type ToolResult,
  type ToolCallPart,
} from './tools/runners'

export type { ToolName } from './tools/schemas'

export { MODES, DEFAULT_MODE, isToolAllowed, CodingAgent, type Mode, type ModeIds } from './modes'

export { allCodingTools, getCodingToolsForMode } from './tools/toolset'

// 确保 CLI 侧也能使用全局 logger（client.ts 被 CLI import，主入口不会）
import './lib/logger'
