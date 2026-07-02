import { readFile, writeFile } from 'node:fs/promises'
import { editFileSchema } from './schema'
import { resolveSafePath } from '../../workspace'

export async function runEditFile(input: unknown, cwd: string) {
  const { path, oldText, newText } = editFileSchema.parse(input)
  const safePath = resolveSafePath(path, cwd)
  const content = await readFile(safePath, 'utf-8')

  if (!content.includes(oldText)) {
    throw new Error(
      `Could not find the specified text in "${path}". ` +
        'The file content may have changed. Read the file again and retry.',
    )
  }

  const updated = content.replace(oldText, newText)
  await writeFile(safePath, updated, 'utf-8')

  return { ok: true }
}
