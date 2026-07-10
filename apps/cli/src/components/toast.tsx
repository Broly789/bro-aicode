import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import { TextAttributes } from '@opentui/core'
import { useRenderer } from '@opentui/react'
import { SplitBorder } from './border'

// ── Types ───────────────────────────────────────────────────────────

export type ToastType =
  | 'default'
  | 'success'
  | 'error'
  | 'info'
  | 'warning'
  | 'loading'

export type ToastOptions = {
  /** Optional bold heading shown above the message. */
  title?: string
  /** Secondary line shown under the message (Sonner `description`). */
  description?: string
  /** Auto-close delay in ms. `0` / `Infinity` = sticky (never auto-closes). */
  duration?: number
  /** Override the default per-type icon glyph. */
  icon?: string
  /** Stable id for dedupe / manual dismiss / promise updates. */
  id?: string
}

export type ToastData = ToastOptions & {
  id: string
  type: ToastType
  message: string
}

type ToastPromiseMessages<T> = {
  loading: string | ((data: T) => string)
  success: string | ((data: T) => string)
  error: string | ((err: unknown) => string)
  loadingOptions?: ToastOptions
  successOptions?: ToastOptions
  errorOptions?: ToastOptions
}

// ── Constants & per-type visual config ─────────────────────────────

const DEFAULT_DURATION = 4000
const TOAST_MAX_WIDTH = 48
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

const TOAST_VARIANTS: Record<ToastType, { glyph: string; color: string }> = {
  default: { glyph: '•', color: '#AAAAAA' },
  success: { glyph: '✓', color: '#22C55E' },
  error: { glyph: '✗', color: '#EF4444' },
  info: { glyph: 'ⓘ', color: '#3B82F6' },
  warning: { glyph: '⚠', color: '#F59E0B' },
  loading: { glyph: SPINNER_FRAMES[0], color: '#A78BFA' },
}

// ── Module-level pub/sub (works outside React, Sonner-style) ────────

const _addListeners = new Set<(toast: ToastData) => void>()
const _dismissListeners = new Set<(id: string | undefined) => void>()

let _idCounter = 0

function _nextId(): string {
  _idCounter += 1
  return `toast-${_idCounter}`
}

function _emitAdd(toast: ToastData): void {
  _addListeners.forEach((l) => l(toast))
}

function _emitDismiss(id: string | undefined): void {
  _dismissListeners.forEach((l) => l(id))
}

function _create(type: ToastType, message: string, options?: ToastOptions): string {
  const id = options?.id ?? _nextId()
  _emitAdd({ id, type, message, ...options })
  return id
}

/** Resolve a `string | ((data) => string)` message field (used by `promise`). */
function resolveMessage<T>(value: string | ((data: T) => string), data: T): string {
  return typeof value === 'function' ? value(data) : value
}

/**
 * Sonner-style imperative API. Callable from anywhere — no provider
 * import required at the call site (the provider only needs to be
 * mounted once high in the component tree).
 */
export const toast = Object.assign(
  // toast('message') / toast('message', { ... })
  (message: string, options?: ToastOptions): string =>
    _create('default', message, options),
  {
    success: (message: string, options?: ToastOptions): string =>
      _create('success', message, options),
    error: (message: string, options?: ToastOptions): string =>
      _create('error', message, options),
    info: (message: string, options?: ToastOptions): string =>
      _create('info', message, options),
    warning: (message: string, options?: ToastOptions): string =>
      _create('warning', message, options),
    /** Sticky toast that stays until `.dismiss(id)` or `.promise()` resolves it. */
    loading: (message: string, options?: ToastOptions): string =>
      _create('loading', message, { duration: Infinity, ...options }),
    /** Dismiss a specific toast (or all toasts when called with no arg). */
    dismiss: (id?: string): void => _emitDismiss(id),
    /**
     * Promise-driven toast (Sonner `toast.promise`).
     *
     * `loading` shows immediately; on resolve it swaps to `success`,
     * on reject to `error`. Each message may be a string or a function
     * receiving the resolved/rejected value.
     */
    promise<T>(
      promise: Promise<T> | (() => Promise<T>),
      msgs: ToastPromiseMessages<T>,
    ): Promise<T> {
      const id = _create('loading', resolveMessage(msgs.loading, undefined as T), {
        duration: Infinity,
        ...msgs.loadingOptions,
      })
      const run = typeof promise === 'function' ? promise() : promise
      return run
        .then((data) => {
          _emitAdd({
            id,
            type: 'success',
            message: resolveMessage(msgs.success, data),
            duration: msgs.successOptions?.duration ?? DEFAULT_DURATION,
            ...msgs.successOptions,
          })
          return data
        })
        .catch((err) => {
          _emitAdd({
            id,
            type: 'error',
            message: resolveMessage(msgs.error, err),
            duration: msgs.errorOptions?.duration ?? DEFAULT_DURATION,
            ...msgs.errorOptions,
          })
          throw err
        })
    },
  },
)

