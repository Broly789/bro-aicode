import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  TextAttributes,
  type InputRenderable,
  type ScrollBoxRenderable,
} from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { useNavigate } from 'react-router'
import { DialogOverlay, Dialog, useDialog } from './dialog'
import { format, isToday, isYesterday } from 'date-fns'
import {
  useSessions,
  refreshSessions,
  type SessionItem,
} from '../lib/sessions-store'

type DateGroup = {
  label: string
  sessions: SessionItem[]
}

const MAX_VISIBLE = 10

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

function buildGroups(items: SessionItem[]): DateGroup[] {
  const map = new Map<string, SessionItem[]>()
  for (const item of items) {
    const label = dateLabel(item.createdAt)
    const list = map.get(label) ?? []
    list.push(item)
    map.set(label, list)
  }
  return Array.from(map, ([label, sessions]) => ({ label, sessions }))
}

function flattened(
  groups: DateGroup[],
): { groupIdx: number; sessionIdx: number; item: SessionItem }[] {
  const result: { groupIdx: number; sessionIdx: number; item: SessionItem }[] =
    []
  for (let g = 0; g < groups.length; g++) {
    for (let s = 0; s < groups[g].sessions.length; s++) {
      result.push({ groupIdx: g, sessionIdx: s, item: groups[g].sessions[s] })
    }
  }
  return result
}

export function SessionsDialog() {
  const { isOpen, close } = useDialog()
  const navigate = useNavigate()
  const { sessions, loading } = useSessions()
  const [query, setQuery] = useState('')
  const inputRef = useRef<InputRenderable>(null)
  const scrollRef = useRef<ScrollBoxRenderable>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setSelectedIndex(0)
    refreshSessions()
  }, [isOpen])

  const groups = useMemo(() => buildGroups(sessions), [sessions])

  const filteredGroups = useMemo(() => {
    if (!query) return groups
    const lower = query.toLowerCase()
    return groups
      .map((g) => ({
        ...g,
        sessions: g.sessions.filter((s) =>
          s.title?.toLowerCase().includes(lower),
        ),
      }))
      .filter((g) => g.sessions.length > 0)
  }, [groups, query])

  const flatItems = useMemo(() => flattened(filteredGroups), [filteredGroups])

  const needsScroll = flatItems.length > MAX_VISIBLE

  useEffect(() => {
    if (!isOpen || flatItems.length === 0) return
    if (selectedIndex >= flatItems.length) {
      setSelectedIndex(Math.max(0, flatItems.length - 1))
      return
    }
    const item = flatItems[selectedIndex]
    if (!item) return
    const id = `session-${item.groupIdx}-${item.sessionIdx}`
    scrollRef.current?.scrollChildIntoView(id)
  }, [selectedIndex, flatItems, isOpen])

  const handleContentChange = useCallback(() => {
    const text = inputRef.current?.value ?? ''
    setQuery(text)
    setSelectedIndex(0)
    scrollRef.current?.scrollTo(0)
  }, [])

  const selectSession = useCallback(
    (item: SessionItem) => {
      navigate(`/session/${item.id}`)
      // Defer close() — navigate() must complete before this component
      // is removed from the render tree, otherwise the route change is lost.
      setTimeout(() => close(), 0)
    },
    [navigate, close],
  )

  useKeyboard((key) => {
    if (!isOpen) return

    if (key.name === 'return' || key.name === 'enter') {
      const item = flatItems[selectedIndex]
      if (item) selectSession(item.item)
    } else if (key.name === 'up') {
      setSelectedIndex((i) => Math.max(0, i - 1))
    } else if (key.name === 'down') {
      setSelectedIndex((i) => Math.min(flatItems.length - 1, i + 1))
    }
  })

  if (!isOpen) return null

  return (
    <DialogOverlay>
      <Dialog title="Sessions" maxWidth={75}>
        <box flexDirection="column" gap={1} width="100%">
          <input
            ref={inputRef}
            placeholder="Search sessions..."
            focused
            onContentChange={handleContentChange}
          />
          {loading ? (
            <text attributes={TextAttributes.DIM}>Loading...</text>
          ) : flatItems.length === 0 ? (
            <text attributes={TextAttributes.DIM}>
              {sessions.length === 0 ? 'No sessions' : 'No results'}
            </text>
          ) : (
            <scrollbox
              ref={scrollRef}
              width="100%"
              height={Math.min(flatItems.length, MAX_VISIBLE)}
              flexDirection="column"
              borderStyle="single"
              borderColor="#555"
              backgroundColor="#1a1a2e"
            >
              {filteredGroups.map((g, gi) => (
                <box
                  key={g.label}
                  flexDirection="column"
                  paddingTop={gi > 0 ? 1 : undefined}
                >
                  <text
                    fg="#AAA"
                    attributes={TextAttributes.BOLD}
                    paddingLeft={1}
                    paddingRight={1}
                  >
                    {g.label}
                  </text>
                  {g.sessions.map((s, si) => {
                    const idx = flatItems.findIndex(
                      (f) => f.groupIdx === gi && f.sessionIdx === si,
                    )
                    const isSelected = idx === selectedIndex
                    return (
                      <box
                        key={s.id}
                        id={`session-${gi}-${si}`}
                        height={1}
                        backgroundColor={isSelected ? '#00FFFF' : undefined}
                        onMouseDown={() => selectSession(s)}
                        onMouseMove={() => setSelectedIndex(idx)}
                      >
                        <box flexDirection="row" paddingLeft={1} paddingRight={1}>
                          <text
                            fg={isSelected ? '#1a1a2e' : '#00FFFF'}
                            attributes={
                              isSelected ? TextAttributes.BOLD : undefined
                            }
                            flexGrow={1}
                            flexShrink={1}
                          >
                            {truncate(s.title ?? 'Untitled', 26)}
                          </text>
                          <text
                            fg={isSelected ? '#1a1a2e' : '#888'}
                            attributes={TextAttributes.DIM}
                            marginRight={2}
                          >
                            {timeLabel(s.createdAt)}
                          </text>
                          <text
                            fg={isSelected ? '#1a1a2e' : '#888'}
                            attributes={TextAttributes.DIM}
                          >
                            {s.messageCount} msgs
                          </text>
                        </box>
                      </box>
                    )
                  })}
                </box>
              ))}
            </scrollbox>
          )}
        </box>
      </Dialog>
    </DialogOverlay>
  )
}
