import { TextAttributes, type KeyEvent } from '@opentui/core'
import { useLayerKeyboard } from '../../lib/layers'

type ToolConfirmProps = {
  toolName: string
  input: unknown
  onConfirm: () => void
  onDeny: () => void
}

export function ToolConfirm({
  toolName,
  input,
  onConfirm,
  onDeny,
}: ToolConfirmProps) {
  useLayerKeyboard((event: KeyEvent) => {
    if (event.name === 'y') {
      event.preventDefault()
      onConfirm()
    }
    if (event.name === 'n') {
      event.preventDefault()
      onDeny()
    }
  }, 'chat')

  const inputEntries = Object.entries((input ?? {}) as Record<string, unknown>)
    .map(([k, v]) => {
      const val = typeof v === 'string' ? v : JSON.stringify(v)
      return `${k}: ${val.length > 60 ? val.slice(0, 57) + '...' : val}`
    })
    .join('  ')

  const confirmLabel = `Confirm ${toolName}`

  return (
    <box
      width="100%"
      borderStyle="single"
      borderColor="#ffa500"
      flexDirection="column"
      flexShrink={0}
    >
      <text
        fg="#ffa500"
        attributes={TextAttributes.BOLD}
        content={confirmLabel}
        height={1}
      />
      <text attributes={TextAttributes.DIM} height={1}>
        {inputEntries}
      </text>
      <text flexShrink={0} height={1}>
        <span fg="lightgreen" attributes={TextAttributes.BOLD}>
          Y
        </span>
        <span attributes={TextAttributes.DIM}>es </span>
        <span fg="red" attributes={TextAttributes.BOLD}>
          N
        </span>
        <span attributes={TextAttributes.DIM}>o</span>
      </text>
    </box>
  )
}
