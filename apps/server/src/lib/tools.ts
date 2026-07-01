import { tool } from 'ai'
import { z } from 'zod'

const weatherSchema = z.object({
  location: z.string().describe('City and state/country'),
})
type WeatherParams = z.infer<typeof weatherSchema>

const timeSchema = z.object({
  timezone: z.string().describe('IANA timezone like America/New_York'),
})
type TimeParams = z.infer<typeof timeSchema>

const stockSchema = z.object({
  ticker: z.string().describe('Stock ticker symbol like AAPL, GOOGL'),
})
type StockParams = z.infer<typeof stockSchema>

export const tools = {
  getWeather: tool({
    description: 'Get the current weather for a location',
    inputSchema: weatherSchema,
    execute: async ({ location }: WeatherParams) => {
      return { location, temperature: 72, conditions: 'sunny', humidity: '45%' }
    },
  }),
  getCurrentTime: tool({
    description: 'Get the current time for a timezone',
    inputSchema: timeSchema,
    execute: async ({ timezone }: TimeParams) => {
      return {
        timezone,
        currentTime: new Date().toLocaleString('en-US', { timeZone: timezone }),
      }
    },
  }),
  getStockPrice: tool({
    description: 'Get the current stock price for a ticker symbol',
    inputSchema: stockSchema,
    execute: async ({ ticker }: StockParams) => {
      const validTickers = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA']
      if (!validTickers.includes(ticker.toUpperCase())) {
        throw new Error(
          `Unknown ticker symbol: ${ticker}. Valid tickers: ${validTickers.join(', ')}`,
        )
      }
      return {
        ticker: ticker.toUpperCase(),
        price: +(Math.random() * 500 + 50).toFixed(2),
      }
    },
  }),
}
