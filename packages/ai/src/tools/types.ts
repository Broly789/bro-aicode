import type { z } from 'zod'

export interface ToolSchema {
  name: string
  description: string
  inputSchema: z.ZodType<unknown>
}
