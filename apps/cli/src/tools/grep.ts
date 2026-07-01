import { readdir, readFile, stat } from 'node:fs/promises'
import { join, basename, dirname } from 'node:path'
import { grepSchema } from '@brocode/tools'
import { resolveSafePath } from './guardrail'

async function* walk(dir: string): AsyncGenerator<string> {
  let stats
  try { stats = await stat(dir) } catch { return }
  if (stats.isFile()) {
    yield dir
    return
  }
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      yield* walk(fullPath)
    } else if (entry.isFile()) {
      yield fullPath
    }
  }
}

export async function grepExecute(
  input: unknown,
  cwd: string,
) {
  const { pattern, path } = grepSchema.parse(input)
  const searchPath = path ? resolveSafePath(path, cwd) : cwd
  const regex = new RegExp(pattern)
  const matches: Array<{ file: string; line: number; content: string }> = []

  for await (const filePath of walk(searchPath)) {
    try {
      const content = await readFile(filePath, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          matches.push({
            file: filePath,
            line: i + 1,
            content: lines[i],
          })
        }
      }
    } catch {}
  }

  return { matches }
}
