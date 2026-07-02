import { tool, zodSchema } from 'ai'
import { toolSchemas } from './tools/schemas'
import { systemInstructions } from './instructions'

export { systemInstructions }

const entries = Object.entries(toolSchemas) as [
  keyof typeof toolSchemas,
  (typeof toolSchemas)[keyof typeof toolSchemas],
][]

export const codingAgentTools = Object.fromEntries(
  entries.map(([name, def]) => [
    name,
    tool({
      description: def.description,
      parameters: zodSchema(def.inputSchema as never),
    }),
  ]),
) as {
  [K in keyof typeof toolSchemas]: ReturnType<typeof tool>
}
