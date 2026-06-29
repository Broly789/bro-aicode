import { TextAttributes } from '@opentui/core'
import { useCompletion } from '@ai-sdk/react'
import { useEffect, useRef } from 'react'

const serverUrl = process.env.SERVER_URL ?? 'http://localhost:3000'

export function Llm() {
  const { completion, complete, isLoading, error } = useCompletion({
    api: `${serverUrl}/api/llm-test`,
    streamProtocol: 'text',
  })
  const triggered = useRef(false)

  useEffect(() => {
    if (triggered.current) return
    triggered.current = true
    complete('周杰伦的妻子英文名')
  }, [])

  return (
    <box flexDirection="column" flexGrow={1}>
      <text fg="cyan" attributes={TextAttributes.BOLD} marginBottom={1}>
        LLM
      </text>
      <box flexGrow={1} borderStyle="rounded" borderColor="#555" padding={1}>
        {error ? (
          <text fg="red">Error: {error.message}</text>
        ) : isLoading && !completion ? (
          <text>Loading...</text>
        ) : (
          <text>{completion}</text>
        )}
      </box>
    </box>
  )
}
