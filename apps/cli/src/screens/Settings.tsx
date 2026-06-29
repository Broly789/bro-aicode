import { TextAttributes } from '@opentui/core'

export function Settings() {
  return (
    <box flexDirection="column" flexGrow={1}>
      <text fg="cyan" attributes={TextAttributes.BOLD} marginBottom={1}>
        Settings
      </text>
      <box flexDirection="column" gap={1}>
        <text>Theme: Dark</text>
        <text>Notifications: Enabled</text>
        <text attributes={TextAttributes.DIM}>Version 0.1.0</text>
      </box>
    </box>
  )
}
