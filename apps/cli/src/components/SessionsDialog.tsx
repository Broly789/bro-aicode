import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  TextAttributes,
  type InputRenderable,
  type ScrollBoxRenderable,
} from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { DialogOverlay, Dialog, useDialog } from './dialog'
import { client } from '../lib/client'
import { format, isToday, isYesterday } from 'date-fns'

// ── Types ──────────────────────────────────────────────────────────

type SessionItem = {
  id: string
  title: string | null
  messageCount: number
  createdAt: string
}

type DateGroup = {
  label: string
  sessions: SessionItem[]
}

const MAX_VISIBLE = 10

// ── Date helpers ───────────────────────────────────────────────────

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

// ── Component ──────────────────────────────────────────────────────

export function SessionsDialog() {
  const { isOpen, close } = useDialog()
  const [query, setQuery] = useState('')
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selGroup, setSelGroup] = useState(0)
  const [selIdx, setSelIdx] = useState(0)
  const inputRef = useRef<InputRenderable>(null)
  const scrollRef = useRef<ScrollBoxRenderable>(null)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    client.api.sessions
      .$get()
      .then((r) => r.json())
      .then((data) => {
        setLoading(false)
        setSessions(
          (data.sessions ?? []).map((s) => ({
            id: s.id,
            title: s.title,
            messageCount: s.messageCount,
            createdAt: s.createdAt,
          })),
        )
        setQuery('')
        setSelGroup(0)
        setSelIdx(0)
      })
      .catch(() => setLoading(false))
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

  const totalSelectable = filteredGroups.reduce(
    (sum, g) => sum + g.sessions.length,
    0,
  )
  const totalRows = filteredGroups.reduce(
    (sum, g) => sum + 1 + g.sessions.length,
    0,
  )
  const needsScroll = totalRows > MAX_VISIBLE + 1

  const linearToPos = useCallback(
    (linear: number) => {
      let remaining = linear
      for (let g = 0; g < filteredGroups.length; g++) {
        const len = filteredGroups[g].sessions.length
        if (remaining < len) return { groupIdx: g, sessionIdx: remaining }
        remaining -= len
      }
      return { groupIdx: 0, sessionIdx: 0 }
    },
    [filteredGroups],
  )

  const selectAt = useCallback((groupIdx: number, sessionIdx: number) => {
    setSelGroup(groupIdx)
    setSelIdx(sessionIdx)
  }, [])

  const handleInput = useCallback(() => {
    const text = inputRef.current?.value ?? ''
    setQuery(text)
    setSelGroup(0)
    setSelIdx(0)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollChildIntoView(`session-${selGroup}-${selIdx}`)
  }, [selGroup, selIdx])

  useKeyboard((key) => {
    if (key.name === 'return' || key.name === 'enter') {
      const s = filteredGroups[selGroup]?.sessions[selIdx]
      if (s) {
        console.log('Selected:', s.title)
        close()
      }
    } else if (key.name === 'up') {
      const current =
        filteredGroups
          .slice(0, selGroup)
          .reduce((sum, g) => sum + g.sessions.length, 0) + selIdx
      if (current <= 0) return
      const prev = current - 1
      const pos = linearToPos(prev)
      setSelGroup(pos.groupIdx)
      setSelIdx(pos.sessionIdx)
    } else if (key.name === 'down') {
      const current =
        filteredGroups
          .slice(0, selGroup)
          .reduce((sum, g) => sum + g.sessions.length, 0) + selIdx
      if (current >= totalSelectable - 1) return
      const next = current + 1
      const pos = linearToPos(next)
      setSelGroup(pos.groupIdx)
      setSelIdx(pos.sessionIdx)
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
            onInput={handleInput}
          />
          {loading ? (
            <text attributes={TextAttributes.DIM}>Loading...</text>
          ) : filteredGroups.length === 0 ? (
            <text attributes={TextAttributes.DIM}>
              {sessions.length === 0 ? 'No sessions' : 'No results'}
            </text>
          ) : needsScroll ? (
            <scrollbox
              ref={scrollRef}
              width="100%"
              height={MAX_VISIBLE}
              flexDirection="column"
              borderStyle="single"
              borderColor="#555"
              backgroundColor="#1a1a2e"
            >
              <GroupedList
                groups={filteredGroups}
                selGroup={selGroup}
                selIdx={selIdx}
                selectAt={selectAt}
                onSelect={(s) => {
                  console.log('Selected:', s.title)
                  close()
                }}
              />
            </scrollbox>
          ) : (
            <box
              width="100%"
              flexDirection="column"
              borderStyle="single"
              borderColor="#555"
              backgroundColor="#1a1a2e"
            >
              <GroupedList
                groups={filteredGroups}
                selGroup={selGroup}
                selIdx={selIdx}
                selectAt={selectAt}
                onSelect={(s) => {
                  console.log('Selected:', s.title)
                  close()
                }}
              />
            </box>
          )}
        </box>
      </Dialog>
    </DialogOverlay>
  )
}

// ── Grouped list render ───────────────────────────────────────────

function GroupedList({
  groups,
  selGroup,
  selIdx,
  selectAt,
  onSelect,
}: {
  groups: DateGroup[]
  selGroup: number
  selIdx: number
  selectAt: (groupIdx: number, sessionIdx: number) => void
  onSelect: (s: SessionItem) => void
}) {
  return (
    <>
      {groups.map((g, gi) => (
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
            const isSelected = gi === selGroup && si === selIdx
            return (
              <box
                key={s.id}
                id={`session-${gi}-${si}`}
                height={1}
                backgroundColor={isSelected ? '#00FFFF' : undefined}
                onMouseDown={() => onSelect(s)}
                onMouseOver={() => selectAt(gi, si)}
              >
                <box flexDirection="row" paddingLeft={1} paddingRight={1}>
                  <text
                    fg={isSelected ? '#1a1a2e' : '#00FFFF'}
                    attributes={isSelected ? TextAttributes.BOLD : undefined}
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
    </>
  )
}
