import { z } from 'zod'

export const readFileSchema = z.object({
  path: z.string().describe('Path to the file to read'),
})

export const readFileTool = {
  name: 'readFile' as const,
  description: 'Read a file from the filesystem',
  inputSchema: readFileSchema,
}
