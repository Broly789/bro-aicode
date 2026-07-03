import type { ToolName } from './tools/schemas'

export interface Mode {
  id: string
  label: string
  description: string
  /** 工具白名单。为空表示允许所有工具。 */
  allowedTools: ToolName[]
}

const BUILD: Mode = {
  id: 'build',
  label: 'BUILD',
  description: 'Full access — read, write, execute',
  allowedTools: [],
}

const PLAN: Mode = {
  id: 'plan',
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
}

export const MODES: Mode[] = [BUILD, PLAN]

export const DEFAULT_MODE = BUILD

export function isToolAllowed(toolName: string, mode: Mode): boolean {
  if (mode.allowedTools.length === 0) return true
  return mode.allowedTools.includes(toolName as ToolName)
}
