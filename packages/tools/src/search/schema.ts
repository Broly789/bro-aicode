import { z } from 'zod'

export const searchSchema = z.object({
  query: z.string().describe('Search query'),
})

export const searchTool = {
  name: 'search' as const,
  description:
    'Search the web. Returns structured results[] with title/url/snippet from DuckDuckGo, ' +
    'or raw text content from fallback engines. ' +
    'When results[] is returned, use fetch-url() to read the most promising URLs.',
  inputSchema: searchSchema,
}
