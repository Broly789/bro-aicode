import { readFileTool } from './read-file/schema'
import { writeFileTool } from './write-file/schema'
import { editFileTool } from './edit-file/schema'
import { listFilesTool } from './list-files/schema'
import { globTool } from './glob/schema'
import { grepTool } from './grep/schema'
import { bashTool } from './bash/schema'
import { searchTool } from './search/schema'
import { fetchUrlTool } from './fetch-url/schema'
import type { ToolSchema } from './types'

const toolDefs = [
  readFileTool,
  writeFileTool,
  editFileTool,
  listFilesTool,
  globTool,
  grepTool,
  bashTool,
  searchTool,
  fetchUrlTool,
] as const

export type ToolName = typeof toolDefs[number]['name']

export const toolSchemas = {
  [readFileTool.name]: readFileTool,
  [writeFileTool.name]: writeFileTool,
  [editFileTool.name]: editFileTool,
  [listFilesTool.name]: listFilesTool,
  [globTool.name]: globTool,
  [grepTool.name]: grepTool,
  [bashTool.name]: bashTool,
  [searchTool.name]: searchTool,
  [fetchUrlTool.name]: fetchUrlTool,
} as const satisfies Record<ToolName, ToolSchema>
