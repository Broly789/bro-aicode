import { useState, createContext, useContext, type ReactNode } from 'react'
import { DEFAULT_MODEL_ID } from '@brocode/ai'

interface ModelContextValue {
  model: string
  setModel: (id: string) => void
}

const ModelContext = createContext<ModelContextValue | null>(null)

export function useModelContext() {
  const ctx = useContext(ModelContext)
  if (!ctx) throw new Error('useModelContext must be used within ModelProvider')
  return ctx
}

// Module-level model store for use outside React context (e.g. commands.ts)
let _currentModel = DEFAULT_MODEL_ID
export function getCurrentModel(): string { return _currentModel }

export function ModelProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState(DEFAULT_MODEL_ID)

  const syncSetModel = (id: string) => {
    _currentModel = id
    setModel(id)
  }

  return (
    <ModelContext.Provider value={{ model, setModel: syncSetModel }}>
      {children}
    </ModelContext.Provider>
  )
}
