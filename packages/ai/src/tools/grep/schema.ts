import { z } from 'zod'

export const grepSchema = z.object({
  pattern: z.string().describe('Regex pattern to search for'),
  path: z.string().optional().describe('Subdirectory to search in'),
})

export const grepTool = {
  name: 'grep' as const,
  description: 'Search file contents with a regex pattern',
  inputSchema: grepSchema,
}
