import { createCliRenderer, ConsolePosition } from '@opentui/core'
import { createRoot } from '@opentui/react'
import { App } from './App'
import { getTopLayerId } from './lib/layers'

const renderer = await createCliRenderer({
  exitOnCtrlC: false,
  exitSignals: ['SIGTERM', 'SIGQUIT', 'SIGHUP', 'SIGABRT', 'SIGBREAK'],
  consoleOptions: {
    position: ConsolePosition.BOTTOM,
    sizePercent: 30,
  },
})
createRoot(renderer).render(<App />)

renderer.keyInput.on('keypress', (key) => {
  if (key.ctrl && key.name === '`') {
    renderer.console.toggle()
  }
  if (key.ctrl && key.name === 'l') {
    renderer.console.clear()
  }
  // Handle Ctrl+C with layer awareness
  if (key.ctrl && key.name === 'c') {
    // If any layer is active, let its handler deal with it (clear textarea,
    // stop streaming, close dialog, etc.) — do NOT exit.
    // Only exit when no layer is registered (bare app, before React mounts).
    if (getTopLayerId() === null) {
      renderer.destroy()
    }
  }
})

const cleanup = () => renderer.destroy()
process.on('SIGTERM', cleanup)
