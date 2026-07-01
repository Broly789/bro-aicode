import { readFileTool, readFileSchema } from './read-file'
import { writeFileTool, writeFileSchema } from './write-file'
import { editFileTool, editFileSchema } from './edit-file'
import { listDirectoryTool, listDirectorySchema } from './list-directory'
import { globTool, globSchema } from './glob'
import { grepTool, grepSchema } from './grep'
import { bashTool, bashSchema } from './bash'

export const toolDefs = [
  readFileTool,
  writeFileTool,
  editFileTool,
  listDirectoryTool,
  globTool,
  grepTool,
  bashTool,
] as const

export type ToolName = (typeof toolDefs)[number]['name']

export {
  readFileTool,
  readFileSchema,
  writeFileTool,
  writeFileSchema,
  editFileTool,
  editFileSchema,
  listDirectoryTool,
  listDirectorySchema,
  globTool,
  globSchema,
  grepTool,
  grepSchema,
  bashTool,
  bashSchema,
}
