export function About() {
  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box flexDirection="column" alignItems="center">
        <ascii-font text="BROCODE" font="tiny" color="#00FFFF" />
        <text>Terminal AI assistant · v0.1.0</text>
      </box>
    </box>
  )
}
