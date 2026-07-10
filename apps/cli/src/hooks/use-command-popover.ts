import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyEvent } from '@opentui/core'
import { useRenderer } from '@opentui/react'
import { filterCommands, type Command } from '../components/CommandList'

export function useCommandPopover() {
  const renderer = useRenderer()
  const [isOpen, setIsOpen] = useState(false)
  const [commands, setCommands] = useState<Command[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  const isOpenRef = useRef(false)
  const commandsRef = useRef<Command[]>([])
  const selectedIndexRef = useRef(0)
  const lastQueryRef = useRef('')
  const dismissedQueryRef = useRef<string | null>(null)

  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])
  useEffect(() => { commandsRef.current = commands }, [commands])
  useEffect(() => { selectedIndexRef.current = selectedIndex }, [selectedIndex])

  useEffect(() => {
    const handler = (key: KeyEvent) => {
      if (!isOpenRef.current) return

      switch (key.name) {
        case 'up':
          key.preventDefault()
          key.stopPropagation()
          setSelectedIndex((prev) => {
            const cmds = commandsRef.current
            return prev > 0 ? prev - 1 : cmds.length - 1
          })
          return
        case 'down':
          key.preventDefault()
          key.stopPropagation()
          setSelectedIndex((prev) => {
            const cmds = commandsRef.current
            return prev < cmds.length - 1 ? prev + 1 : 0
          })
          return
      }
    }

    renderer.keyInput.on('keypress', handler)
    return () => {
      renderer.keyInput.off('keypress', handler)
    }
  }, [renderer])

  const syncValue = useCallback((value: string) => {
    if (value.startsWith('/')) {
      const query = value.slice(1)
      if (query !== lastQueryRef.current) {
        if (dismissedQueryRef.current !== null && query === dismissedQueryRef.current && !isOpenRef.current) {
          return
        }
        lastQueryRef.current = query
        dismissedQueryRef.current = null
        const filtered = filterCommands(query)
        setCommands(filtered)
        setIsOpen(filtered.length > 0)
        setSelectedIndex(0)
      } else if (!isOpenRef.current) {
        if (dismissedQueryRef.current === null || query !== dismissedQueryRef.current) {
          const filtered = filterCommands(query)
          setCommands(filtered)
          setIsOpen(filtered.length > 0)
          setSelectedIndex(0)
        }
      }
    } else {
      lastQueryRef.current = ''
      dismissedQueryRef.current = null
      setIsOpen(false)
    }
  }, [])

  const getSelectedCommandName = useCallback((): string | null => {
    if (!isOpenRef.current || commandsRef.current.length === 0) return null
    const cmd = commandsRef.current[selectedIndexRef.current]
    return cmd?.name ?? null
  }, [])

  const selectIndex = useCallback((index: number) => {
    setSelectedIndex(index)
  }, [])

  const hoverIndex = useCallback((index: number) => {
    setSelectedIndex(index)
  }, [])

  const clear = useCallback(() => {
    dismissedQueryRef.current = lastQueryRef.current
    lastQueryRef.current = ''
    setSelectedIndex(0)
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    commands,
    selectedIndex,
    syncValue,
    getSelectedCommandName,
    selectIndex,
    hoverIndex,
    clear,
  }
}
