import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { DialogOverlay, Dialog, useDialog } from './dialog'
import { format, isToday, isYesterday } from 'date-fns'
import {
  useSessions,
  refreshSessions,
  type SessionItem,
} from '../lib/sessions-store'
import { DialogSearchList } from './search-list-dialog'

function dateLabel(iso: string): string {
  const d = new Date(iso)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d, yyyy')
}

function timeLabel(iso: string): string {
  return format(new Date(iso), 'h:mm a')
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

export function SessionsDialog() {
  const { isOpen, close } = useDialog()
  const navigate = useNavigate()
  const { sessions } = useSessions()
  const openCount = useRef(0)

  if (isOpen) openCount.current++

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
        <text fg={isSelected ? '#1a1a2e' : '#888'} marginRight={2}>
          {dateLabel(item.createdAt)} {timeLabel(item.createdAt)}
        </text>
        <text fg={isSelected ? '#1a1a2e' : '#888'}>
          {item.messageCount} msgs
        </text>
      </>
    ),
    [],
  )

  if (!isOpen) return null

  return (
    <DialogOverlay>
      <Dialog title="Sessions" maxWidth={75}>
        <DialogSearchList
          resetKey={openCount.current}
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
