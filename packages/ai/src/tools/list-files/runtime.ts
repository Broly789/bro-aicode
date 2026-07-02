import { readdir } from 'node:fs/promises'
import { listFilesSchema } from './schema'
import { resolveSafePath } from '../../workspace'

export async function runListFiles(input: unknown, cwd: string) {
  const { path } = listFilesSchema.parse(input)
  const safePath = resolveSafePath(path, cwd)
  const entries = await readdir(safePath, { withFileTypes: true })
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => ({ name: e.name, type: 'file' as const }))
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, type: 'directory' as const }))

  return { entries: [...dirs, ...files] }
}
