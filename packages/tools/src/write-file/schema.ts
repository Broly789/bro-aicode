import { z } from 'zod'

export const writeFileSchema = z.object({
  path: z.string().describe('Path to the file to write'),
  content: z.string().describe('Content to write to the file'),
})

export const writeFileTool = {
  name: 'writeFile' as const,
  description: 'Create or overwrite a file',
  inputSchema: writeFileSchema,
}
