import { appendFileSync } from 'fs'
import { createCliRenderer } from '@opentui/core'
import { createRoot } from '@opentui/react'
import { App } from './App'

const LOG = '/tmp/brocode-debug.log'

// @ts-expect-error - global debug logging
globalThis.__opencodeDebug = (...args: unknown[]) => {
  try {
    appendFileSync(LOG, args.map(a => typeof a === 'string' ? a : JSON.stringify(a, null, 2)).join(' ') + '\n')
    process.stderr.write('[opencode] ' + args[0] + '\n')
  } catch {}
}

const renderer = await createCliRenderer()
createRoot(renderer).render(<App />)

const cleanup = () => renderer.destroy()
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
