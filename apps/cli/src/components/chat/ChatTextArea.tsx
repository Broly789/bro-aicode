import { useRef, useCallback, useEffect } from 'react'
import {
  type TextareaRenderable,
  type KeyBinding,
  type KeyEvent,
  TextAttributes,
} from '@opentui/core'
import { useModeContext } from '../../lib/modes'
import { useModelContext } from '../../lib/models'
import { useEffortContext } from '../../lib/efforts'
import { CommandList } from '../CommandList'
import { useCommandPopover } from '../../hooks/use-command-popover'
import { useFileMention } from '../../hooks/use-file-mention'
import { FileMentionList } from '../FileMentionList'
import { useLayerFocus, useLayerKeyboard, getTopLayerId } from '../../lib/layers'
import { useRenderer } from '@opentui/react'
import { EmptyBorder } from '../border'

export const TEXTAREA_KEY_BINDINGS: KeyBinding[] = [
  { name: 'return', action: 'submit' },
  { name: 'enter', action: 'submit' },
  { name: 'return', shift: true, action: 'newline' },
  { name: 'enter', shift: true, action: 'newline' },
]

type TextAreaProps = {
  onSubmit?: (value: string) => void
  disabled?: boolean
  layerId?: string
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

export function ChatTextArea({ onSubmit, disabled = false, layerId = 'home' }: TextAreaProps) {
  const textareaRef = useRef<TextareaRenderable>(null)
  const renderer = useRenderer()
  const { mode, think } = useModeContext()
  const { model } = useModelContext()
  const { effort } = useEffortContext()
  const isTopLayer = useLayerFocus(layerId)

  const {
    isOpen,
    commands,
    selectedIndex,
    syncValue,
    getSelectedCommandName,
    hoverIndex,
    clear,
  } = useCommandPopover()
  const {
    isOpen: isFileMentionOpen,
    files,
    selectedIndex: fileMentionIndex,
    syncValue: fileMentionSyncValue,
    handleInsert: handleFileInsert,
    hoverIndex: fileMentionHover,
    close: closeFileMention,
  } = useFileMention()

  // 清空文本时同步更新两个 syncValue
  useEffect(() => {
    const instance = textareaRef.current
    if (!instance) return

    const interval = setInterval(() => {
      const text = safeGetText(instance)
      syncValue(text)
      fileMentionSyncValue(text)
    }, 50)

    return () => {
      clearInterval(interval)
    }
  }, [syncValue, fileMentionSyncValue])

  const handleEscape = useCallback(() => {
    clear()
  }, [clear])

  useEffect(() => {
    const handler = (event: KeyEvent) => {
      if (event.name === 'escape') {
        if (getTopLayerId() !== 'home') return
        event.preventDefault()
        event.stopPropagation()
        handleEscape()
      }
    }
    renderer.keyInput.on('keypress', handler)
    return () => {
      renderer.keyInput.off('keypress', handler)
    }
  }, [renderer, handleEscape])

  useLayerKeyboard((event: KeyEvent) => {
    if (event.ctrl && event.name === 'c' && !disabled) {
      event.preventDefault()
      event.stopPropagation()
      const content = safeGetText(textareaRef.current)
      if (content.trim()) {
        safeSetText(textareaRef.current, '')
        clear()
        closeFileMention()
      } else {
        renderer.destroy()
      }
    }
  }, layerId)

  const handleSubmit = useCallback(() => {
    if (disabled) return

    const content = safeGetText(textareaRef.current)
    if (!content.trim()) return

    if (isFileMentionOpen) {
      const inserted = handleFileInsert(
        () => safeGetText(textareaRef.current),
        (t) => safeSetText(textareaRef.current, t),
      )
      if (inserted) {
        try { textareaRef.current?.gotoBufferEnd() } catch { }
        return
      }
    }

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
  }, [disabled, isOpen, isFileMentionOpen, getSelectedCommandName, handleFileInsert, clear, onSubmit])

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

  const handleFileSelect = useCallback(
    (index: number) => {
      const file = files[index]
      if (file) {
        const instance = textareaRef.current
        const text = safeGetText(instance)
        const beforeAtIndex = text.lastIndexOf('@')
        if (beforeAtIndex !== -1) {
          const before = text.slice(0, beforeAtIndex)
          const after = text.slice(beforeAtIndex + 1)
          const spaceIdx = after.indexOf(' ')
          const afterMention = spaceIdx !== -1 ? after.slice(spaceIdx) : ''
          const newText = before + '@' + file + ' ' + afterMention
          safeSetText(instance, newText)
          try { instance?.gotoBufferEnd() } catch { }
        }
        closeFileMention()
      }
    },
    [files, closeFileMention],
  )

  const modeColor = mode.id === 'build' ? '#d33682' : '#FFD700'
  const borderColor = disabled ? '#333' : modeColor

  return (
    <box flexShrink={0} flexDirection="column" paddingLeft={4} paddingRight={4} width={'100%'}>
      {isOpen && commands.length > 0 && (
        <box position="absolute" bottom={8} left={4} right={4}>
          <CommandList
            commands={commands}
            selectedIndex={selectedIndex}
            onSelect={handleCommandSelect}
            onHover={hoverIndex}
          />
        </box>
      )}
      {isFileMentionOpen && files.length > 0 && (
        <box position="absolute" bottom={8} left={4} right={4}>
          <FileMentionList
            files={files}
            selectedIndex={fileMentionIndex}
            onSelect={handleFileSelect}
            onHover={fileMentionHover}
          />
        </box>
      )}

      {/* 可以参考这个 https://github.com/anomalyco/opencode/blob/dev/packages/tui/src/component/prompt/index.tsx */}
      <box flexDirection="row">
        <box border={["left"]}
          borderColor={borderColor}
          customBorderChars={{
            ...EmptyBorder,
            vertical: "┃",
            bottomLeft: "╹",
          }} width={1} flexShrink={0} />
        <box flexGrow={1} backgroundColor="#292c29" padding={1} paddingTop={'2%'}>
          <textarea
            ref={textareaRef}
            placeholder={disabled ? 'Waiting...' : 'Ask anything...'}
            keyBindings={TEXTAREA_KEY_BINDINGS}
            minHeight={1}
            height={4}
            width={'100%'}
            wrapMode="word"
            focused={isTopLayer && !disabled}
          />
        </box>
      </box>
      <box flexDirection="row" justifyContent="space-between" gap={2} paddingLeft={1}>
        <box flexDirection="row" gap={1}>
          <text fg={modeColor} attributes={TextAttributes.BOLD}>
            {mode.label}
          </text>
          <text fg={think ? '#00FFFF' : '#555'} attributes={think ? TextAttributes.BOLD : TextAttributes.DIM}>
            {think ? 'think:on' : 'think:off'}
          </text>
          <text fg="#CCC" attributes={TextAttributes.DIM}>
            {model}
          </text>
          {think && (
            <text fg="#FFF" attributes={TextAttributes.BOLD}>
              effort:{effort}
            </text>
          )}
        </box>
        <text fg="#AAA" attributes={TextAttributes.DIM}>
          Shift+Enter newline
        </text>
      </box>
    </box>
  )
}
