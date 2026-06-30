import { TextAttributes } from '@opentui/core'
import { useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { AsciiArt } from '../components/AsciiArt'
import { TextArea } from '../components/TextArea'
import { client } from '../lib/client'

const HomeRouteState = z.object({
  sessionExpired: z.boolean().default(false),
})

export function Home() {
  const navigate = useNavigate()
  const location = useLocation()

  const { sessionExpired } = HomeRouteState.parse(location.state ?? {})

  const handleSubmit = async (value: string) => {
    const res = await client.api.sessions.$post({})
    const { id } = (await res.json()) as { id: string }
    navigate(`/sessions/${id}`, { state: { prompt: value } })
  }

  return (
    <box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
    >
      {sessionExpired && (
        <box marginBottom={1}>
          <text fg="yellow" attributes={TextAttributes.BOLD}>
            Session expired or invalid. Start a new conversation.
          </text>
        </box>
      )}
      <AsciiArt font="slick" color="#00FFFF" />
      <box style={{ width: '100%', height: 1 }} />
      <TextArea onSubmit={handleSubmit} />
    </box>
  )
}
