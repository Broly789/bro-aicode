import { z } from 'zod'

export const bashSchema = z.object({
  command: z.string().describe('Shell command to execute'),
  description: z.string().optional().describe('What this command does'),
  timeout: z.number().optional().describe('Timeout in milliseconds'),
})

export const bashTool = {
  name: 'bash' as const,
  description: 'Execute a shell command and return the output',
  inputSchema: bashSchema,
}
