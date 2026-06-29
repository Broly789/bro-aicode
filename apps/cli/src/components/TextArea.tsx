import { useRef, useCallback, useEffect } from 'react'
import { type TextareaRenderable, type KeyBinding } from '@opentui/core'

// 和项目统一快捷键定义，对齐参考源码规范
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

  // 统一提交逻辑，和示例代码模式对齐
  const handleSubmit = useCallback(() => {
    if (disabled) return
    const instance = textareaRef.current
    if (!instance) return

    const content = instance.plainText.trim()
    if (content && onSubmit) {
      onSubmit(content)
    }
    // 提交后清空输入框
    instance.setText('')
  }, [disabled, onSubmit])

  // 组件挂载后绑定 onSubmit，替代无效的 onLayout
  useEffect(() => {
    const instance = textareaRef.current
    if (!instance) return
    instance.onSubmit = handleSubmit
  }, [handleSubmit])

  return (
    <box
      flexShrink={0}
      width="100%"
      backgroundColor="#0d1117"
      borderStyle="rounded"
      borderColor="#30363d"
    >
      <textarea
        ref={textareaRef}
        placeholder="Ask anything...
Enter to submit | Shift+Enter new line"
        keyBindings={TEXTAREA_KEY_BINDINGS}
        width="100%"
        height={8}
        backgroundColor="#0d1117"
        focusedBackgroundColor="#161b22"
        textColor="#e6edf3"
        focusedTextColor="#e6edf3"
        cursorColor="#00FFFF"
        placeholderColor="#484f58"
        wrapMode="word"
        focused={!disabled}
      />
    </box>
  )
}
