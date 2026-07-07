import { useRef, useEffect } from 'react'
import { TextAttributes, type ScrollBoxRenderable } from '@opentui/core'
import { CHAT_COMMANDS } from '../lib/chat-commands'

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
  ...CHAT_COMMANDS.map((c) => ({ name: c.name, description: c.description })),
]

const VISIBLE_COUNT = 10

type CommandListProps = {
  commands: Command[]
  selectedIndex: number
  onSelect: (index: number) => void
  onHover: (index: number) => void
}

export function CommandList({ commands, selectedIndex, onSelect, onHover }: CommandListProps) {
  const scrollRef = useRef<ScrollBoxRenderable>(null)

  useEffect(() => {
    scrollRef.current?.scrollChildIntoView(`cmd-${selectedIndex}`)
  }, [selectedIndex])

  if (commands.length === 0) return null

  return (
    <scrollbox
      ref={scrollRef}
      width="100%"
      height={VISIBLE_COUNT}
      flexDirection="column"
      borderStyle="single"
      borderColor="#555"
      backgroundColor="#1a1a2e"
    >
      {commands.map((cmd, i) => {
        const isSelected = i === selectedIndex
        return (
          <box
            key={cmd.name}
            id={`cmd-${i}`}
            flexDirection="row"
            gap={2}
            height={1}
            backgroundColor={isSelected ? '#00FFFF' : undefined}
            onMouseDown={() => onSelect(i)}
            onMouseOver={() => onHover(i)}
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
    </scrollbox>
  )
}

export function filterCommands(query: string): Command[] {
  const q = query.toLowerCase()
  return COMMANDS.filter(
    (cmd) => cmd.name.toLowerCase().includes(q) || cmd.description.toLowerCase().includes(q),
  )
}
