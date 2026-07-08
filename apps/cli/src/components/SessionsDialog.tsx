import { useDialog } from './dialog'
import { SearchListDialog, type SearchOption } from './search-list-dialog'

const DUMMY_SESSIONS: SearchOption[] = [
  { id: '1', label: 'Build AI agent', description: 'Vercel SDK integration' },
  { id: '2', label: 'Debug database', description: 'Connection pool issue' },
  { id: '3', label: 'Refactor rendering', description: 'Chat message components' },
  { id: '4', label: 'Search tool', description: 'API integration' },
  { id: '5', label: 'Design system', description: 'Component library' },
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
