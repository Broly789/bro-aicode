import { Hono } from 'hono'
import { z } from 'zod'
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  tool,
  validateUIMessages,
} from 'ai'
import { deepseek } from '@ai-sdk/deepseek'
import { validateJson } from '../lib/validate'

const chatBodySchema = z.object({
  messages: z.array(z.unknown()),
})

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

const tools = {
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

export const chatRoute = new Hono().post(
  '/chat',
  validateJson(chatBodySchema),
  async (c) => {
    const { messages } = c.req.valid('json')
    const validatedMessages = await validateUIMessages({
      messages: messages ?? [],
    })
    const modelMessages = await convertToModelMessages(
      validatedMessages.map(({ id, ...message }) => message),
    )
    const result = streamText({
      model: deepseek('deepseek-v4-flash'),
      messages: modelMessages,
      tools,
      stopWhen: isStepCount(5),
      providerOptions: {
        deepseek: {
          thinking: { type: 'enabled' }, //开启「思考模式」（Thinking Mode）
        },
      },
    })
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    })
  },
)
