import { useRef, useCallback, useEffect } from 'react'
import { type TextareaRenderable, type KeyBinding, type KeyEvent, TextAttributes } from '@opentui/core'
import { useRenderer } from '@opentui/react'
import { useModeContext } from '../lib/modes'
import { CHAT_COMMANDS } from '../lib/chat-commands'
import { CommandList } from './CommandList'
import { useCommandPopover } from '../hooks/use-command-popover'

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

function safeGetText(instance: TextareaRenderable | null): string {
  if (!instance) return ''
  try {
    return instance.plainText
  } catch {
    return ''
  }
}

function safeSetText(instance: TextareaRenderable | null, text: string) {
  if (!instance) return
  try {
    instance.setText(text)
  } catch { }
}

export function TextArea({ onSubmit, disabled = false }: TextAreaProps) {
  const textareaRef = useRef<TextareaRenderable>(null)
  const { mode } = useModeContext()
  const renderer = useRenderer()
  const { isOpen, commands, selectedIndex, syncValue, getSelectedCommandName, selectIndex, hoverIndex, clear } = useCommandPopover()

  useEffect(() => {
    const instance = textareaRef.current
    if (!instance) return

    const interval = setInterval(() => {
      syncValue(safeGetText(instance))
    }, 50)

    return () => clearInterval(interval)
  }, [syncValue])

  useEffect(() => {
    const handler = (key: KeyEvent) => {
      if (key.name === 'escape' && !disabled) {
        safeSetText(textareaRef.current, '')
        clear()
      }
    }

    renderer.keyInput.on('keypress', handler)
    return () => {
      renderer.keyInput.off('keypress', handler)
    }
  }, [renderer, disabled, clear])

  const handleSubmit = useCallback(() => {
    if (disabled) return

    const content = safeGetText(textareaRef.current)
    if (!content.trim()) return

    const commandName = getSelectedCommandName()
    if (commandName) {
      onSubmit?.(commandName)
      safeSetText(textareaRef.current, '')
      clear()
      return
    }

    if (isOpen) return

    onSubmit?.(content.trim())
    safeSetText(textareaRef.current, '')
  }, [disabled, isOpen, getSelectedCommandName, clear, onSubmit])

  useEffect(() => {
    const instance = textareaRef.current
    if (!instance) return
    instance.onSubmit = handleSubmit
  }, [handleSubmit])

  const handleCommandSelect = useCallback(
    (index: number) => {
      const cmd = commands[index]
      if (cmd) {
        onSubmit?.(cmd.name)
        safeSetText(textareaRef.current, '')
        clear()
      }
    },
    [commands, onSubmit, clear],
  )

  const modeColor = mode.id === 'build' ? '#00FF00' : '#FFD700'
  const borderColor = disabled ? '#333' : modeColor

  return (
    <box flexShrink={0} flexDirection="column" paddingLeft={4} paddingRight={4}>
      {isOpen && commands.length > 0 && (
        <box position="absolute" bottom={6} left={4} right={4}>
          <CommandList
            commands={commands}
            selectedIndex={selectedIndex}
            onSelect={handleCommandSelect}
            onHover={hoverIndex}
          />
        </box>
      )}

      <box flexDirection="row">
        <box width={1} backgroundColor={borderColor} />
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
