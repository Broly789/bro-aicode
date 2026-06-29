import { TextAttributes, type KeyEvent } from '@opentui/core'
import { useKeyboard, useRenderer } from '@opentui/react'
import { Outlet, useLocation, useNavigate } from 'react-router'

const navItems = [
  { key: '1', path: '/', label: 'Home' },
  { key: '2', path: '/chat', label: 'Chat' },
  { key: '3', path: '/about', label: 'About' },
  { key: '4', path: '/settings', label: 'Settings' },
  { key: '5', path: '/llm', label: 'LLM' },
  { key: '6', path: '/ai-chat', label: 'AI Chat' },
] as const

export function RootLayout() {
  const renderer = useRenderer()
  const navigate = useNavigate()
  const location = useLocation()

  useKeyboard((event: KeyEvent) => {
    if (event.name === '1') navigate('/')
    if (event.name === '2') navigate('/chat')
    if (event.name === '3') navigate('/about')
    if (event.name === '4') navigate('/settings')
    if (event.name === '5') navigate('/llm')
    if (event.name === '6') navigate('/ai-chat')
    if (event.name === 'q') renderer.destroy()
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
        <text attributes={TextAttributes.DIM}>
          {location.pathname}
        </text>
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
            [{key}] {label}
          </text>
        ))}
        <text attributes={TextAttributes.DIM}>[q] Quit</text>
      </box>
    </box>
  )
}
