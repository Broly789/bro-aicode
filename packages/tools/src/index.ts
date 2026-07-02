import { readFileTool, readFileSchema } from './read-file/schema'
import { writeFileTool, writeFileSchema } from './write-file/schema'
import { editFileTool, editFileSchema } from './edit-file/schema'
import { listDirectoryTool, listDirectorySchema } from './list-directory/schema'
import { globTool, globSchema } from './glob/schema'
import { grepTool, grepSchema } from './grep/schema'
import { bashTool, bashSchema } from './bash/schema'
import { searchTool, searchSchema } from './search/schema'
import { fetchUrlTool, fetchUrlSchema } from './fetch-url/schema'

export const toolDefs = [
  readFileTool,
  writeFileTool,
  editFileTool,
  listDirectoryTool,
  globTool,
  grepTool,
  bashTool,
  searchTool,
  fetchUrlTool,
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
  searchTool,
  searchSchema,
  fetchUrlTool,
  fetchUrlSchema,
}
