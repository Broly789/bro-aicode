import { useRef, useCallback, useEffect, useState } from 'react'
import { type TextareaRenderable, type KeyBinding, type KeyEvent, TextAttributes } from '@opentui/core'
import { useRenderer } from '@opentui/react'
import { useModeContext } from '../lib/modes'
import { CommandList, filterCommands, type Command } from './CommandList'

const MODEL = process.env.AI_MODEL ?? 'unknown'

export const TEXTAREA_KEY_BINDINGS: KeyBinding[] = [
  { name: 'return', action: 'submit' },
  { name: 'enter', action: 'submit' },
  { name: 'return', shift: true, action: 'newline' },
  { name: 'enter', shift: true, action: 'newline' },
]

type TextAreaProps = {
  onSubmit?: (value: string) => void
  disabled?: boolean
}

export function TextArea({ onSubmit, disabled = false }: TextAreaProps) {
  const textareaRef = useRef<TextareaRenderable>(null)
  const { mode } = useModeContext()
  const renderer = useRenderer()

  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([])

  const isPopoverOpenRef = useRef(false)
  const disabledRef = useRef(false)
  const filteredCommandsRef = useRef<Command[]>([])
  const selectedIndexRef = useRef(0)
  const onSubmitRef = useRef(onSubmit)
  const lastQueryRef = useRef('')

  useEffect(() => { isPopoverOpenRef.current = isPopoverOpen }, [isPopoverOpen])
  useEffect(() => { disabledRef.current = disabled }, [disabled])
  useEffect(() => { filteredCommandsRef.current = filteredCommands }, [filteredCommands])
  useEffect(() => { selectedIndexRef.current = selectedIndex }, [selectedIndex])
  useEffect(() => { onSubmitRef.current = onSubmit }, [onSubmit])

  useEffect(() => {
    const instance = textareaRef.current
    if (!instance) return

    const interval = setInterval(() => {
      let value: string
      try {
        value = instance.plainText
      } catch {
        return
      }
      if (value.startsWith('/')) {
        const query = value.slice(1)
        if (query !== lastQueryRef.current) {
          lastQueryRef.current = query
          const filtered = filterCommands(query)
          setFilteredCommands(filtered)
          setIsPopoverOpen(filtered.length > 0)
          setSelectedIndex(0)
        } else if (!isPopoverOpenRef.current) {
          const filtered = filterCommands(query)
          setFilteredCommands(filtered)
          setIsPopoverOpen(filtered.length > 0)
        }
      } else {
        lastQueryRef.current = ''
        setIsPopoverOpen(false)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (key: KeyEvent) => {
      if (!isPopoverOpenRef.current || disabledRef.current) return

      switch (key.name) {
        case 'up':
          key.preventDefault()
          key.stopPropagation()
          setSelectedIndex((prev) => {
            const cmds = filteredCommandsRef.current
            return prev > 0 ? prev - 1 : cmds.length - 1
          })
          return
        case 'down':
          key.preventDefault()
          key.stopPropagation()
          setSelectedIndex((prev) => {
            const cmds = filteredCommandsRef.current
            return prev < cmds.length - 1 ? prev + 1 : 0
          })
          return
        case 'return':
        case 'enter':
          key.preventDefault()
          key.stopPropagation()
          if (filteredCommandsRef.current.length > 0) {
            const selected = filteredCommandsRef.current[selectedIndexRef.current]
            if (selected && onSubmitRef.current) {
              onSubmitRef.current(selected.name)
            }
            textareaRef.current?.setText('')
            lastQueryRef.current = ''
            setIsPopoverOpen(false)
          }
          return
        case 'escape':
          key.preventDefault()
          key.stopPropagation()
          lastQueryRef.current = ''
          setIsPopoverOpen(false)
          textareaRef.current?.setText('')
          return
      }
    }

    renderer.keyInput.on('keypress', handler)
    return () => {
      renderer.keyInput.off('keypress', handler)
    }
  }, [renderer])

  const handleSubmit = useCallback(() => {
    if (disabled || isPopoverOpen) return
    const instance = textareaRef.current
    if (!instance) return

    const content = instance.plainText.trim()
    if (content && onSubmit) {
      onSubmit(content)
    }
    instance.setText('')
  }, [disabled, onSubmit, isPopoverOpen])

  useEffect(() => {
    const instance = textareaRef.current
    if (!instance) return
    instance.onSubmit = handleSubmit
  }, [handleSubmit])

  const modeColor = mode.id === 'build' ? '#00FF00' : '#FFD700'
  const borderColor = disabled ? '#333' : modeColor

  return (
    <box flexShrink={0} flexDirection="column" paddingLeft={4} paddingRight={4}>
      {isPopoverOpen && filteredCommands.length > 0 && (
        <box position="absolute" bottom={7} left={4} right={4}>
          <CommandList
            commands={filteredCommands}
            selectedIndex={selectedIndex}
          />
        </box>
      )}

      <box flexDirection="row">
        <box
          width={1}
          backgroundColor={borderColor}
        />
        <box flexGrow={1} backgroundColor="#1a1a2e" paddingLeft={1} paddingRight={1}>
          <textarea
            ref={textareaRef}
            placeholder={disabled ? 'Waiting...' : 'Ask anything...'}
            keyBindings={TEXTAREA_KEY_BINDINGS}
            width="100%"
            height={5}
            wrapMode="word"
            focused={!disabled}
          />
        </box>
      </box>
      <box flexDirection="row" justifyContent="space-between" paddingLeft={1}>
        <box flexDirection="row" gap={2}>
          <text fg={modeColor} attributes={TextAttributes.BOLD}>
            {mode.label}
          </text>
          <text fg="#CCC" attributes={TextAttributes.DIM}>
            {MODEL}
          </text>
        </box>
        <text fg="#AAA" attributes={TextAttributes.DIM}>
          Enter send · Shift+Enter newline
        </text>
      </box>
    </box>
  )
}
