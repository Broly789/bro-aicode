#!/usr/bin/env bun

import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { createCliRenderer, ConsolePosition } from '@opentui/core'
import { createRoot } from '@opentui/react'
import { App } from './App'
import { getTopLayerId } from './lib/layers'
import { toast } from './components/toast'

// ── Bootstrap: detect workspace root ─────────────────────────────

const START_CWD = process.cwd()

function findProjectRoot(start: string): string {
  if (existsSync(join(start, '.git'))) return start
  if (existsSync(join(start, 'package.json'))) return start
  let dir = start
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, '.git'))) return dir
    if (existsSync(join(dir, 'brocode.json'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return start
}

const projectRoot = process.env.PROJECT_ROOT || findProjectRoot(START_CWD)
process.env.PROJECT_ROOT = projectRoot
console.log(`[brocode] PROJECT_ROOT=${projectRoot} CWD=${START_CWD} SERVER_URL=${process.env.SERVER_URL ?? 'http://localhost:3000'}`)

const envPath = join(projectRoot, '.env.local')
if (existsSync(envPath)) {
  const text = await Bun.file(envPath).text()
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (!(key in process.env)) {
      process.env[key] = val
    }
  }
}

// Server health check (non-blocking warning)
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000'
fetch(`${SERVER_URL}/health`)
  .then((r) => {
    if (!r.ok) console.warn(`[brocode] Server at ${SERVER_URL} returned ${r.status}`)
  })
  .catch(() => console.warn(`[brocode] Server not reachable at ${SERVER_URL}. Start server with: bun run dev:server`))

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
