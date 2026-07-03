import { searchSchema } from './schema'

const log = (msg: string) => logger('search', msg)

// ---- Tavily Search API ----

const TAVILY_API_URL_DEFAULT = 'https://api.tavily.com/search'

interface TavilyResult {
  title: string
  url: string
  content: string
  score?: number
}

interface TavilyResponse {
  results: TavilyResult[]
  answer?: string
  query: string
}

/**
 * 通过 Tavily API 搜索网页。
 * 返回结构化的搜索结果，比爬虫方案可靠得多。
 *
 * Tavily 是 AI 专用的搜索 API，返回干净的文本内容，
 * 适合直接喂给 LLM 做 RAG 或实时信息查询。
 */
async function searchTavily(
  query: string,
  apiKey: string,
  options?: {
    searchDepth?: 'basic' | 'advanced'
    maxResults?: number
  },
): Promise<{ source: string; url: string; content: string } | null> {
  const res = await fetch(process.env.SEARCH_URL_TAVILY || TAVILY_API_URL_DEFAULT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: options?.searchDepth ?? 'basic',
      max_results: options?.maxResults ?? 8,
      include_answer: true,
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    log(`[tavily] HTTP ${res.status}: ${text.slice(0, 200)}`)
    return null
  }

  const data = await res.json() as TavilyResponse

  if (!data.results || data.results.length === 0) {
    log('[tavily] No results returned')
    return null
  }

  // 组装结果：优先使用 Tavily 的 answer，再拼接各条结果
  const parts: string[] = []

  if (data.answer) {
    parts.push(`[Answer]\n${data.answer}`)
  }

  for (const r of data.results) {
    parts.push(`[${r.title}]\n${r.url}\n${r.content}`)
  }

  return {
    source: 'tavily',
    url: `https://tavily.com/search?q=${encodeURIComponent(query)}`,
    content: parts.join('\n\n---\n\n'),
  }
}

// ---- Baidu AI Search API ----

const BAIDU_SEARCH_URL_DEFAULT = 'https://qianfan.baidubce.com/v2/ai_search/web_search'

interface BaiduSearchReference {
  title?: string
  url?: string
  content?: string
  date?: string
  website?: string
}

interface BaiduSearchResponse {
  references?: BaiduSearchReference[]
  code?: number
  message?: string
}

/**
 * 通过百度千帆 AI Search API 搜索网页。
 *
 * 百度搜索对中文内容质量更高，适合搜索国内资讯、娱乐、新闻等。
 * 免费额度：每天 100 次（按天发放）。
 *
 * API 文档：https://cloud.baidu.com/doc/qianfan-api/s/Wmbq4z7e5
 * 认证方式：Authorization: Bearer <api_key>
 */
