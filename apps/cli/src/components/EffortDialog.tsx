import { useCallback, useEffect, useRef, useState } from 'react'
import { TextAttributes } from '@opentui/core'
import { DialogOverlay, Dialog, useDialog } from './dialog'
import { useEffortContext } from '../lib/efforts'
import { useModeContext } from '../lib/modes'
import { useLayerKeyboard } from '../lib/layers'
import { toast } from './toast'
import type { ReasoningEffort } from '../lib/efforts'

type EffortItem = {
  id: ReasoningEffort
  label: string
  description: string
}

const EFFORTS: EffortItem[] = [
  { id: 'low', label: 'Low', description: 'Fast, less thorough reasoning' },
  { id: 'medium', label: 'Medium', description: 'Balanced speed and depth' },
  { id: 'high', label: 'High', description: 'Deep, thorough reasoning' },
]

export function EffortDialog() {
  const { isOpen, close, title } = useDialog()
  const { effort: currentEffort, setEffort } = useEffortContext()
  const { think, setThink } = useModeContext()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [resetKey, setResetKey] = useState(0)

  const open = isOpen && title === 'Effort'

  useEffect(() => {
    if (!open) return
    if (!think) setThink(true)
    const idx = EFFORTS.findIndex((e) => e.id === currentEffort)
    setSelectedIndex(idx >= 0 ? idx : 1)
    setResetKey((k) => k + 1)
  }, [open, currentEffort, think, setThink])

  const selectEffort = useCallback(
    (item: EffortItem) => {
      setEffort(item.id)
      toast(`Effort set to ${item.label}`, { title: 'Effort' })
      setTimeout(() => close(), 0)
    },
    [setEffort, close],
  )

  if (!open) return null

  return (
    <DialogOverlay>
      <Dialog title="Reasoning Effort" maxWidth={60}>
        <EffortList
          key={resetKey}
          selectedIndex={selectedIndex}
          setSelectedIndex={setSelectedIndex}
          onSelect={selectEffort}
          currentEffort={currentEffort}
        />
      </Dialog>
    </DialogOverlay>
  )
}

function EffortList({
  selectedIndex,
  setSelectedIndex,
  onSelect,
  currentEffort,
}: {
  selectedIndex: number
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  onSelect: (item: EffortItem) => void
  currentEffort: ReasoningEffort
}) {
  const selectedIndexRef = useRef(selectedIndex)
  selectedIndexRef.current = selectedIndex

  useLayerKeyboard((key) => {
    if (key.name === 'up') {
      setSelectedIndex((prev) => Math.max(0, prev - 1))
    } else if (key.name === 'down') {
      setSelectedIndex((prev) => Math.min(EFFORTS.length - 1, prev + 1))
    } else if (key.name === 'return' || key.name === 'enter') {
      const item = EFFORTS[selectedIndexRef.current]
      if (item) onSelect(item)
    }
  }, 'dialog')

  return (
    <box flexDirection="column" gap={0} width="100%">
      {EFFORTS.map((item, i) => {
        const isSelected = i === selectedIndex
        const isActive = item.id === currentEffort
        return (
          <box
            key={item.id}
            height={1}
            backgroundColor={isSelected ? '#00FFFF' : undefined}
            onMouseDown={() => onSelect(item)}
            onMouseOver={() => setSelectedIndex(i)}
            justifyContent='center'
          >
            <box flexDirection="row" gap={2} paddingLeft={1} paddingRight={1} justifyContent="center" alignItems="center">
              <text
                width={8}
                fg={isSelected ? '#1a1a2e' : '#CCC'}
                attributes={TextAttributes.BOLD}
              >
                {item.label}
              </text>
              <text
                flexGrow={1}
                fg={isSelected ? '#1a1a2e' : '#888'}
                attributes={TextAttributes.DIM}
              >
                {item.description}
              </text>
              {isActive && (
                <text width={9} fg={isSelected ? '#1a1a2e' : '#00FF00'}>
                  ● active
                </text>
              )}
            </box>
          </box>
        )
      })}
    </box>
  )
}
