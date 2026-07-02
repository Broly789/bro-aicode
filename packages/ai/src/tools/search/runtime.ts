import { searchSchema } from './schema'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const BLOCK_KEYWORDS = [
  '验证码', 'captcha', '您的访问', '拒绝', 'denied',
  '安全验证', '请输入验证码', '机器人',
]

function isBlocked(html: string): boolean {
  return BLOCK_KEYWORDS.some((k) => html.includes(k))
}

function htmlToText(html: string): string {
  let s = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
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

  const maxLen = 15000
  if (s.length > maxLen) {
    s = s.slice(0, maxLen) + '\n\n... [content truncated]'
  }
  return s
}

function fetchWithTimeout(url: string, ms = 10000): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.text()
    })
    .finally(() => clearTimeout(timer))
}

async function tryFetch(url: string, label: string): Promise<string | null> {
  try {
    const html = await fetchWithTimeout(url)
    if (isBlocked(html)) {
      console.error(`[search/${label}] blocked`)
      return null
    }
    return htmlToText(html)
  } catch (err) {
    console.error(`[search/${label}] ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}

export async function runSearch(input: unknown) {
  const { query } = searchSchema.parse(input)
  const q = encodeURIComponent(query)

  const engines: [string, string][] = [
    ['baidu', `https://www.baidu.com/s?wd=${q}`],
    ['sogou', `https://www.sogou.com/web?query=${q}`],
    ['bing', `https://www.bing.com/search?q=${q}`],
    ['duckduckgo', `https://html.duckduckgo.com/html/?q=${q}`],
    ['google', `https://www.google.com/search?q=${q}&hl=en`],
  ]

  for (const [label, url] of engines) {
    const text = await tryFetch(url, label)
    if (text && text.length > 500) {
      return { source: label, url, content: text }
    }
  }

  return {
    source: 'none',
    error:
      'All search engines returned no results or were blocked. ' +
      'Try using fetch-url() with a specific URL.',
  }
}
