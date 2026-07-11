import { createCliRenderer, ConsolePosition } from '@opentui/core'
import { createRoot } from '@opentui/react'
import { App } from './App'
import { getTopLayerId } from './lib/layers'
import { toast } from './components/toast'

/**
 * OpenTUI's `console.getCachedLogs()` reads an internal cache that is
 * DISABLED while the console panel is visible (show() calls
 * setCachingEnabled(false)). So copying via getCachedLogs() yields an
 * empty string whenever the panel is open. To get the full console
 * contents regardless of visibility, we keep our OWN ring buffer by
 * wrapping the (already activated) global.console methods right after
 * the renderer is created.
 */
const consoleLogs: string[] = []
const CONSOLE_LOG_CAP = 5000

function formatLogArgs(args: unknown[]): string {
  return args
    .map((a) =>
      typeof a === 'string' ? a : safeStringify(a),
    )
    .join(' ')
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function captureConsoleOutput(): void {
  const realConsole = global.console as unknown as Record<
    'log' | 'info' | 'warn' | 'error' | 'debug',
    (...args: unknown[]) => void
  >
  for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    const original = realConsole[method].bind(realConsole)
    realConsole[method] = (...args: unknown[]) => {
      // Append to our own ring buffer (independent of OpenTUI caching).
      consoleLogs.push(formatLogArgs(args))
      if (consoleLogs.length > CONSOLE_LOG_CAP) {
        consoleLogs.splice(0, consoleLogs.length - CONSOLE_LOG_CAP)
      }
      // Preserve OpenTUI's own console rendering.
      original(...args)
    }
  }
}

/**
 * Copy text to the system clipboard. Uses `pbcopy` on macOS and
 * `wl-copy`/`xclip` on Linux. Resolves true on success.
 */
function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return Promise.resolve(false)
  const stdin = new TextEncoder().encode(text)
  if (process.platform === 'darwin') {
    return Bun.spawn(['pbcopy'], { stdin }).exited.then(
      (code) => code === 0,
      () => false,
    )
  }
  if (process.platform === 'linux') {
    return Bun.spawn(['wl-copy'], { stdin }).exited.then(
      (code) =>
        code === 0
          ? true
          : Bun.spawn(['xclip', '-selection', 'clipboard', '-in'], { stdin })
              .exited.then((c) => c === 0, () => false),
      () => false,
    )
  }
  return Promise.resolve(false)
}

const renderer = await createCliRenderer({
  exitOnCtrlC: false,
  exitSignals: ['SIGTERM', 'SIGQUIT', 'SIGHUP', 'SIGABRT', 'SIGBREAK'],
  consoleOptions: {
    position: ConsolePosition.BOTTOM,
    sizePercent: 30,
    // Enables the built-in Ctrl+Shift+C (copy selection) action.
    onCopySelection: (text: string) => {
      if (!copyToClipboard(text)) {
        toast.error('Clipboard unavailable', { title: 'Console' })
      }
    },
  },
})

// Wrap global.console AFTER the renderer activated its own capture console,
// so our ring buffer fills with the full log stream.
captureConsoleOutput()

createRoot(renderer).render(<App />)

renderer.keyInput.on('keypress', (key) => {
  if (key.ctrl && key.name === '`') {
    renderer.console.toggle()
  }
  if (key.ctrl && key.name === 'l') {
    renderer.console.clear()
  }
  // Ctrl+A (also Ctrl+Shift+A): copy the ENTIRE console contents to the
  // clipboard, regardless of any selection. Only meaningful while the
  // console is open. Shift is optional because terminals often don't
  // report the shift modifier for Ctrl+letter combos.
  if (key.ctrl && (key.name === 'a' || key.name === 'A') && renderer.console.visible) {
    const text = consoleLogs.join('\n')
    copyToClipboard(text).then((ok) => {
      if (ok) {
        toast.success(`Copied console (${text.length} chars)`, { title: 'Console' })
      } else {
        toast.error('Clipboard unavailable (no pbcopy/wl-copy/xclip)', {
          title: 'Console',
        })
      }
    })
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
