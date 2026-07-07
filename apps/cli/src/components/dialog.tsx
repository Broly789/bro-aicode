import {
  useState,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import { TextAttributes, type KeyEvent } from '@opentui/core'
import { useKeyboard } from '@opentui/react'

// ── Context ──────────────────────────────────────────────────────────

type DialogContextValue = {
  isOpen: boolean
  title: string
  open: (title?: string) => void
  close: () => void
  toggle: (title?: string) => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

export function useDialog() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialog must be used within DialogProvider')
  return ctx
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')

  const open = useCallback((newTitle?: string) => {
    if (newTitle) setTitle(newTitle)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggle = useCallback((newTitle?: string) => {
    setIsOpen((prev) => {
      if (!prev && newTitle) setTitle(newTitle)
      return !prev
    })
  }, [])

  return (
    <DialogContext.Provider value={{ isOpen, title, open, close, toggle }}>
      {children}
    </DialogContext.Provider>
  )
}

// ── Overlay ──────────────────────────────────────────────────────────

type DialogOverlayProps = {
  children: ReactNode
}

export function DialogOverlay({ children }: DialogOverlayProps) {
  const { close } = useDialog()

  return (
    <box
      position="absolute"
      left={0}
      top={0}
      width="100%"
      height="100%"
      backgroundColor="#000000"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      zIndex={100}
      onClick={close}
    >
      <box onClick={(e: unknown) => e}>{children}</box>
    </box>
  )
}

// ── Dialog ───────────────────────────────────────────────────────────

type DialogProps = {
  title?: string
  width?: number
  children?: ReactNode
}

export function Dialog({ title, width = 60, children }: DialogProps) {
  const { close, title: ctxTitle } = useDialog()
  const displayTitle = title ?? ctxTitle ?? 'Dialog'

  useKeyboard((event: KeyEvent) => {
    if (event.name === 'escape') {
      event.preventDefault()
      close()
    }
  })

  return (
    <box
      width={width}
      borderStyle="single"
      borderColor="#444"
      flexDirection="column"
      onClick={(e: unknown) => e}
    >
      {/* Header */}
      <box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        height={1}
        paddingLeft={1}
        paddingRight={1}
      >
        <text fg="#FFFFFF" attributes={TextAttributes.BOLD}>
          {displayTitle}
        </text>
        <text fg="#666" attributes={TextAttributes.DIM}>
          esc
        </text>
      </box>

      {/* Body */}
      <box
        flexDirection="column"
        flexGrow={1}
        paddingLeft={1}
        paddingRight={1}
        paddingBottom={1}
      >
        {children ?? (
          <text fg="#555" attributes={TextAttributes.DIM}>
            TODO
          </text>
        )}
      </box>
    </box>
  )
}
