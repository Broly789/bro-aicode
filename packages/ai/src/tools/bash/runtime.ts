import { bashSchema } from './schema'
import { resolveSafePath } from '../../workspace'

export async function runBash(input: unknown, cwd: string) {
  const { command, timeout } = bashSchema.parse(input)
  const safeCwd = resolveSafePath('.', cwd)
  const proc = Bun.spawn(['bash', '-c', command], {
    cwd: safeCwd,
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  const ms = timeout ?? 30000
  const timer = setTimeout(() => proc.kill(), ms)

  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  clearTimeout(timer)

  return { exitCode, stdout, stderr }
}
