import type { ToolName } from './tools/schemas'
// 模式 ID 字面量联合，杜绝非法 mode 字符串
export enum ModeKeys {
  BUILD = 'build',
  PLAN = 'plan',
}

// 提取枚举值联合类型，全局复用，替代之前手动写 ModeId
export type ModeIds = `${ModeKeys}`

export interface Mode {
  id: ModeIds,
  label: string
  description: string
  /** 工具白名单。为空表示允许所有工具。 */
  allowedTools: ToolName[]
}

const BUILD = {
  id: ModeKeys.BUILD,
  label: 'BUILD',
  description: 'Full access — read, write, execute',
  allowedTools: [],
} satisfies Mode

const PLAN = {
  id: ModeKeys.PLAN,
  label: 'PLAN',
  description: 'Read-only — no writes, no execution',
  allowedTools: [
    'readFile',
    'listFiles',
    'glob',
    'grep',
    'search',
    'fetch-url',
  ],
} satisfies Mode

export const MODES: Mode[] = [BUILD, PLAN]

export const DEFAULT_MODE = BUILD
/**
 * 类型守卫：判断任意字符串是否为合法 ToolName
 * @param value 待校验字符串
 */
function isToolName(value: string): value is ToolName {
  // 提取全部可用工具全集，用于运行时校验
  const allToolNames: ToolName[] = Array.from(
    new Set(MODES.flatMap(m => m.allowedTools))
  )
  return allToolNames.includes(value as ToolName)
}
export function isToolAllowed(toolName: string, mode: Mode): boolean {
  // 第一步：先判断字符串是不是合法工具名，不是直接拒绝
  if (!isToolName(toolName)) return false
  if (mode.allowedTools.length === 0) return true
  return mode.allowedTools.includes(toolName)
}
