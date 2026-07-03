import { useRef, useCallback, useEffect } from 'react'
import { type TextareaRenderable, type KeyBinding } from '@opentui/core'
import { useModeContext } from '../lib/modes'

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

  const handleSubmit = useCallback(() => {
    if (disabled) return
    const instance = textareaRef.current
    if (!instance) return

    const content = instance.plainText.trim()
    if (content && onSubmit) {
      onSubmit(content)
    }
    instance.setText('')
  }, [disabled, onSubmit])

  useEffect(() => {
    const instance = textareaRef.current
    if (!instance) return
    instance.onSubmit = handleSubmit
  }, [handleSubmit])

  const modeColor = mode.id === 'build' ? 'green' : 'yellow'

  return (
    <box flexShrink={0} width="100%" flexDirection="column">
      <box borderStyle="rounded" borderColor="#00FFFF">
        <textarea
          ref={textareaRef}
          placeholder="Ask anything... Enter to submit | Shift+Enter new line"
          keyBindings={TEXTAREA_KEY_BINDINGS}
          width="100%"
          height={4}
          wrapMode="word"
          focused={!disabled}
        />
      </box>
      <text paddingLeft={1} fg={modeColor}>
        [{mode.label}] {mode.description}
      </text>
    </box>
  )
}
