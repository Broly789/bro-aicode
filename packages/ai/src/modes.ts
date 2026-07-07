import { toolSchemas, type ToolName } from './tools/schemas'
import type { Tool } from 'ai'

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
  return value in toolSchemas
}
export function isToolAllowed(toolName: string, mode: Mode): boolean {
  // 第一步：先判断字符串是不是合法工具名，不是直接拒绝
  if (!isToolName(toolName)) return false
  if (mode.allowedTools.length === 0) return true
  return mode.allowedTools.includes(toolName)
}

/**
 * 智能体模式管理器。
 * 
 * 职责：
 * 1. 持有当前模式状态
 * 2. 缓存每个模式的工具集和系统提示，避免重复计算
 * 3. 提供模式切换方法，切换时只需更新状态
 * 
 * 使用示例：
 * ```ts
 * const agent = new CodingAgent(BUILD)
 * agent.setMode(PLAN)  // 轻量切换，不重建对象
 * const tools = agent.getTools()  // 返回 PLAN 模式下的工具集
 * ```
 */
export class CodingAgent {
  private _mode: Mode
  private toolsCache = new Map<ModeIds, Record<string, Tool<unknown, unknown>>>()
  private promptCache = new Map<ModeIds, string>()

  constructor(mode: Mode = DEFAULT_MODE) {
    this._mode = mode
  }

  /** 当前模式 */
  get mode(): Mode {
    return this._mode
  }

  /** 当前模式 ID */
  get modeId(): ModeIds {
    return this._mode.id
  }

  /** 切换模式（轻量操作，只更新状态引用） */
  setMode(mode: Mode): void {
    this._mode = mode
  }

  /**
   * 获取当前模式的工具集（带缓存）。
   * 首次调用时过滤并缓存，后续直接返回缓存。
   */
  getTools(): Record<string, Tool<unknown, unknown>> {
    const cached = this.toolsCache.get(this._mode.id)
    if (cached) return cached

    // 延迟导入避免循环依赖
    const { getCodingToolsForMode } = require('./tools/toolset') as typeof import('./tools/toolset')
    const tools = getCodingToolsForMode(this._mode.id)
    this.toolsCache.set(this._mode.id, tools)
    return tools
  }

  /**
   * 获取当前模式的系统提示（带缓存）。
   * 首次调用时生成并缓存，后续直接返回缓存。
   */
  getSystemPrompt(): string {
    const cached = this.promptCache.get(this._mode.id)
    if (cached) return cached

    // 延迟导入避免循环依赖
    const { getSystemInstructions } = require('./instructions') as typeof import('./instructions')
    const prompt = getSystemInstructions(this._mode.id)
    this.promptCache.set(this._mode.id, prompt)
    return prompt
  }

  /**
   * 检查指定工具在当前模式下是否可用。
   */
  isToolAllowed(toolName: string): boolean {
    return isToolAllowed(toolName, this._mode)
  }

  /**
   * 清除指定模式的缓存（用于工具集动态更新场景）。
   */
  clearCache(modeId?: ModeIds): void {
    if (modeId) {
      this.toolsCache.delete(modeId)
      this.promptCache.delete(modeId)
    } else {
      this.toolsCache.clear()
      this.promptCache.clear()
    }
  }
}
