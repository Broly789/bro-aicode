import { readFile, stat } from 'node:fs/promises'
import { readFileSchema } from './schema'
import { resolveSafePath } from '../../workspace'

export async function runReadFile(input: unknown, cwd: string) {
  const { path } = readFileSchema.parse(input)
  const safePath = resolveSafePath(path, cwd)

  // 检测是否为目录，返回友好提示
  const stats = await stat(safePath)
  if (stats.isDirectory()) {
    return {
      content: `Error: "${path}" is a directory, not a file. Use listFiles to view directory contents.`,
    }
  }

  const content = await readFile(safePath, 'utf-8')
  return { content }
}
