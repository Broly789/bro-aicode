import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { DialogOverlay, Dialog, useDialog } from './dialog'
import {
  useSessions,
  refreshSessions,
  type SessionItem,
} from '../lib/sessions-store'
import { DialogSearchList } from './search-list-dialog'

function shanghaiDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' })
}

function dateLabel(iso: string): string {
  const d = new Date(iso)
  const today = shanghaiDate(new Date())
  const dateStr = shanghaiDate(d)
  if (dateStr === today) return 'Today'
  const yesterday = new Date(Date.now() - 86400000)
  if (dateStr === shanghaiDate(yesterday)) return 'Yesterday'
  return d.toLocaleDateString('en-US', {
    timeZone: 'Asia/Shanghai',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

export function SessionsDialog() {
  const { isOpen, close } = useDialog()
  const navigate = useNavigate()
  const { sessions } = useSessions()
  const wasOpen = useRef(false)
  const [resetKey, setResetKey] = useState(0)

  if (isOpen && !wasOpen.current) {
    wasOpen.current = true
    setResetKey((k) => k + 1)
  }
  if (!isOpen) wasOpen.current = false

  useEffect(() => {
    if (isOpen) refreshSessions()
  }, [isOpen])

  const selectSession = useCallback(
    (item: SessionItem) => {
      navigate(`/session/${item.id}`)
      logger('ai', item.id, item)
      setTimeout(() => close(), 0)
    },
    [navigate, close],
  )

  const filterFn = useCallback(
    (item: SessionItem, query: string) =>
      item.title?.toLowerCase().includes(query.toLowerCase()) ?? false,
    [],
  )

  const renderItem = useCallback(
    (item: SessionItem, isSelected: boolean) => (
      <>
        <text
          fg={isSelected ? '#1a1a2e' : '#00FFFF'}
          flexGrow={1}
          flexShrink={1}
        >
          {truncate(item.title ?? 'Untitled', 26)}
        </text>
        <text fg={isSelected ? '#1a1a2e' : '#888'} width={14}>
          {dateLabel(item.createdAt)}
        </text>
        <text fg={isSelected ? '#1a1a2e' : '#888'} width={6}>
          {timeLabel(item.createdAt)}
        </text>
        <text fg={isSelected ? '#1a1a2e' : '#888'} width={7}>
          {item.messageCount}msgs
        </text>
      </>
    ),
    [],
  )

  if (!isOpen) return null

  return (
    <DialogOverlay>
      <Dialog title="Sessions" maxWidth={65}>
        <DialogSearchList
          key={resetKey}
          items={sessions}
          onSelect={selectSession}
          filterFn={filterFn}
          renderItem={renderItem}
          getKey={(s) => s.id}
          placeholder="Search sessions..."
          emptyText={sessions.length === 0 ? 'No sessions' : 'No results'}
        />
      </Dialog>
    </DialogOverlay>
  )
}
