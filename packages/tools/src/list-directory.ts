import { z } from 'zod'

export const listDirectorySchema = z.object({
  path: z.string().describe('Directory path to list'),
})

export const listDirectoryTool = {
  name: 'listDirectory' as const,
  description: 'List files and directories in a directory',
  inputSchema: listDirectorySchema,
}
