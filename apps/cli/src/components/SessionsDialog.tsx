import { DialogOverlay, Dialog, useDialog } from './dialog'

export function SessionsDialog() {
  const { isOpen } = useDialog()

  if (!isOpen) return null

  return (
    <DialogOverlay>
      <Dialog title="Sessions">
        <text fg="#555">TODO: session list</text>
      </Dialog>
    </DialogOverlay>
  )
}
