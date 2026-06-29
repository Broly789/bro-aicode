import { useState } from 'react'

export function TextArea() {
  const [value, setValue] = useState('')

  return (
    <box
      borderStyle="rounded"
      borderColor="#00FFFF"
      width="100%"
    >
      <textarea
        placeholder="Ask anything..."
        onInput={setValue}
        width="100%"
        height={6}
        backgroundColor="#0d1117"
        focusedBackgroundColor="#161b22"
        textColor="#e6edf3"
        focusedTextColor="#e6edf3"
        cursorColor="#00FFFF"
        placeholderColor="#484f58"
        wrapMode="word"
      />
    </box>
  )
}
