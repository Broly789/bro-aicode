import { useState, useCallback, createContext, useContext, type ReactNode } from 'react'
import type { ReasoningEffort } from '@brocode/ai/client'
import { DEFAULT_REASONING_EFFORT } from '@brocode/ai/client'

export type { ReasoningEffort }

const EFFORT_CYCLE: ReasoningEffort[] = ['low', 'medium', 'high']

interface EffortContextValue {
  effort: ReasoningEffort
  setEffort: (effort: ReasoningEffort) => void
  cycleEffort: () => void
}

const EffortContext = createContext<EffortContextValue | null>(null)

export function useEffortContext() {
  const ctx = useContext(EffortContext)
  if (!ctx) throw new Error('useEffortContext must be used within EffortProvider')
  return ctx
}

export function EffortProvider({ children }: { children: ReactNode }) {
  const [effort, setEffort] = useState<ReasoningEffort>(DEFAULT_REASONING_EFFORT)

  const cycleEffort = useCallback(() => {
    setEffort((prev) => {
      const idx = EFFORT_CYCLE.indexOf(prev)
      return EFFORT_CYCLE[(idx + 1) % EFFORT_CYCLE.length]
    })
  }, [])

  return (
    <EffortContext.Provider value={{ effort, setEffort, cycleEffort }}>
      {children}
    </EffortContext.Provider>
  )
}
