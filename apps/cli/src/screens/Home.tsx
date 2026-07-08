import { TextAttributes } from '@opentui/core'
import { useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { AsciiArt } from '../components/AsciiArt'
import { ChatTextArea } from '../components/chat/ChatTextArea'
import { client } from '../lib/client'
import { useChatCommands } from '../hooks/use-chat-commands'

const HomeRouteState = z.object({
  sessionExpired: z.boolean().default(false),
})

export function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const chatCommands = useChatCommands()

  const { sessionExpired } = HomeRouteState.parse(location.state ?? {})

  const handleSubmit = async (value: string) => {
    if (await chatCommands(value)) return
    const res = await client.api.sessions.$post({})
    const { id } = (await res.json()) as { id: string }
    navigate(`/session/${id}`, { state: { prompt: value } })
  }

  return (
    <box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
      paddingLeft={2}
      paddingRight={2}
    >
      {sessionExpired && (
        <box marginBottom={1} paddingX={2}>
          <text fg="yellow" attributes={TextAttributes.BOLD}>
            ⚠ Session expired or invalid. Start a new conversation.
          </text>
        </box>
      )}

      <AsciiArt font="slick" color="#00FFFF" />

      <box style={{ width: '100%', height: 1 }} />

      <text fg="#888" attributes={TextAttributes.DIM} marginBottom={1}>
        AI-powered coding assistant for your terminal
      </text>

      <ChatTextArea onSubmit={handleSubmit} />

      <box flexDirection="row" justifyContent="center" gap={3} marginTop={2}>
        <text fg="#666" attributes={TextAttributes.DIM}>
          [Tab] Switch mode
        </text>
        <text fg="#666" attributes={TextAttributes.DIM}>
          [Shift+Q] Quit
        </text>
      </box>
    </box>
  )
}
