import { useState, useEffect } from 'react'
import { client } from './client'

export type SessionItem = {
  id: string
  title: string | null
  messageCount: number
  createdAt: string
}

const TTL = 60_000

let cache: SessionItem[] | null = null
let lastFetch = 0
let loading = false
let fetchPromise: Promise<void> | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((fn) => fn())
}

async function doFetch() {
  const hadCache = cache !== null
  if (!hadCache) {
    loading = true
    notify()
  }
  try {
    const res = await client.api.sessions.$get()
    const data = await res.json()
    cache = (data.sessions ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      messageCount: s.messageCount,
      createdAt: s.createdAt,
    }))
    lastFetch = Date.now()
  } finally {
    loading = false
    fetchPromise = null
    notify()
  }
}

function isStale(): boolean {
  return cache === null || Date.now() - lastFetch > TTL
}

export function preloadSessions(): void {
  if (!fetchPromise) {
    fetchPromise = doFetch()
  }
}

export function refreshSessions(): void {
  if (!fetchPromise && isStale()) {
    fetchPromise = doFetch()
  }
}

export function invalidateSessions(): void {
  if (Date.now() - lastFetch < TTL) {
    lastFetch = 0
  }
}

export function useSessions(): { sessions: SessionItem[]; loading: boolean } {
  const [state, setState] = useState(() => ({
    sessions: cache ?? [],
    loading: loading || (cache === null && fetchPromise !== null),
  }))

  useEffect(() => {
    const fn = () => {
      setState({
        sessions: cache ?? [],
        loading,
      })
    }
    listeners.add(fn)
    fn()
    return () => {
      listeners.delete(fn)
    }
  }, [])

  return state
}
