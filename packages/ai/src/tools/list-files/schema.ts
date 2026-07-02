import { z } from 'zod'

export const listFilesSchema = z.object({
  path: z.string().describe('Directory path to list'),
})

export const listFilesTool = {
  name: 'listFiles' as const,
  description: 'List files and directories in a directory',
  inputSchema: listFilesSchema,
}
