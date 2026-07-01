import { TextAttributes } from '@opentui/core'
import { useRouteError, isRouteErrorResponse } from 'react-router'

export function ErrorFallback() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error'

  return (
    <box flexDirection="column" padding={1}>
      <text fg="red" attributes={TextAttributes.BOLD}>Error</text>
      <text fg="red">{message}</text>
      {error instanceof Error && error.stack ? (
        <text fg="#666" attributes={TextAttributes.DIM}>
          {error.stack.split('\n').slice(0, 8).join('\n')}
        </text>
      ) : null}
    </box>
  )
}
