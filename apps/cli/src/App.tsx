import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { router } from './router'
import { ModeProvider } from './lib/modes'
import { ModelProvider } from './lib/models'
import { DialogProvider } from './components/dialog'
import { ToastProvider } from './components/toast'
import { preloadSessions } from './lib/sessions-store'
import { LayerProvider } from './lib/layers'

export function App() {
  useEffect(() => {
    preloadSessions()
  }, [])

  return (
    <ToastProvider>
      <LayerProvider>
        <ModeProvider>
          <ModelProvider>
            <DialogProvider>
              <box width="100%" height="100%">
                <RouterProvider router={router} />
              </box>
            </DialogProvider>
          </ModelProvider>
        </ModeProvider>
      </LayerProvider>
    </ToastProvider>
  )
}
