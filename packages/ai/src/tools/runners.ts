import { runReadFile } from './read-file/runtime'
import { runWriteFile } from './write-file/runtime'
import { runEditFile } from './edit-file/runtime'
import { runListFiles } from './list-files/runtime'
import { runGlob } from './glob/runtime'
import { runGrep } from './grep/runtime'
import { runBash } from './bash/runtime'
import { runSearch } from './search/runtime'
import { runFetchUrl } from './fetch-url/runtime'
import type { ToolName } from './schemas'

type ToolRunner = (input: unknown, cwd: string) => Promise<unknown>

export const toolRunners = {
  readFile: runReadFile,
  writeFile: runWriteFile,
  editFile: runEditFile,
  listFiles: runListFiles,
  glob: runGlob,
  grep: runGrep,
  bash: runBash,
  search: runSearch,
  'fetch-url': runFetchUrl,
} as const satisfies Record<ToolName, ToolRunner>

const _confirmable = [
  'writeFile',
  'bash',
] as const satisfies readonly ToolName[]

export const confirmableTools = new Set<ToolName>(_confirmable)

export function needsConfirmation(toolName: string): boolean {
  return confirmableTools.has(toolName as ToolName)
}

export type ToolResult =
  | { ok: true; output: unknown }
  | { ok: false; error: string }

const projectRoot = process.env.PROJECT_ROOT || process.cwd()

export type ToolCallPart = {
  type: `tool-${string}` | 'dynamic-tool'
  toolCallId: string
  toolName: ToolName
  state: string
  input: unknown
}

export async function executeTool(
  part: ToolCallPart,
): Promise<ToolResult> {
  const runner = toolRunners[part.toolName]
  if (!runner) return { ok: false, error: `Unknown tool: ${part.toolName}` }
  try {
    const output = await runner(part.input, projectRoot)
    console.error(`[tool] ${part.toolName} completed, output type: ${JSON.stringify(output, null, 2)}`)
    return { ok: true, output }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
