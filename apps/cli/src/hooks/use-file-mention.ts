import { useCallback, useEffect, useRef, useState } from 'react'
import { useRenderer } from '@opentui/react'
import { scanProjectFiles, filterFiles } from '../lib/file-scanner'

export function useFileMention() {
  const renderer = useRenderer()
  const [isOpen, setIsOpen] = useState(false)
  const [files, setFiles] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  const isOpenRef = useRef(false)
  const filesRef = useRef<string[]>([])
  const selectedIndexRef = useRef(0)
  const allFilesRef = useRef<string[]>([])
  const queryRef = useRef('')

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])
  useEffect(() => {
    filesRef.current = files
  }, [files])
  useEffect(() => {
    selectedIndexRef.current = selectedIndex
  }, [selectedIndex])

  // Load files once on mount
  useEffect(() => {
    const root = process.env.PROJECT_ROOT || process.cwd()
    scanProjectFiles(root).then((f) => {
      allFilesRef.current = f
    })
  }, [])

  const close = useCallback(() => {
    queryRef.current = ''
    setSelectedIndex(0)
    setIsOpen(false)
  }, [])

  // Keyboard navigation when file mention list is open
  useEffect(() => {
    const handler = (key: { name: string; ctrl?: boolean; preventDefault: () => void; stopPropagation: () => void }) => {
      if (!isOpenRef.current) return

      switch (key.name) {
        case 'up':
          key.preventDefault()
          key.stopPropagation()
          setSelectedIndex((prev) => {
            const f = filesRef.current
            return prev > 0 ? prev - 1 : f.length - 1
          })
          return
        case 'down':
          key.preventDefault()
          key.stopPropagation()
          setSelectedIndex((prev) => {
            const f = filesRef.current
            return prev < f.length - 1 ? prev + 1 : 0
          })
          return
        case 'escape':
          key.preventDefault()
          key.stopPropagation()
          close()
          return
        case 'tab':
          key.preventDefault()
          key.stopPropagation()
          return
      }
    }

    renderer.keyInput.on('keypress', handler)
    return () => {
      renderer.keyInput.off('keypress', handler)
    }
  }, [renderer, close])

  const detectMention = useCallback((text: string): { query: string; startIndex: number } | null => {
    const lastAtIndex = text.lastIndexOf('@')
    if (lastAtIndex === -1) return null

    // Skip if inside single or double quotes
    const beforeAt = text.slice(0, lastAtIndex)
    const singleCount = (beforeAt.match(/'/g) || []).length
    const doubleCount = (beforeAt.match(/"/g) || []).length
    if (singleCount % 2 !== 0 || doubleCount % 2 !== 0) return null

    // Skip if looks like an email (char before @ is alphanumeric)
    if (lastAtIndex > 0 && /\w/.test(text[lastAtIndex - 1])) return null

    const afterAt = text.slice(lastAtIndex + 1)

    // Skip if there's a space right after @ (end of mention)
    if (afterAt.startsWith(' ')) return null

    // If query already contains a path separator, it's an already-inserted file path
    if (afterAt.includes('/')) return null

    // Only match if at end of text or followed by a word character
    if (afterAt.length > 0 && !/\w/.test(afterAt[0])) return null

    // Check: @ must be at start or preceded by whitespace
    if (lastAtIndex > 0 && !/\s/.test(text[lastAtIndex - 1])) return null

    return { query: afterAt, startIndex: lastAtIndex }
  }, [])

  const syncValue = useCallback(
    (text: string) => {
      const mention = detectMention(text)
      if (mention) {
        if (mention.query !== queryRef.current || !isOpenRef.current) {
          queryRef.current = mention.query
          const filtered = filterFiles(allFilesRef.current, mention.query)
          setFiles(filtered)
          setIsOpen(filtered.length > 0)
          setSelectedIndex(0)
        }
      } else {
        queryRef.current = ''
        setIsOpen(false)
      }
    },
    [detectMention],
  )

  const handleInsert = useCallback(
    (getText: () => string, setText: (t: string) => void): boolean => {
      if (!isOpenRef.current || filesRef.current.length === 0) return false

      const file = filesRef.current[selectedIndexRef.current]
      if (!file) return false

      const text = getText()
      const mention = detectMention(text)
      if (!mention) return false

      const before = text.slice(0, mention.startIndex)
      const after = text.slice(mention.startIndex + 1 + mention.query.length)
      const newText = before + '@' + file + ' ' + after
      setText(newText)
      close()
      return true
    },
    [detectMention, close],
  )

  const getSelectedFile = useCallback((): string | null => {
    if (!isOpenRef.current || filesRef.current.length === 0) return null
    return filesRef.current[selectedIndexRef.current] ?? null
  }, [])

  const hoverIndex = useCallback((index: number) => {
    setSelectedIndex(index)
  }, [])

  return {
    isOpen,
    files,
    selectedIndex,
    syncValue,
    handleInsert,
    getSelectedFile,
    hoverIndex,
    close,
  }
}
