import { AsciiArt } from '../components/AsciiArt'
import { TextArea } from '../components/TextArea'

export function Home() {
  return (
    <box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
    >
      <AsciiArt font="slick" color="#00FFFF" />
      <box style={{ width: '100%', height: 1 }} />
      <TextArea />
    </box>
  )
}
