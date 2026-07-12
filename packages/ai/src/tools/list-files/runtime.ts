import { readdir } from 'node:fs/promises'
import { listFilesSchema } from './schema'
import { resolveSafePath } from '../../workspace'

export async function runListFiles(input: unknown, cwd: string) {
  const { path } = listFilesSchema.parse(input)
  const safePath = resolveSafePath(path, cwd)

  let entries: { name: string; type: 'file' | 'directory' }[]
  try {
    const dirEntries = await readdir(safePath, { withFileTypes: true })
    const files = dirEntries
      .filter((e) => e.isFile())
      .map((e) => ({ name: e.name, type: 'file' as const }))
    const dirs = dirEntries
      .filter((e) => e.isDirectory())
      .map((e) => ({ name: e.name, type: 'directory' as const }))
    entries = [...dirs, ...files]
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'ENOENT') {
      entries = []
    } else {
      throw err
    }
  }

  return { entries }
}
