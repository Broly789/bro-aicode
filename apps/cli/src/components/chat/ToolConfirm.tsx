import { TextAttributes, type KeyEvent } from '@opentui/core'
import { useKeyboard } from '@opentui/react'

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
  useKeyboard((event: KeyEvent) => {
    if (event.name === 'y') onConfirm()
    if (event.name === 'n') onDeny()
  })

  const inputStr = JSON.stringify(input, null, 2)

  return (
    <box width="100%" borderStyle="single" borderColor="#ffa500" padding={1} flexDirection="column">
      <text fg="#ffa500" attributes={TextAttributes.BOLD}>⚠ Confirm {toolName}</text>
      <text attributes={TextAttributes.DIM} wrapMode="word">{inputStr}</text>
      <box height={1} />
      <text>
        <span fg="green" attributes={TextAttributes.BOLD}>Y</span>
        <span attributes={TextAttributes.DIM}>es  </span>
        <span fg="red" attributes={TextAttributes.BOLD}>N</span>
        <span attributes={TextAttributes.DIM}>o</span>
      </text>
    </box>
  )
}
