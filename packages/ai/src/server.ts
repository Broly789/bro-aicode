import { tool, zodSchema } from 'ai'
import { toolSchemas } from './tools/schemas'
import { systemInstructions } from './instructions'

export { systemInstructions }

type ToolSchemaMap = typeof toolSchemas
type ToolName = keyof ToolSchemaMap

const toolNames = Object.keys(toolSchemas) as ToolName[]

export const codingAgentTools = toolNames.reduce(
  (acc, name) => {
    const def = toolSchemas[name]
    acc[name] = tool({
      description: def.description,
      inputSchema: zodSchema(def.inputSchema as never),
    })
    return acc
  },
  {} as { [K in ToolName]: ReturnType<typeof tool> },
)
