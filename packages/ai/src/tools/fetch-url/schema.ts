import { z } from 'zod'

export const fetchUrlSchema = z.object({
  url: z.string().url().describe('URL to fetch and extract text content from'),
})

export const fetchUrlTool = {
  name: 'fetch-url' as const,
  description:
    'Fetch a URL and extract its text content. ' +
    'Use this to read articles, Baidu Baike pages, news, or any web page. ' +
    'Returns the page title and cleaned text content.',
  inputSchema: fetchUrlSchema,
}
