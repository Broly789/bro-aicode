import { useRef, useState, useCallback, useEffect } from 'react'
import { DialogOverlay, Dialog } from './dialog'

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
  maxVisibleOptions = 10,
  onSelect,
}: SearchListDialogProps) {
  const [filtered, setFiltered] = useState(options)
  const queryRef = useRef('')

  const filterOptions = useCallback(
    (query: string) => {
      const lower = query.toLowerCase()
      setFiltered(
        lower
          ? options.filter((o) => o.label.toLowerCase().includes(lower))
          : options,
      )
    },
    [options],
  )

  const visibleCount = Math.min(filtered.length, maxVisibleOptions)

  return (
    <DialogOverlay>
      <Dialog title={title} maxWidth={maxWidth}>
        <input
          placeholder={placeholder}
          onInput={(value: string) => {
            queryRef.current = value
            filterOptions(value)
          }}
          width="100%"
          focused
          backgroundColor="#121212"
          focusedBackgroundColor="#1a1a1a"
        />
        <scrollbox
          flexDirection="column"
          height={visibleCount || 1}
        >
          {filtered.length > 0 ? (
            filtered.slice(0, maxVisibleOptions).map((opt) => (
              <box
                key={opt.id}
                height={1}
                onMouseDown={() => onSelect(opt)}
              >
                <text>{opt.label}</text>
              </box>
            ))
          ) : (
            <text fg="#555">No results</text>
          )}
        </scrollbox>
      </Dialog>
    </DialogOverlay>
  )
}
