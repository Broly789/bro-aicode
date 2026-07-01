import { readFile } from 'node:fs/promises'
import { readFileSchema } from '@brocode/tools'
import { resolveSafePath } from './guardrail'

export async function readFileExecute(
  input: unknown,
  cwd: string,
) {
  const { path } = readFileSchema.parse(input)
  const safePath = resolveSafePath(path, cwd)
  const content = await readFile(safePath, 'utf-8')
  return { content }
}
