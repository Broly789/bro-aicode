import { TextAttributes } from '@opentui/core'
import { useEffect, useState } from 'react'
import { client } from '../lib/client'

export function Chat() {
  const [status, setStatus] = useState('...')
  const [runtime, setRuntime] = useState('...')

  useEffect(() => {
    client.health.$get().then(async (res) => {
      const data = await res.json()
      setStatus(data.status)
      setRuntime(data.runtime)
    })
  }, [])

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
        <text>Server status: {status}</text>
        <text>Server runtime: {runtime}</text>
      </box>
    </box>
  )
}
