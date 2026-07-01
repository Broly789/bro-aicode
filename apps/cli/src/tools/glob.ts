import { Glob } from 'bun'
import { globSchema } from '@brocode/tools'
import { resolveSafePath } from './guardrail'

export async function globExecute(
  input: unknown,
  cwd: string,
) {
  const { pattern, path } = globSchema.parse(input)
  const searchPath = path ? resolveSafePath(path, cwd) : cwd
  const glob = new Glob(pattern)
  const results: string[] = []
  for await (const entry of glob.scan({ cwd: searchPath })) {
    results.push(entry)
  }
  return { files: results }
}
