import { useCallback, useRef, useState, useEffect, type ReactNode } from 'react'
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

  useEffect(() => {
    scrollRef.current?.scrollChildIntoView(`opt-${selectedIndex}`)
  }, [selectedIndex])

  const handleInput = useCallback(() => {
    const text = inputRef.current?.value ?? ''
    setSearchValue(text)
    setSelectedIndex(0)
  }, [])

  const filtered = searchValue
    ? items.filter((item) => filterFn(item, searchValue))
    : items

  const needsScroll = filtered.length > maxVisibleOptions

  useKeyboard((key) => {
    if (key.name === 'return' || key.name === 'enter') {
      const item = filtered[selectedIndex]
      if (item) onSelect(item)
    } else if (key.name === 'up') {
      setSelectedIndex((i) => Math.max(0, i - 1))
    } else if (key.name === 'down') {
      setSelectedIndex((i) => Math.min(filtered.length - 1, i + 1))
    }
  })

  return (
    <box flexDirection="column" gap={1} width="100%">
      <input
        ref={inputRef}
        placeholder={placeholder}
        focused
        onInput={handleInput}
      />
      {filtered.length === 0 ? (
        <text attributes={TextAttributes.DIM}>{emptyText}</text>
      ) : needsScroll ? (
        <scrollbox
          ref={scrollRef}
          width="100%"
          height={maxVisibleOptions}
          flexDirection="column"
          backgroundColor="#1a1a2e"
        >
          {filtered.map((item, i) => (
            <OptionRow
              key={getKey(item)}
              id={`opt-${i}`}
              isSelected={i === selectedIndex}
              onMouseDown={() => onSelect(item)}
              onMouseOver={() => {
                setSelectedIndex(i)
                if (onHighlight) onHighlight(item)
              }}
            >
              {renderItem(item, i === selectedIndex)}
            </OptionRow>
          ))}
        </scrollbox>
      ) : (
        <box width="100%" flexDirection="column" backgroundColor="#1a1a2e">
          {filtered.map((item, i) => (
            <OptionRow
              key={getKey(item)}
              id={`opt-${i}`}
              isSelected={i === selectedIndex}
              onMouseDown={() => onSelect(item)}
              onMouseOver={() => {
                setSelectedIndex(i)
                if (onHighlight) onHighlight(item)
              }}
            >
              {renderItem(item, i === selectedIndex)}
            </OptionRow>
          ))}
        </box>
      )}
    </box>
  )
}

function OptionRow({
  id,
  isSelected,
  onMouseDown,
  onMouseOver,
  children,
}: {
  id: string
  isSelected: boolean
  onMouseDown: () => void
  onMouseOver: () => void
  children: ReactNode
}) {
  return (
    <box
      id={id}
      height={1}
      backgroundColor={isSelected ? '#00FFFF' : undefined}
      onMouseDown={onMouseDown}
      onMouseOver={onMouseOver}
    >
      <box flexDirection="row" gap={2} paddingLeft={1} paddingRight={1}>
        {children}
      </box>
    </box>
  )
}

// ── Concrete Sessions-dialog variant ───────────────────────────────

export type SearchOption = {
  id: string
  label: string
  description?: string
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
    (item: SearchOption, isSelected: boolean) => (
      <>
        <text
          fg={isSelected ? '#1a1a2e' : '#00FFFF'}
          attributes={isSelected ? TextAttributes.BOLD : undefined}
        >
          {item.label}
        </text>
        {item.description && (
          <text
            fg={isSelected ? '#1a1a2e' : '#888'}
            attributes={TextAttributes.DIM}
          >
            {' '}
            {item.description}
          </text>
        )}
      </>
    ),
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
