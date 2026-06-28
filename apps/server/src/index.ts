import { greet, PROJECT_NAME } from "@brocode/shared"
import { Hono } from "hono"

const app = new Hono()

app.get("/", (c) => c.text(greet(PROJECT_NAME)))

app.get("/api/health", (c) => c.json({ status: "ok", runtime: "bun" }))

export default app
