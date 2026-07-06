import { useRef, useCallback, useEffect } from 'react'
import { type TextareaRenderable, type KeyBinding, TextAttributes } from '@opentui/core'
import { useModeContext } from '../lib/modes'

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

  const modeColor = mode.id === 'build' ? '#00FF00' : '#FFD700'
  const borderColor = disabled ? '#333' : modeColor

  return (
    <box flexShrink={0} flexDirection="column" paddingLeft={4} paddingRight={4}>
      <box flexDirection="row">
        {/* 左侧高亮边框 */}
        <box
          width={1}
          backgroundColor={borderColor}
        />
        {/* 输入框 */}
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
