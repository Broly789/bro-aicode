import { useRenderer } from '@opentui/react'
import { useNavigate } from 'react-router'
import { handleCommand } from '../lib/commands'
import { useDialog } from '../components/dialog'

export function useChatCommands() {
  const navigate = useNavigate()
  const renderer = useRenderer()
  const { open: openDialog } = useDialog()

  return (input: string) =>
    handleCommand(input, navigate, renderer, { openDialog })
}
