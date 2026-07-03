import { z } from 'zod'

export const searchSchema = z.object({
  query: z.string().describe('Search query'),
})

export const searchTool = {
  name: 'search' as const,
  description:
    'Search the web for real-time information. Uses Baidu API (better for Chinese content) ' +
    'with fallback to Tavily API and search engine scraping. ' +
    'Returns titles, URLs, and full content snippets — use the content directly to answer.',
  inputSchema: searchSchema,
}
