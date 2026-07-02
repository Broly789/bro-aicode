import { z } from 'zod'

export const searchSchema = z.object({
  query: z.string().describe('Search query'),
})

export const searchTool = {
  name: 'search' as const,
  description:
    'Search the web by fetching search result pages (Baidu → Sogou → Bing → DuckDuckGo → Google). ' +
    'Returns text content extracted from the search results page. ' +
    'Use fetch-url() to read specific articles found in results.',
  inputSchema: searchSchema,
}
