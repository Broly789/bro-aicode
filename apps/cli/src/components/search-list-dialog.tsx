import { useCallback, useRef, useState, type ReactNode } from 'react'
import {
  TextAttributes,
  type InputRenderable,
  type ScrollBoxRenderable,
} from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { DialogOverlay, Dialog } from './dialog'

const MAX_VISIBLE_ITEMS = 10

// ── Reusable search + list core ────────────────────────────────────

type DialogSearchListProps<T> = {
  items: T[]
  onSelect: (item: T) => void
  onHighlight?: (item: T) => void
  filterFn: (item: T, query: string) => boolean
  renderItem: (item: T, isSelected: boolean) => ReactNode
  getKey: (item: T) => string
  placeholder?: string
  emptyText?: string
  maxVisibleOptions?: number
}

export function DialogSearchList<T>({
  items,
  onSelect,
  onHighlight,
  filterFn,
  renderItem,
  getKey,
  placeholder = 'Search',
  emptyText = 'No results',
  maxVisibleOptions = MAX_VISIBLE_ITEMS,
}: DialogSearchListProps<T>) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchValue, setSearchValue] = useState('')
  const inputRef = useRef<InputRenderable>(null)
  const scrollRef = useRef<ScrollBoxRenderable>(null)

  const handleInput = useCallback(() => {
    const text = inputRef.current?.value ?? ''
    setSearchValue(text)
    setSelectedIndex(0)
    scrollRef.current?.scrollTo(0)
  }, [])

  const filtered = searchValue
    ? items.filter((item) => filterFn(item, searchValue))
    : items

  const visibleHeight = Math.min(filtered.length, maxVisibleOptions)

  useKeyboard((key) => {
    if (key.name === 'return' || key.name === 'enter') {
      const item = filtered[selectedIndex]
      if (item) onSelect(item)
    } else if (key.name === 'up') {
      setSelectedIndex((i) => {
        const newIndex = Math.max(0, i - 1)
        const sb = scrollRef.current
        if (sb && newIndex < sb.scrollTop) sb.scrollTo(newIndex)
        const item = filtered[newIndex]
        if (item && onHighlight) onHighlight(item)
        return newIndex
      })
    } else if (key.name === 'down') {
      setSelectedIndex((i) => {
        const newIndex = Math.min(filtered.length - 1, i + 1)
        const sb = scrollRef.current
        if (sb) {
          const vpHeight = sb.viewport.height
          const visibleEnd = sb.scrollTop + vpHeight - 1
          if (newIndex > visibleEnd) {
            sb.scrollTo(newIndex - vpHeight + 1)
          }
        }
        const item = filtered[newIndex]
        if (item && onHighlight) onHighlight(item)
        return newIndex
      })
    }
  })

  return (
    <box flexDirection="column" gap={1}>
      <input
        ref={inputRef}
        placeholder={placeholder}
        focused
        onInput={handleInput}
      />
      {filtered.length === 0 ? (
        <text attributes={TextAttributes.DIM}>{emptyText}</text>
      ) : (
        <scrollbox ref={scrollRef} height={visibleHeight || 1}>
          {filtered.map((item, i) => {
            const isSelected = i === selectedIndex
            return (
              <box
                key={getKey(item)}
                flexDirection="row"
                height={1}
                overflow="hidden"
                backgroundColor={isSelected ? '#1a3a5c' : undefined}
                onMouseMove={() => {
                  setSelectedIndex(i)
                  if (onHighlight) onHighlight(item)
                }}
                onMouseDown={() => onSelect(item)}
              >
                {renderItem(item, isSelected)}
              </box>
            )
          })}
        </scrollbox>
      )}
    </box>
  )
}

// ── Concrete Sessions-dialog variant ───────────────────────────────

export type SearchOption = {
  id: string
  label: string
}

type SearchListDialogProps = {
  title?: string
  options: SearchOption[]
  placeholder?: string
  maxWidth?: number
  maxVisibleOptions?: number
  onSelect: (option: SearchOption) => void
}

export function SearchListDialog({
  title,
  options,
  placeholder = 'Search...',
  maxWidth,
  maxVisibleOptions = MAX_VISIBLE_ITEMS,
  onSelect,
}: SearchListDialogProps) {
  const defaultFilter = useCallback(
    (item: SearchOption, query: string) =>
      item.label.toLowerCase().includes(query.toLowerCase()),
    [],
  )

  const defaultRender = useCallback(
    (item: SearchOption) => <text>{item.label}</text>,
    [],
  )

  return (
    <DialogOverlay>
      <Dialog title={title} maxWidth={maxWidth}>
        <DialogSearchList
          items={options}
          onSelect={onSelect}
          filterFn={defaultFilter}
          renderItem={defaultRender}
          getKey={(o) => o.id}
          placeholder={placeholder}
          emptyText="No sessions found"
          maxVisibleOptions={maxVisibleOptions}
        />
      </Dialog>
    </DialogOverlay>
  )
}
