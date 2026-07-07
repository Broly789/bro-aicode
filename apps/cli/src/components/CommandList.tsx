import { TextAttributes } from '@opentui/core'

export type Command = {
  name: string
  description: string
}

export const COMMANDS: Command[] = [
  { name: '/new', description: 'Start a new session' },
  { name: '/agents', description: 'Switch agent' },
  { name: '/connect', description: 'Connect provider' },
  { name: '/diff', description: 'Open diff viewer' },
  { name: '/editor', description: 'Open editor' },
  { name: '/exit', description: 'Exit the app' },
  { name: '/help', description: 'Help' },
  { name: '/init', description: 'guided AGENTS.md setup' },
  { name: '/mcps', description: 'Toggle MCPs' },
  { name: '/models', description: 'Switch model' },
  { name: '/move', description: 'Move the session to another project directory' },
]

type CommandListProps = {
  commands: Command[]
  selectedIndex: number
}

export function CommandList({ commands, selectedIndex }: CommandListProps) {
  if (commands.length === 0) return null

  return (
    <box
      flexDirection="column"
      borderStyle="single"
      borderColor="#555"
      backgroundColor="#1a1a2e"
      paddingLeft={1}
      paddingRight={1}
      flexShrink={0}
    >
      {commands.map((cmd, i) => {
        const isSelected = i === selectedIndex
        return (
          <box
            key={cmd.name}
            flexDirection="row"
            gap={2}
            backgroundColor={isSelected ? '#00FFFF' : undefined}
          >
            <text
              fg={isSelected ? '#1a1a2e' : '#00FFFF'}
              attributes={isSelected ? TextAttributes.BOLD : undefined}
            >
              {cmd.name.padEnd(14)}
            </text>
            <text
              fg={isSelected ? '#1a1a2e' : '#CCC'}
            >
              {cmd.description}
            </text>
          </box>
        )
      })}
    </box>
  )
}

export function filterCommands(query: string): Command[] {
  const q = query.toLowerCase()
  return COMMANDS.filter(
    (cmd) => cmd.name.toLowerCase().includes(q) || cmd.description.toLowerCase().includes(q),
  )
}
