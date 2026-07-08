import {
  useState,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import { TextAttributes, type KeyEvent } from '@opentui/core'
import { useLayer, useLayerKeyboard } from '../lib/layers'

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
  layerId?: string
}

export function DialogOverlay({ children, layerId = 'dialog' }: DialogOverlayProps) {
  const { close } = useDialog()
  const { isTopLayer, zIndex } = useLayer(layerId)

  useLayerKeyboard((event: KeyEvent) => {
    if (
      event.name === 'tab' ||
      ((event.name === 'h' || event.name === 's' || event.name === 'q') &&
        event.shift)
    ) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (event.name === 'escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
    }
    // Ctrl+C also closes the dialog
    if (event.ctrl && event.name === 'c') {
      event.preventDefault()
      event.stopPropagation()
      close()
    }
  }, layerId)

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
      zIndex={zIndex}
      onMouseDown={() => close()}
    >
      {children}
    </box>
  )
}

// ── Dialog ───────────────────────────────────────────────────────────

type DialogProps = {
  title?: string
  maxWidth?: number
  children?: ReactNode
}

export function Dialog({ title, maxWidth = 160, children }: DialogProps) {
  const { title: ctxTitle, close } = useDialog()
  const displayTitle = title ?? ctxTitle ?? 'Dialog'

  return (
    <box
      width={maxWidth}
      backgroundColor="#141414D9"
      flexDirection="column"
      onMouseDown={(e: unknown) => (e as { stopPropagation?: () => void }).stopPropagation?.()}
    >
      {/* Header */}
      <box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        height={1}
        paddingLeft={1}
        paddingRight={1}
        marginBottom={1}
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
