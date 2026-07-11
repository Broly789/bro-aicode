import { useState, useCallback, createContext, useContext, type ReactNode } from 'react'
import { MODES, DEFAULT_MODE, isToolAllowed } from '@brocode/ai/client'
import type { Mode } from '@brocode/ai/client'

export type { Mode }

interface ModeContextValue {
  mode: Mode
  cycleMode: () => void
  isToolAllowed: (toolName: string) => boolean
  think: boolean
  toggleThink: () => void
  setThink: (v: boolean) => void
}

const ModeContext = createContext<ModeContextValue | null>(null)

export function useModeContext() {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useModeContext must be used within ModeProvider')
  return ctx
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(DEFAULT_MODE)
  const [think, setThink] = useState(true)

  const cycleMode = useCallback(() => {
    setMode((prev) => {
      const idx = MODES.findIndex((m) => m.id === prev.id)
      return MODES[(idx + 1) % MODES.length]
    })
  }, [])

  const toggleThink = useCallback(() => {
    setThink((prev) => !prev)
  }, [])

  const checkToolAllowed = useCallback(
    (toolName: string) => isToolAllowed(toolName, mode),
    [mode],
  )

  return (
    <ModeContext.Provider value={{ mode, cycleMode, isToolAllowed: checkToolAllowed, think, toggleThink, setThink }}>
      {children}
    </ModeContext.Provider>
  )
}
