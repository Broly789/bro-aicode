import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import type { KeyEvent } from '@opentui/core'
import { useRenderer } from '@opentui/react'

// ── Module-level store ( readable outside React ) ────────────────────

let _topLayerId: string | null = null

/** Read the current top layer ID without React. */
export function getTopLayerId(): string | null {
  return _topLayerId
}

// ── Types ───────────────────────────────────────────────────────────

type LayerEntry = {
  id: string
  zIndex: number
}

type LayerContextValue = {
  layers: LayerEntry[]
  topLayerId: string | null
  pushLayer: (id: string) => void
  popLayer: (id: string) => void
  isTopLayer: (id: string) => boolean
}

// ── Context ─────────────────────────────────────────────────────────

const LayerContext = createContext<LayerContextValue | null>(null)

// ── Provider ────────────────────────────────────────────────────────

export function LayerProvider({ children }: { children: ReactNode }) {
  const [layers, setLayers] = useState<LayerEntry[]>([])

  const pushLayer = useCallback((id: string) => {
    setLayers((prev) => {
      if (prev.some((l) => l.id === id)) return prev
      return [...prev, { id, zIndex: 100 + prev.length * 10 }]
    })
  }, [])

  const popLayer = useCallback((id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id))
  }, [])

  const topLayerId = layers.length > 0 ? layers[layers.length - 1].id : null

  // Sync module-level store so index.tsx can read it
  _topLayerId = topLayerId

  const isTopLayer = useCallback(
    (id: string) => topLayerId === id,
    [topLayerId],
  )

  const value = useMemo(
    () => ({ layers, topLayerId, pushLayer, popLayer, isTopLayer }),
    [layers, topLayerId, pushLayer, popLayer, isTopLayer],
  )

  return <LayerContext.Provider value={value}>{children}</LayerContext.Provider>
}

// ── useLayerState ───────────────────────────────────────────────────

function useLayerState(id: string): LayerContextValue {
  const ctx = useContext(LayerContext)
  if (!ctx) throw new Error('useLayer must be used within LayerProvider')
  return ctx
}

// ── useLayer ────────────────────────────────────────────────────────

/**
 * Register a layer and track whether it's the topmost layer.
 *
 * Pushes `id` onto the layer stack on mount, pops on unmount.
 * Returns `{ isTopLayer, zIndex }` for the caller to use.
 */
export function useLayer(id: string): {
  isTopLayer: boolean
  zIndex: number
} {
  const { layers, topLayerId, pushLayer, popLayer } = useLayerState(id)

  useEffect(() => {
    pushLayer(id)
    return () => popLayer(id)
  }, [id, pushLayer, popLayer])

  const entry = layers.find((l) => l.id === id)
  const isTopLayer = topLayerId === id

  return {
    isTopLayer,
    zIndex: entry?.zIndex ?? 100,
  }
}

// ── useLayerKeyboard ────────────────────────────────────────────────

/**
 * Keyboard handler that only fires when the layer is the topmost.
 *
 * Uses a ref internally so the handler is always current, avoiding
 * stale closure issues. The handler is skipped entirely when
 * `isTopLayer` is false.
 */
export function useLayerKeyboard(
  handler: (event: KeyEvent) => void,
  layerId: string,
): void {
  const renderer = useRenderer()
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  const { isTopLayer } = useLayerState(layerId)

  useEffect(() => {
    const onKey = (event: KeyEvent) => {
      if (!isTopLayer(layerId)) return
      handlerRef.current(event)
    }

    renderer.keyInput.on('keypress', onKey)
    return () => {
      renderer.keyInput.off('keypress', onKey)
    }
  }, [renderer, isTopLayer])
}

// ── useLayerFocus ───────────────────────────────────────────────────

/**
 * Check whether the given layer is the topmost layer.
 *
 * Use this for child components (e.g. inputs, textareas) that need
 * to inherit focus from a parent layer without registering their own.
 */
export function useLayerFocus(layerId: string): boolean {
  const { isTopLayer } = useLayerState(layerId)
  return isTopLayer(layerId)
}

// ── useGlobalKeyboard ───────────────────────────────────────────────

/**
 * Keyboard handler that always fires, regardless of layer stack.
 * Use for app-level shortcuts like quit, toggle console, etc.
 */
export function useGlobalKeyboard(
  handler: (event: KeyEvent) => void,
): void {
  const renderer = useRenderer()
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const onKey = (event: KeyEvent) => {
      handlerRef.current(event)
    }

    renderer.keyInput.on('keypress', onKey)
    return () => {
      renderer.keyInput.off('keypress', onKey)
    }
  }, [renderer])
}