export type ToastFunction = typeof toast

// ── Context (for React components that prefer the hook) ─────────────

type ToastContextValue = {
  toasts: ToastData[]
  dismiss: (id?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ── Provider (mount once near the app root) ─────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const clearTimers = useCallback((id?: string) => {
    if (id) {
      const timer = timersRef.current.get(id)
      if (timer) {
        clearTimeout(timer)
        timersRef.current.delete(id)
      }
    } else {
      timersRef.current.forEach((timer) => clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [])

  const dismiss = useCallback(
    (id?: string) => {
      setToasts((prev) => (id ? prev.filter((t) => t.id !== id) : []))
      clearTimers(id)
    },
    [clearTimers],
  )

  const scheduleTimer = useCallback(
    (id: string, duration: number) => {
      if (duration === Infinity || duration <= 0) return
      const existing = timersRef.current.get(id)
      if (existing) clearTimeout(existing)
      timersRef.current.set(id, setTimeout(() => dismiss(id), duration))
    },
    [dismiss],
  )

  useEffect(() => {
    const onAdd = (incoming: ToastData) => {
      // Replace an existing toast with the same id (promise updates)
      setToasts((prev) => [...prev.filter((t) => t.id !== incoming.id), incoming])
      scheduleTimer(incoming.id, incoming.duration ?? DEFAULT_DURATION)
    }
    const onDismiss = (id: string | undefined) => dismiss(id)

    _addListeners.add(onAdd)
    _dismissListeners.add(onDismiss)
    return () => {
      _addListeners.delete(onAdd)
      _dismissListeners.delete(onDismiss)
    }
  }, [dismiss, scheduleTimer])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, dismiss }),
    [toasts, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} />
    </ToastContext.Provider>
  )
}

// ── Toaster (fixed top-right, absolute, above everything) ──────────

function Toaster({ toasts }: { toasts: ToastData[] }) {
  const [frame, setFrame] = useState(0)
  const renderer = useRenderer()

  // Animate the spinner only while at least one loading toast is visible
  const hasLoading = toasts.some((t) => t.type === 'loading')
  useEffect(() => {
    if (!hasLoading) return
    const tick = setInterval(
      () => setFrame((f) => (f + 1) % SPINNER_FRAMES.length),
      100,
    )
    return () => clearInterval(tick)
  }, [hasLoading])

  if (toasts.length === 0) return null

  const maxWidth = Math.min(TOAST_MAX_WIDTH, renderer.terminalWidth - 6)

  return (
    <box
      position="absolute"
      top={1}
      right={0}
      zIndex={10000}
      flexDirection="column"
      alignItems="flex-end"
      gap={1}
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} frame={frame} maxWidth={maxWidth} />
      ))}
    </box>
  )
}

function ToastCard({
  toast,
  frame,
  maxWidth,
}: {
  toast: ToastData
  frame: number
  maxWidth: number
}) {
  const { color, glyph: variantGlyph } = TOAST_VARIANTS[toast.type]
  const glyph =
    toast.type === 'loading' ? SPINNER_FRAMES[frame] : toast.icon ?? variantGlyph

  return (
    <box
      maxWidth={maxWidth}
      backgroundColor="#141414E6"
      borderColor={color}
      border={SplitBorder.border}
      customBorderChars={SplitBorder.customBorderChars}
      flexDirection="column"
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      gap={1}
    >
      {toast.title && (
        <text fg="#FFFFFF" attributes={TextAttributes.BOLD}>
          {toast.title}
        </text>
      )}
      <box flexDirection="row" gap={1} alignItems="flex-start">
        <text fg={color} attributes={TextAttributes.BOLD}>
          {glyph}
        </text>
        <box flexDirection="column" flexGrow={1}>
          <text fg="#FFFFFF" wrapMode="word" width="100%">
            {toast.message}
          </text>
          {toast.description && (
            <text fg="#999999" attributes={TextAttributes.DIM} wrapMode="word">
              {toast.description}
            </text>
          )}
        </box>
      </box>
    </box>
  )
}
