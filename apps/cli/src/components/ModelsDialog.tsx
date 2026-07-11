import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { TextAttributes } from '@opentui/core'
import { DialogOverlay, Dialog, useDialog } from './dialog'
import { DialogSearchList } from './search-list-dialog'
import { client } from '../lib/client'
import { useModelContext } from '../lib/models'
import { toast } from './toast'

type ModelItem = {
  id: string
  label: string
  provider: string
  supportsThinking: boolean
  configured: boolean
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

function extractSessionId(pathname: string): string | null {
  const m = pathname.match(/^\/session\/(.+)/)
  return m?.[1] ?? null
}

export function ModelsDialog() {
  const { isOpen, close, title } = useDialog()
  const { model: activeModel, setModel } = useModelContext()
  const location = useLocation()
  const [resetKey, setResetKey] = useState(0)
  const [models, setModels] = useState<ModelItem[]>([])
  const [loading, setLoading] = useState(false)

  const open = isOpen && title === 'Models'

  useEffect(() => {
    if (!open) return
    setResetKey((k) => k + 1)
    setLoading(true)
    setModels([])
    client.api.models
      .$get()
      .then(async (res) => {
        const { models } = (await res.json()) as { models: ModelItem[] }
        setModels(models)
      })
      .catch(() => setModels([]))
      .finally(() => setLoading(false))
  }, [open])

  const selectModel = useCallback(
    async (item: ModelItem) => {
      if (!item.configured) {
        toast(`No API key — add ${item.provider.toUpperCase()}_API_KEY to .env.local`, { title: 'Models' })
        return
      }
      setModel(item.id)

      const sessionId = extractSessionId(location.pathname)
      if (sessionId) {
        try {
          const res = await client.api.sessions[':sessionId'].model.$patch({
            param: { sessionId },
            json: { modelId: item.id },
          })
          if (!res.ok) console.warn('PATCH model failed', await res.text())
        } catch (e) {
          console.warn('PATCH model error', e)
        }
      }

      toast(`Model set to ${item.label}`, { title: 'Models' })
      setTimeout(() => close(), 0)
    },
    [setModel, close, location.pathname],
  )

  const filterFn = useCallback(
    (item: ModelItem, query: string) =>
      (item.label + ' ' + item.id + ' ' + item.provider)
        .toLowerCase()
        .includes(query.toLowerCase()),
    [],
  )

  const renderItem = useCallback(
    (item: ModelItem, isSelected: boolean) => (
      <>
        <text
          fg={isSelected ? '#1a1a2e' : item.configured ? '#00FFFF' : '#888'}
          flexGrow={1}
          flexShrink={1}
        >
          {truncate(item.label, 24)}
        </text>
        <text
          fg={isSelected ? '#1a1a2e' : '#666'}
          attributes={TextAttributes.DIM}
          width={10}
        >
          {item.provider}
        </text>
        {item.id === activeModel ? (
          <text fg={isSelected ? '#1a1a2e' : '#00FF00'} width={8}>
            ● active
          </text>
        ) : null}
        <text
          fg={isSelected ? '#1a1a2e' : item.configured ? '#00FF00' : '#FFAA00'}
          width={10}
        >
          {item.configured ? '✓ key' : '⚠ no key'}
        </text>
      </>
    ),
    [activeModel],
  )

  if (!open) return null

  return (
    <DialogOverlay>
      <Dialog title="Models" maxWidth={70}>
        {loading ? (
          <text attributes={TextAttributes.DIM}>Loading models…</text>
        ) : (
          <DialogSearchList
            key={resetKey}
            items={models}
            onSelect={selectModel}
            filterFn={filterFn}
            renderItem={renderItem}
            getKey={(m) => m.id}
            placeholder="Search models..."
            emptyText={models.length === 0 ? 'No models available' : 'No results'}
          />
        )}
      </Dialog>
    </DialogOverlay>
  )
}
