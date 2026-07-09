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

  const needsScroll = files.length > MAX_VISIBLE

  if (needsScroll) {
    return (
      <scrollbox
        ref={scrollRef}
        width="100%"
        height={MAX_VISIBLE}
        borderStyle="single"
        borderColor="#555"
        backgroundColor="#1a1a2e"
        viewportCulling={false}
      >
        {files.map((file, i) => (
          <FileRow key={file} file={file} i={i} selectedIndex={selectedIndex} onSelect={onSelect} onHover={onHover} />
        ))}
      </scrollbox>
    )
  }

  return (
    <box
      width="100%"
      flexDirection="column"
      borderStyle="single"
      borderColor="#555"
      backgroundColor="#1a1a2e"
    >
      {files.map((file, i) => (
        <FileRow key={file} file={file} i={i} selectedIndex={selectedIndex} onSelect={onSelect} onHover={onHover} />
      ))}
    </box>
  )
}

function FileRow({ file, i, selectedIndex, onSelect, onHover }: { file: string; i: number; selectedIndex: number; onSelect: (i: number) => void; onHover: (i: number) => void }) {
  const isSelected = i === selectedIndex
  return (
    <box
      id={`file-${i}`}
      flexDirection="row"
      gap={2}
      height={1}
      backgroundColor={isSelected ? '#00FFFF' : undefined}
      onMouseDown={() => onSelect(i)}
      onMouseOver={() => onHover(i)}
    >
      <text fg={isSelected ? '#1a1a2e' : '#CCC'} attributes={isSelected ? TextAttributes.BOLD : undefined}>
        {file}
      </text>
    </box>
  )
}
