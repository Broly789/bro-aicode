import { z } from 'zod'

export const editFileSchema = z.object({
  path: z.string().describe('Path to the file to edit'),
  oldText: z.string().describe('Existing text to find and replace'),
  newText: z.string().describe('Replacement text'),
})

export const editFileTool = {
  name: 'editFile' as const,
  description: 'Replace existing text in a file',
  inputSchema: editFileSchema,
}
