import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { router } from './router'
import { ModeProvider } from './lib/modes'
import { DialogProvider } from './components/dialog'
import { preloadSessions } from './lib/sessions-store'

export function App() {
  useEffect(() => {
    preloadSessions()
  }, [])

  return (
    <ModeProvider>
      <DialogProvider>
        <box width="100%" height="100%">
          <RouterProvider router={router} />
        </box>
      </DialogProvider>
    </ModeProvider>
  )
}
