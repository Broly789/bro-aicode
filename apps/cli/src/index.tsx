import { greet, PROJECT_NAME } from '@brocode/shared'
import { createCliRenderer, TextAttributes } from '@opentui/core'
import { createRoot, useOnResize } from '@opentui/react'

function App() {
  useOnResize(() => {

  })

  return (
    <box
      border
      padding={2}
      style={{
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      <text>
        <strong>{greet(PROJECT_NAME)}</strong>
      </text>
      <text>
        <span attributes={TextAttributes.DIM}>Press Ctrl+C to exit</span>
      </text>
    </box>
  )
}

const renderer = await createCliRenderer()
createRoot(renderer).render(<App />)

const cleanup = () => {
  renderer.destroy()
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
