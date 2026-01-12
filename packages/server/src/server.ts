import { serveStatic } from '@hono/node-server/serve-static'
import { existsSync, readFileSync } from 'fs'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import path from 'path'
import { fileURLToPath } from 'url'

import { api } from './api/routes.js'
import { type RpcHandlerConfig, handleRpcRequest } from './rpc/handler.js'
import type { JsonRpcRequest } from './rpc/types.js'

// Resolve path to web dist folder
// After build/publish: web-dist is bundled with the package
// In development: falls back to ../web/dist

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function resolveWebDistPath(): string {
  const bundledPath = path.resolve(__dirname, '../web-dist')
  const devPath = path.resolve(__dirname, '../../web/dist')
  // Prefer bundled path (for published package), fall back to dev path
  if (existsSync(bundledPath)) return bundledPath
  return devPath
}
const webDistPath = resolveWebDistPath()

export interface ServerConfig {
  upstreamRpcUrl: string
  port: number
  fromAddress?: string
  onPendingRequest: (id: string, url: string) => void
}

export function createServer(config: ServerConfig): Hono {
  const app = new Hono()

  app.use('*', cors())

  // Mount API routes
  app.route('/api', api)

  // Build handler config once
  const rpcConfig: RpcHandlerConfig = {
    upstreamRpcUrl: config.upstreamRpcUrl,
    uiBaseUrl: `http://localhost:${config.port}`,
    fromAddress: config.fromAddress,
    onPendingRequest: config.onPendingRequest,
  }

  // RPC endpoint - handles both root and /rpc paths
  async function handleRpc(c: Context): Promise<Response> {
    try {
      const body = await c.req.json()

      // Handle batch requests
      if (Array.isArray(body)) {
        const methods = body.map((req: JsonRpcRequest) => req.method).join(', ')
        console.log(`\x1b[2m<- [${methods}]\x1b[0m`)
        const responses = await Promise.all(
          body.map((req: JsonRpcRequest) => handleRpcRequest(req, rpcConfig))
        )
        return c.json(responses)
      }

      // Single request
      console.log(`\x1b[2m<- ${body.method}\x1b[0m`)
      const response = await handleRpcRequest(body, rpcConfig)
      return c.json(response)
    } catch {
      return c.json(
        {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: 'Parse error',
          },
        },
        400
      )
    }
  }

  app.post('/', handleRpc)
  app.post('/rpc', handleRpc)

  // Health check
  app.get('/health', (c) => c.json({ ok: true }))

  // Server config endpoint (for frontend)
  app.get('/api/config', (c) =>
    c.json({
      fromAddress: config.fromAddress || null,
    })
  )

  // Serve static assets from web dist
  app.use('/assets/*', serveStatic({ root: webDistPath }))

  // SPA fallback - serve index.html for all other GET requests
  app.get('*', (c) => {
    const indexPath = path.join(webDistPath, 'index.html')
    if (existsSync(indexPath)) {
      const html = readFileSync(indexPath, 'utf-8')
      return c.html(html)
    }
    return c.text(
      "Web UI not found. Run 'bun run build' in packages/web first.",
      404
    )
  })

  return app
}
