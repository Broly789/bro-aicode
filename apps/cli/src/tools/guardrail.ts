import { resolve, relative } from 'node:path'

export class GuardrailError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GuardrailError'
  }
}

export function resolveSafePath(
  requestedPath: string,
  cwd: string,
): string {
  const resolved = resolve(cwd, requestedPath)
  const rel = relative(cwd, resolved)
  if (rel.startsWith('..') || resolve(cwd, rel) !== resolved) {
    throw new GuardrailError(
      `Path "${requestedPath}" escapes the working directory`,
    )
  }
  return resolved
}
