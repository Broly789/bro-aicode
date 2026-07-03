import { RouterProvider } from 'react-router'
import { router } from './router'
import { ModeProvider } from './lib/modes'

export function App() {
  return (
    <ModeProvider>
      <RouterProvider router={router} />
    </ModeProvider>
  )
}
