import { TextAttributes, type KeyEvent } from '@opentui/core'
import { useKeyboard, useRenderer } from '@opentui/react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { useModeContext } from '../lib/modes'

const navItems = [
  { key: 'h', path: '/', label: 'Home' },
  // { key: 'c', path: '/chat', label: 'Chat' },
  // { key: 'a', path: '/about', label: 'About' },
  { key: 's', path: '/settings', label: 'Settings' },
  // { key: 'l', path: '/llm', label: 'LLM' },
] as const

export function RootLayout() {
  const renderer = useRenderer()
  const navigate = useNavigate()
  const location = useLocation()
  const { mode, cycleMode } = useModeContext()

  useKeyboard((event: KeyEvent) => {
    if (event.name === 'h' && event.shift) navigate('/')
    // if (event.name === 'c' && event.shift) navigate('/chat')
    // if (event.name === 'a' && event.shift) navigate('/about')
    if (event.name === 's' && event.shift) navigate('/settings')
    // if (event.name === 'l' && event.shift) navigate('/llm')
    if (event.name === 'tab') cycleMode()
    if (event.name === 'q' && event.shift) renderer.destroy()
  })

  return (
    <box flexDirection="column" flexGrow={1}>
      <box
        flexDirection="row"
        justifyContent="space-between"
        paddingLeft={1}
        paddingRight={1}
        borderStyle="single"
        border={['bottom']}
      >
        <text attributes={TextAttributes.BOLD}>Brocode</text>
        <text attributes={TextAttributes.DIM}>{location.pathname}</text>
      </box>

      <box flexGrow={1} padding={1}>
        <Outlet />
      </box>

      <box
        flexDirection="row"
        justifyContent="center"
        gap={2}
        paddingTop={1}
        paddingBottom={1}
        borderStyle="single"
        border={['top']}
      >
        {navItems.map(({ key, path, label }) => (
          <text
            key={key}
            attributes={
              location.pathname === path
                ? TextAttributes.BOLD | TextAttributes.UNDERLINE
                : TextAttributes.NONE
            }
          >
            [S+{key.toUpperCase()}] {label}
          </text>
        ))}
        <text attributes={TextAttributes.DIM}>[Tab] {mode.label}</text>
        <text attributes={TextAttributes.DIM}>[Esc] Stop</text>
        <text attributes={TextAttributes.DIM}>[S+Q] Quit</text>
      </box>
    </box>
  )
}
