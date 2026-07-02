import { fetchUrlSchema } from './schema'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

function isBlocked(html: string): boolean {
  return ['验证码', 'captcha', '您的访问', '拒绝', 'denied', '安全验证', '请输入验证码', '机器人'].some(
    (k) => html.includes(k),
  )
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!m) return ''
  return m[1]
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .trim()
}

function htmlToText(html: string): string {
  let s = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 1)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const maxLen = 30000
  if (s.length > maxLen) {
    s = s.slice(0, maxLen) + '\n\n... [content truncated]'
  }
  return s
}

export async function runFetchUrl(input: unknown) {
  const { url } = fetchUrlSchema.parse(input)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    })

    if (!res.ok) {
      return { url, error: `HTTP ${res.status}: ${res.statusText}` }
    }

    const html = await res.text()

    if (isBlocked(html)) {
      return { url, error: 'Access blocked by anti-crawling protection' }
    }

    const title = extractTitle(html)
    const content = htmlToText(html)

    return { url, title, content, contentLength: content.length }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { url, error: msg }
  } finally {
    clearTimeout(timer)
  }
}
