import { readFileTool } from './read-file/schema'
import { writeFileTool } from './write-file/schema'
import { editFileTool } from './edit-file/schema'
import { listFilesTool } from './list-files/schema'
import { globTool } from './glob/schema'
import { grepTool } from './grep/schema'
import { bashTool } from './bash/schema'
import { searchTool } from './search/schema'
import { fetchUrlTool } from './fetch-url/schema'

export const toolSchemas = {
  [readFileTool.name]: readFileTool,
  [writeFileTool.name]: writeFileTool,
  [editFileTool.name]: editFileTool,
  [listFilesTool.name]: listFilesTool,
  [globTool.name]: globTool,
  [grepTool.name]: grepTool,
  [bashTool.name]: bashTool,
  [searchTool.name]: searchTool,
  ['fetch-url' as const]: fetchUrlTool,
} as const

export type ToolName = keyof typeof toolSchemas

export {
  readFileTool,
  writeFileTool,
  editFileTool,
  listFilesTool,
  globTool,
  grepTool,
  bashTool,
  searchTool,
  fetchUrlTool,
} from './read-file/schema'
export { readFileSchema } from './read-file/schema'
export { writeFileSchema } from './write-file/schema'
export { editFileSchema } from './edit-file/schema'
export { listFilesSchema } from './list-files/schema'
export { globSchema } from './glob/schema'
export { grepSchema } from './grep/schema'
export { bashSchema } from './bash/schema'
export { searchSchema } from './search/schema'
export { fetchUrlSchema } from './fetch-url/schema'
