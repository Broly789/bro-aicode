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
  { name: '/editor', description: 'Open editor' },
  { name: '/exit', description: 'Exit the app' },
  { name: '/init', description: 'guided AGENTS.md setup' },
  { name: '/mcps', description: 'Toggle MCPs' },
  { name: '/models', description: 'Switch model' },
  { name: '/move', description: 'Move the session to another project directory' },
  ...CHAT_COMMANDS.map((c) => ({ name: c.name, description: c.description })),
]

const MAX_VISIBLE = 10

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

  const needsScroll = commands.length > MAX_VISIBLE

  if (needsScroll) {
    return (
      <scrollbox
        ref={scrollRef}
        width="100%"
        height={MAX_VISIBLE}
        flexDirection="column"
        borderStyle="single"
        borderColor="#555"
        backgroundColor="#1a1a2e"
      >
        {commands.map((cmd, i) => (
          <CommandRow key={cmd.name} cmd={cmd} i={i} selectedIndex={selectedIndex} onSelect={onSelect} onHover={onHover} />
        ))}
      </scrollbox>
    )
  }

  return (
    <box
      width="100%"
      flexDirection="column"
      borderStyle="single"
      borderColor="#555"
      backgroundColor="#1a1a2e"
    >
      {commands.map((cmd, i) => (
        <CommandRow key={cmd.name} cmd={cmd} i={i} selectedIndex={selectedIndex} onSelect={onSelect} onHover={onHover} />
      ))}
    </box>
  )
}

function CommandRow({ cmd, i, selectedIndex, onSelect, onHover }: { cmd: Command; i: number; selectedIndex: number; onSelect: (i: number) => void; onHover: (i: number) => void }) {
  const isSelected = i === selectedIndex
  return (
    <box
      id={`cmd-${i}`}
      flexDirection="row"
      gap={2}
      height={1}
      backgroundColor={isSelected ? '#00FFFF' : undefined}
      onMouseDown={() => onSelect(i)}
      onMouseOver={() => onHover(i)}
    >
      <text fg={isSelected ? '#1a1a2e' : '#00FFFF'} attributes={isSelected ? TextAttributes.BOLD : undefined}>
        {cmd.name.padEnd(14)}
      </text>
      <text fg={isSelected ? '#1a1a2e' : '#CCC'}>
        {cmd.description}
      </text>
    </box>
  )
}

export function filterCommands(query: string): Command[] {
  return COMMANDS.filter((cmd) => cmd.name.toLowerCase().startsWith('/' + query.toLowerCase()))
}
