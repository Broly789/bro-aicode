import { readFileExecute } from './read-file/execute'
import { writeFileExecute } from './write-file/execute'
import { editFileExecute } from './edit-file/execute'
import { listDirectoryExecute } from './list-directory/execute'
import { globExecute } from './glob/execute'
import { grepExecute } from './grep/execute'
import { bashExecute } from './bash/execute'
import { searchExecute } from './search/execute'
import { fetchUrlExecute } from './fetch-url/execute'
import { toolDefs, type ToolName } from './index'
export { GuardrailError, resolveSafePath } from './guardrail'
export type { ToolName }

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
  ['search', searchExecute],
  ['fetch-url', fetchUrlExecute],
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

export {
  readFileSchema,
  readFileTool,
  writeFileSchema,
  writeFileTool,
  editFileSchema,
  editFileTool,
  listDirectorySchema,
  listDirectoryTool,
  globSchema,
  globTool,
  grepSchema,
  grepTool,
  bashSchema,
  bashTool,
  searchSchema,
  searchTool,
  fetchUrlSchema,
  fetchUrlTool,
} from './index'
