import { createCliRenderer } from '@opentui/core'
import { createRoot } from '@opentui/react'
import { App } from './App'

const renderer = await createCliRenderer()
createRoot(renderer).render(<App />)

const cleanup = () => renderer.destroy()
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
