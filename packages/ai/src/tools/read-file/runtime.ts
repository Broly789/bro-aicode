import { readFile } from 'node:fs/promises'
import { readFileSchema } from './schema'
import { resolveSafePath } from '../../workspace'

export async function runReadFile(input: unknown, cwd: string) {
  const { path } = readFileSchema.parse(input)
  const safePath = resolveSafePath(path, cwd)
  const content = await readFile(safePath, 'utf-8')
  return { content }
}
