import { createCliRenderer, ConsolePosition } from '@opentui/core'
import { createRoot } from '@opentui/react'
import { App } from './App'

const renderer = await createCliRenderer({
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
})

const cleanup = () => renderer.destroy()
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
