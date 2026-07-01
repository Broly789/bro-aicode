import { readFileExecute } from './read-file'
import { writeFileExecute } from './write-file'
import { editFileExecute } from './edit-file'
import { listDirectoryExecute } from './list-directory'
import { globExecute } from './glob'
import { grepExecute } from './grep'
import { bashExecute } from './bash'
import type { ToolName } from '@brocode/tools'

export type ToolCallPart = {
  type: `tool-${string}` | 'dynamic-tool'
  toolCallId: string
  toolName: string
  state: string
  input: unknown
}

type ToolExecutor = (input: unknown, cwd: string) => Promise<unknown>

const executorEntries = [
  ['readFile', readFileExecute],
  ['writeFile', writeFileExecute],
  ['editFile', editFileExecute],
  ['listDirectory', listDirectoryExecute],
  ['glob', globExecute],
  ['grep', grepExecute],
  ['bash', bashExecute],
] as const satisfies readonly (readonly [ToolName, ToolExecutor])[]

export const executors = Object.fromEntries(executorEntries)

export type ToolResult =
  | { ok: true; output: unknown }
  | { ok: false; error: string }

const projectRoot = process.env.PROJECT_ROOT || process.cwd()

export async function executeTool(part: ToolCallPart): Promise<ToolResult> {
  const fn = executors[part.toolName as ToolName]
  if (!fn) return { ok: false, error: `Unknown tool: ${part.toolName}` }
  try {
    const output = await fn(part.input, projectRoot)
    return { ok: true, output }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

const confirmableTools = new Set<ToolName>(['writeFile', 'bash'])

export function needsConfirmation(toolName: string): boolean {
  return confirmableTools.has(toolName as ToolName)
}
