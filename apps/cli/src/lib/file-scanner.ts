import { Glob } from 'bun'

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'generated',
  'logs',
  '.next',
  '.cache',
  'coverage',
  '__pycache__',
  '.turbo',
  '.vercel',
  '.idea',
  '.vscode',
])

const EXCLUDED_PATTERNS = [
  /\.generated\./,
  /\.log$/,
  /\.DS_Store$/,
  /bun\.lock$/,
  /\.tsbuildinfo$/,
  /\.env/,
  /\.map$/,
]

let cachedFiles: string[] | null = null

export async function scanProjectFiles(root: string): Promise<string[]> {
  if (cachedFiles) return cachedFiles

  const glob = new Glob('**/*')
  const results: string[] = []

  for await (const entry of glob.scan({ cwd: root, onlyFiles: true })) {
    const parts = entry.split('/')
    if (parts.some((p) => EXCLUDED_DIRS.has(p))) continue
    if (EXCLUDED_PATTERNS.some((re) => re.test(entry))) continue
    results.push(entry)
  }

  cachedFiles = results
  return results
}

export function invalidateFileCache() {
  cachedFiles = null
}

export function filterFiles(files: string[], query: string): string[] {
  if (!query) return files.slice(0, 20)
  const q = query.toLowerCase()
  const matched = files.filter((f) => f.toLowerCase().includes(q))
  matched.sort((a, b) => {
    const aIdx = a.toLowerCase().indexOf(q)
    const bIdx = b.toLowerCase().indexOf(q)
    if (aIdx !== bIdx) return aIdx - bIdx
    return a.length - b.length
  })
  return matched.slice(0, 20)
}