async function searchBaidu(
  query: string,
  apiKey: string,
): Promise<{ source: string; url: string; content: string } | null> {
  const res = await fetch(process.env.SEARCH_URL_BAIDU || BAIDU_SEARCH_URL_DEFAULT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: query }],
      edition: 'standard',
      search_source: 'baidu_search_v2',
      search_recency_filter: 'week',
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    log(`[baidu] HTTP ${res.status}: ${text.slice(0, 200)}`)
    return null
  }

  const data = await res.json() as BaiduSearchResponse

  // 处理百度 API 错误码
  if (data.code) {
    const errorMsg = data.message ?? 'Unknown error'
    log(`[baidu] Error ${data.code}: ${errorMsg}`)
    return null
  }

  if (!data.references || data.references.length === 0) {
    log('[baidu] No references returned')
    return null
  }

  // 组装搜索结果
  const parts = data.references.map((ref) => {
    const title = ref.title ?? 'Untitled'
    const url = ref.url ?? ''
    const content = ref.content ?? ''
    return `[${title}]\n${url}\n${content}`
  })

  return {
    source: 'baidu',
    url: `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
    content: parts.join('\n\n---\n\n'),
  }
}

// ---- 以下是原有的爬虫 fallback（当 API 都不可用时降级使用） ----

const UAS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
]

function randomUA(): string {
  return UAS[Math.floor(Math.random() * UAS.length)]
}

function randomDelay(min = 50, max = 200): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min) + min)
  return new Promise((r) => setTimeout(r, ms))
}

const BLOCK_KEYWORDS = [
  '验证码', 'captcha', '您的访问', '拒绝', 'denied',
  '安全验证', '请输入验证码', '机器人', '访问频繁',
  '访问受限', '请求过多', 'too many requests',
  'forbidden', 'not acceptable',
]

function isBlocked(html: string): boolean {
  return BLOCK_KEYWORDS.some((k) => html.toLowerCase().includes(k.toLowerCase()))
}

function extractSearchResults(html: string, engine: string): string {
  const results: string[] = []

  if (engine === 'baidu') {
    const re = /<div[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<h3[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>([\s\S]*?)<\/div>/gi
    let m
    while ((m = re.exec(html)) !== null) {
      const title = m[2].replace(/<[^>]+>/g, '').trim()
      const snippet = m[3].replace(/<[^>]+>/g, '').trim()
      if (title) results.push(`${title}\n${snippet}`)
    }
  } else if (engine === 'bing') {
    const re = /<li[^>]*class="[^"]*b_algo[^"]*"[^>]*>[\s\S]*?<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>([\s\S]*?)<\/li>/gi
    let m
    while ((m = re.exec(html)) !== null) {
      const title = m[2].replace(/<[^>]+>/g, '').trim()
      const snippet = m[3].replace(/<[^>]+>/g, '').trim()
      if (title) results.push(`${title}\n${snippet}`)
    }
  } else if (engine === 'duckduckgo') {
    const re = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi
    let m
    while ((m = re.exec(html)) !== null) {
      const title = m[2].replace(/<[^>]+>/g, '').trim()
      const snippet = m[3].replace(/<[^>]+>/g, '').trim()
      if (title) results.push(`${title}\n${snippet}`)
    }
  }

  if (results.length > 0) {
    return results.slice(0, 10).join('\n\n---\n\n')
  }

  return fallbackHtmlToText(html)
}

function fallbackHtmlToText(html: string): string {
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

async function fetchWithTimeout(url: string, ms = 12000): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': randomUA(),
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
    redirect: 'follow',
  })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.text()
    })
    .finally(() => clearTimeout(timer))
}

async function tryFetch(url: string, label: string, retries = 2): Promise<string | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      await randomDelay()
      const html = await fetchWithTimeout(url)
      if (isBlocked(html)) {
        log(`[scraper/${label}] blocked (attempt ${i + 1})`)
        if (i < retries) {
          await randomDelay(500, 1500)
          continue
        }
        return null
      }
      return extractSearchResults(html, label)
    } catch (err) {
      log(`[scraper/${label}] ${err instanceof Error ? err.message : String(err)} (attempt ${i + 1})`)
      if (i < retries) {
        await randomDelay(300, 1000)
      }
    }
  }
  return null
}

/**
 * 爬虫方式搜索（API 都不可用时的 fallback）。
 * 直接抓取搜索引擎 HTML 页面并解析结果。
 */
async function searchScraper(query: string): Promise<{ source: string; url: string; content: string } | null> {
  const q = encodeURIComponent(query)

  const engines: [string, string][] = [
    ['bing', (process.env.SCRAPER_URL_BING || 'https://www.bing.com/search?q={q}&cc=cn').replace('{q}', q)],
    ['duckduckgo', (process.env.SCRAPER_URL_DUCKDUCKGO || 'https://html.duckduckgo.com/html/?q={q}').replace('{q}', q)],
    ['baidu', (process.env.SCRAPER_URL_BAIDU || 'https://www.baidu.com/s?wd={q}').replace('{q}', q)],
    ['sogou', (process.env.SCRAPER_URL_SOGOU || 'https://www.sogou.com/web?query={q}').replace('{q}', q)],
    ['google', (process.env.SCRAPER_URL_GOOGLE || 'https://www.google.com/search?q={q}&hl=zh-CN').replace('{q}', q)],
  ]

  for (const [label, url] of engines) {
    const text = await tryFetch(url, label)
    if (text && text.length > 150) {
      return { source: label, url, content: text }
    }
  }

  return null
}

/**
 * 搜索入口：根据 SEARCH_PRIORITY 环境变量或查询语言智能选择引擎。
 *
 * SEARCH_PRIORITY 环境变量：
 * - "tavily"  → 优先 Tavily（回退 Baidu → 爬虫）
 * - "baidu"   → 优先 Baidu（回退 Tavily → 爬虫）
 * - 未设置     → 智能路由：中文查询优先百度，英文优先 Tavily
 */
export async function runSearch(input: unknown) {
  const { query } = searchSchema.parse(input)

  const tavilyKey = process.env.TAVILY_API_KEY
  const baiduKey = process.env.BAIDU_API_KEY
  const priority = (process.env.SEARCH_PRIORITY || '').toLowerCase()

  log(`START query="${query}" priority="${priority || 'auto'}" baiduKey=${baiduKey ? 'YES' : 'NO'} tavilyKey=${tavilyKey ? 'YES' : 'NO'}`)

  // 定义搜索引擎顺序
  type SearchFn = () => Promise<{ source: string; url: string; content: string } | null>
  let engines: { name: string; fn: SearchFn }[] = []

  if (priority === 'tavily') {
    if (tavilyKey) engines.push({ name: 'tavily', fn: () => searchTavily(query, tavilyKey) })
    if (baiduKey) engines.push({ name: 'baidu', fn: () => searchBaidu(query, baiduKey) })
  } else if (priority === 'baidu') {
    if (baiduKey) engines.push({ name: 'baidu', fn: () => searchBaidu(query, baiduKey) })
    if (tavilyKey) engines.push({ name: 'tavily', fn: () => searchTavily(query, tavilyKey) })
  } else {
    // 智能路由：中文优先百度，英文优先 Tavily
    const hasChinese = /[\u4e00-\u9fff]/.test(query)
    if (hasChinese) {
      if (baiduKey) engines.push({ name: 'baidu', fn: () => searchBaidu(query, baiduKey) })
      if (tavilyKey) engines.push({ name: 'tavily', fn: () => searchTavily(query, tavilyKey) })
    } else {
      if (tavilyKey) engines.push({ name: 'tavily', fn: () => searchTavily(query, tavilyKey) })
      if (baiduKey) engines.push({ name: 'baidu', fn: () => searchBaidu(query, baiduKey) })
    }
  }

  // 依次尝试 API
  for (const engine of engines) {
    log(`Trying ${engine.name}...`)
    const result = await engine.fn()
    if (result) {
      log(`SUCCESS via ${result.source}, contentLength=${result.content.length}`)
      return result
    }
    log(`${engine.name} returned null`)
  }

  // 降级为爬虫
  log('All APIs failed, falling back to scraper...')
  const scraperResult = await searchScraper(query)
  if (scraperResult) {
    log(`SUCCESS via scraper/${scraperResult.source}, contentLength=${scraperResult.content.length}`)
    return scraperResult
  }

  log('FAILED: All search engines returned no results')
  return {
    source: 'none',
    error:
      'All search engines returned no results or were blocked. ' +
      'Try using fetch-url() with a specific URL.',
  }
}
