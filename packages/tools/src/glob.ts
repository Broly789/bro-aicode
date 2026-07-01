import { z } from 'zod'

export const globSchema = z.object({
  pattern: z.string().describe('Glob pattern to search for files'),
  path: z.string().optional().describe('Subdirectory to search in'),
})

export const globTool = {
  name: 'glob' as const,
  description: 'List files matching a glob pattern',
  inputSchema: globSchema,
}
