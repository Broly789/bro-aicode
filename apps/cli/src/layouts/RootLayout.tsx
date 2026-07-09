import { TextAttributes, type KeyEvent } from '@opentui/core'
import { useRenderer } from '@opentui/react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { useModeContext } from '../lib/modes'
import { SessionsDialog } from '../components/SessionsDialog'
import { useGlobalKeyboard } from '../lib/layers'

const navItems = [
  { key: 'h', path: '/', label: 'Home' },
  { key: 's', path: '/settings', label: 'Settings' },
] as const

export function RootLayout() {
  const renderer = useRenderer()
  const navigate = useNavigate()
  const location = useLocation()
  const { mode, cycleMode } = useModeContext()

  useGlobalKeyboard((event: KeyEvent) => {
    if (event.name === 'h' && event.shift) navigate('/')
    if (event.name === 's' && event.shift) navigate('/settings')
    if (event.name === 't' && event.shift) navigate('/scrollbox-test')
    if (event.name === 'tab') cycleMode()
    if (event.name === 'q' && event.shift) renderer.destroy()
  })

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        paddingLeft={1}
        paddingRight={1}
        height={1}
        backgroundColor="#1a1a2e"
      >
        <text attributes={TextAttributes.BOLD} fg="#00FFFF">
          BROCODE
        </text>
        <text fg="#666" attributes={TextAttributes.DIM}>
          {location.pathname === '/' ? 'Home' : location.pathname}
        </text>
      </box>

      {/* Content */}
      <box flexGrow={1} padding={1}>
        <Outlet />
      </box>

      <SessionsDialog />

      {/* Footer */}
      <box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        paddingLeft={1}
        paddingRight={1}
        height={1}
        backgroundColor="#1a1a2e"
      >
        <box flexDirection="row" gap={2}>
          {navItems.map(({ key, path, label }) => (
            <text
              key={key}
              fg={location.pathname === path ? '#00FFFF' : '#888'}
              attributes={
                location.pathname === path
                  ? TextAttributes.BOLD
                  : TextAttributes.NONE
              }
            >
              [S+{key.toUpperCase()}] {label}
            </text>
          ))}
        </box>

        <box flexDirection="row" gap={2}>
          <text fg="#AAA" attributes={TextAttributes.DIM}>
            [Tab] Mode
          </text>
          <text fg="#AAA" attributes={TextAttributes.DIM}>
            [Esc] Back
          </text>
          <text fg="#AAA" attributes={TextAttributes.DIM}>
            [S+Q] Quit
          </text>
        </box>
      </box>

    </box>
  )
}
