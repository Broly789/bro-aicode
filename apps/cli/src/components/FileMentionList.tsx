import { useRef, useEffect } from 'react'
import { TextAttributes, type ScrollBoxRenderable } from '@opentui/core'

const MAX_VISIBLE = 8

type FileMentionListProps = {
  files: string[]
  selectedIndex: number
  onSelect: (index: number) => void
  onHover: (index: number) => void
}

export function FileMentionList({
  files,
  selectedIndex,
  onSelect,
  onHover,
}: FileMentionListProps) {
  const scrollRef = useRef<ScrollBoxRenderable>(null)

  useEffect(() => {
    const sb = scrollRef.current
    if (!sb) return

    if (selectedIndex < sb.scrollTop) {
      sb.scrollTo(selectedIndex)
    } else {
      const viewportHeight = sb.viewport.height
      const visibleEnd = sb.scrollTop + viewportHeight - 1
      if (selectedIndex > visibleEnd) {
        sb.scrollTo(selectedIndex - viewportHeight + 1)
      }
    }
  }, [selectedIndex])

  if (files.length === 0) return null

  const visibleHeight = Math.min(files.length, MAX_VISIBLE)

  return (
    <box
      flexDirection="column"
      width="100%"
      borderStyle="single"
      borderColor="#555"
      backgroundColor="#1a1a2e"
    >
      <scrollbox
        ref={scrollRef}
        width="100%"
        height={visibleHeight}
        flexDirection="column"
      >
        {files.map((file, i) => (
          <FileRow
            key={file}
            file={file}
            isSelected={i === selectedIndex}
            onSelect={() => onSelect(i)}
            onHover={() => onHover(i)}
          />
        ))}
      </scrollbox>
    </box>
  )
}

function FileRow({
  file,
  isSelected,
  onSelect,
  onHover,
}: {
  file: string
  isSelected: boolean
  onSelect: () => void
  onHover: () => void
}) {
  return (
    <box
      flexDirection="row"
      height={1}
      overflow="hidden"
      backgroundColor={isSelected ? '#00FFFF' : undefined}
      onMouseDown={(e: unknown) => {
        ; (e as { stopPropagation?: () => void }).stopPropagation?.()
        onSelect()
      }}
      onMouseOver={onHover}
    >
      <text
        fg={isSelected ? '#1a1a2e' : '#CCC'}
        attributes={isSelected ? TextAttributes.BOLD : undefined}
      >
        {file}
      </text>
    </box>
  )
}
