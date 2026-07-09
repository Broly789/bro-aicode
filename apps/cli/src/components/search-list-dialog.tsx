import { useCallback, useRef, useState, useEffect, type ReactNode } from 'react'
import {
  TextAttributes,
  type InputRenderable,
  type ScrollBoxRenderable,
} from '@opentui/core'
import { DialogOverlay, Dialog, useDialog } from './dialog'
import { useLayerKeyboard } from '../lib/layers'

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
  const selectedIndexRef = useRef(0)
  const filteredRef = useRef<T[]>(items)

  useEffect(() => {
    scrollRef.current?.scrollChildIntoView(`opt-${selectedIndex}`)
  }, [selectedIndex])

  const handleInput = useCallback((value?: unknown) => {
    const text = typeof value === 'string' ? value : (inputRef.current?.value ?? '')
    setSearchValue(text)
    setSelectedIndex(0)
    selectedIndexRef.current = 0
  }, [])

  const filtered = searchValue
    ? items.filter((item) => filterFn(item, searchValue))
    : items

  filteredRef.current = filtered

  // Clamp selectedIndex when filtered list shrinks
  useEffect(() => {
    if (filtered.length > 0 && selectedIndex >= filtered.length) {
      setSelectedIndex(0)
      selectedIndexRef.current = 0
    }
  }, [filtered.length, selectedIndex])

  useLayerKeyboard((key) => {
    const currentFiltered = filteredRef.current
    const currentSelectedIndex = selectedIndexRef.current
    if (key.name === 'return' || key.name === 'enter') {
      const item = currentFiltered[currentSelectedIndex]
      if (item) onSelect(item)
    } else if (key.name === 'up') {
      const next = Math.max(0, currentSelectedIndex - 1)
      setSelectedIndex(next)
      selectedIndexRef.current = next
    } else if (key.name === 'down') {
      const next = Math.min(currentFiltered.length - 1, currentSelectedIndex + 1)
      setSelectedIndex(next)
      selectedIndexRef.current = next
    }
  }, 'dialog')

  return (
    <box flexDirection="column" gap={1} width="100%">
      <input
        ref={inputRef}
        placeholder={placeholder}
        focused
        onInput={handleInput}
        onMouseDown={(e: unknown) => (e as { stopPropagation?: () => void }).stopPropagation?.()}
      />
      {filtered.length === 0 ? (
        <text attributes={TextAttributes.DIM}>{emptyText}</text>
      ) : (
        <scrollbox
          key={searchValue ? 'filtered' : 'all'}
          ref={scrollRef}
          width="100%"
          height={maxVisibleOptions}
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
      onMouseDown={(e: unknown) => {
        ;(e as { stopPropagation?: () => void }).stopPropagation?.()
        onMouseDown()
      }}
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
  const { isOpen } = useDialog()
  const wasOpen = useRef(false)
  const [resetKey, setResetKey] = useState(0)

  if (isOpen && !wasOpen.current) {
    wasOpen.current = true
    setResetKey((k) => k + 1)
  }
  if (!isOpen) wasOpen.current = false

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
          key={resetKey}
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
