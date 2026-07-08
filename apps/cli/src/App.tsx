import { RouterProvider } from 'react-router'
import { router } from './router'
import { ModeProvider } from './lib/modes'
import { DialogProvider } from './components/dialog'
import { SessionsDialog } from './components/SessionsDialog'

export function App() {
  return (
    <ModeProvider>
      <DialogProvider>
        <box width="100%" height="100%">
          <RouterProvider router={router} />
          <SessionsDialog />
        </box>
      </DialogProvider>
    </ModeProvider>
  )
}
