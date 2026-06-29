import { hc } from 'hono/client'
import type { AppType } from '@brocode/server'

const serverUrl = process.env.SERVER_URL ?? 'http://localhost:3000'

export const client = hc<AppType>(serverUrl)

// client.health.$get().then(console.log)
// client.index.$get().then(console.log)
