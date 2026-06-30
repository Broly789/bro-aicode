import { zValidator } from '@hono/zod-validator'
import type { z } from 'zod'

export const validateJson = <T extends z.ZodTypeAny>(schema: T) =>
  zValidator('json', schema, (result, c) => {
    if (!result.success) {
      console.error(JSON.stringify(result.error.issues, null, 2))
      return c.json(
        { success: false, error: result.error.message, issues: result.error.issues },
        400,
      )
    }
  })
