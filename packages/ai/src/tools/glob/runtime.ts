import { Glob } from 'bun'
import { globSchema } from './schema'
import { resolveSafePath } from '../../workspace'

export async function runGlob(input: unknown, cwd: string) {
  const { pattern, path } = globSchema.parse(input)
  const searchPath = path ? resolveSafePath(path, cwd) : cwd
  const glob = new Glob(pattern)
  const results: string[] = []
  for await (const entry of glob.scan({ cwd: searchPath })) {
    results.push(entry)
  }
  return { files: results }
}
