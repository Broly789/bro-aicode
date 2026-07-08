import { useDialog } from './dialog'
import { SearchListDialog, type SearchOption } from './search-list-dialog'

const DUMMY_SESSIONS: SearchOption[] = [
  { id: '1', label: 'Build AI agent with Vercel SDK' },
  { id: '2', label: 'Debug database connection pool' },
  { id: '3', label: 'Refactor chat message rendering' },
  { id: '4', label: 'Add search tool integration' },
  { id: '5', label: 'Design system components' },
]

export function SessionsDialog() {
  const { isOpen, close } = useDialog()

  if (!isOpen) return null

  return (
    <SearchListDialog
      title="Sessions"
      options={DUMMY_SESSIONS}
      placeholder="Search sessions..."
      maxWidth={60}
      onSelect={(opt) => {
        console.log('Selected:', opt.label)
        close()
      }}
    />
  )
}
