import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { writeFileSchema } from './schema'
import { resolveSafePath } from '../../workspace'

export async function runWriteFile(input: unknown, cwd: string) {
  const { path, content } = writeFileSchema.parse(input)
  const safePath = resolveSafePath(path, cwd)
  await mkdir(dirname(safePath), { recursive: true })
  await writeFile(safePath, content, 'utf-8')
  return { ok: true }
}
