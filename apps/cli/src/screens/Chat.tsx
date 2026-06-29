import { TextAttributes } from '@opentui/core'

export function Chat() {
  return (
    <box flexDirection="column" flexGrow={1}>
      <text fg="cyan" attributes={TextAttributes.BOLD} marginBottom={1}>
        Chat
      </text>
      <box
        flexGrow={1}
        borderStyle="rounded"
        borderColor="#555"
        padding={1}
        alignItems="center"
        justifyContent="center"
      >
        <text attributes={TextAttributes.DIM}>
          Messages will appear here
        </text>
      </box>
    </box>
  )
}
