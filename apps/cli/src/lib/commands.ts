import type { NavigateFunction } from 'react-router'
import type { CliRenderer } from '@opentui/core'
import { client } from './client'

type CommandAction = (navigate: NavigateFunction, renderer: CliRenderer) => Promise<void> | void

const COMMANDS: Record<string, { description: string; action: CommandAction }> = {
  '/new': {
    description: 'Start a new session',
    action: async (navigate) => {
      const res = await client.api.sessions.$post({})
      const { id } = (await res.json()) as { id: string }
      navigate(`/session/${id}`)
    },
  },
  '/exit': {
    description: 'Exit the app',
    action: (_navigate, renderer) => renderer.destroy(),
  },
  '/help': {
    description: 'Help',
    action: (navigate) => navigate('/about'),
  },
  '/agents': {
    description: 'Switch agent',
    action: (navigate) => navigate('/settings'),
  },
  '/connect': {
    description: 'Connect provider',
    action: (navigate) => navigate('/settings'),
  },
  '/diff': {
    description: 'Open diff viewer',
    action: () => {},
  },
  '/editor': {
    description: 'Open editor',
    action: () => {},
  },
  '/init': {
    description: 'guided AGENTS.md setup',
    action: () => {},
  },
  '/mcps': {
    description: 'Toggle MCPs',
    action: () => {},
  },
  '/models': {
    description: 'Switch model',
    action: (navigate) => navigate('/settings'),
  },
  '/move': {
    description: 'Move the session to another project directory',
    action: () => {},
  },
}

export async function handleCommand(value: string, navigate: NavigateFunction, renderer: CliRenderer): Promise<boolean> {
  if (!value.startsWith('/')) return false
  const cmd = COMMANDS[value]
  if (!cmd) return false
  await cmd.action(navigate, renderer)
  return true
}
