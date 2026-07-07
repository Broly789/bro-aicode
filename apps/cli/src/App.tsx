import { RouterProvider } from 'react-router'
import { router } from './router'
import { ModeProvider } from './lib/modes'
import { DialogProvider } from './components/dialog'

export function App() {
  return (
    <ModeProvider>
      <DialogProvider>
        <RouterProvider router={router} />
      </DialogProvider>
    </ModeProvider>
  )
}
