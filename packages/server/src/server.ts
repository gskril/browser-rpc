import { serveStatic } from '@hono/node-server/serve-static'
import { existsSync, readFileSync } from 'fs'
import type { Context, Next } from 'hono'
import { Hono } from 'hono'
import path from 'path'
import { fileURLToPath } from 'url'

import { api } from './api/routes.js'
import { logger } from './logger.js'
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

// Maximum number of requests accepted in a single JSON-RPC batch. Prevents a
// single POST from spawning an unbounded number of pending requests / tabs.
const MAX_BATCH_SIZE = 50

/**
 * Restrict the server to local use only. This is the security boundary: the
 * server triggers wallet-signing prompts and exposes pending-transaction data,
 * so it must not be drivable by other websites or other machines.
 *
 * - Host allowlist blocks DNS-rebinding (a remote page resolving a hostname to
 *   127.0.0.1 still sends its own Host header).
 * - Origin allowlist blocks cross-origin browser requests (CSRF). Non-browser
 *   dev tools (Foundry, Hardhat, curl) send no Origin header and are allowed.
 */
function createLocalOnlyGuard(port: number) {
  const allowedHosts = new Set([
    `localhost:${port}`,
    `127.0.0.1:${port}`,
    `[::1]:${port}`,
  ])
  const allowedOrigins = new Set([
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    `http://[::1]:${port}`,
  ])

  return async function localOnlyGuard(c: Context, next: Next) {
    const host = c.req.header('host')
    if (!host || !allowedHosts.has(host)) {
      return c.text('Forbidden', 403)
    }
    const origin = c.req.header('origin')
    if (origin && !allowedOrigins.has(origin)) {
      return c.text('Forbidden', 403)
    }
    return next()
  }
}

export function createServer(config: ServerConfig): Hono {
  const app = new Hono()

  app.use('*', createLocalOnlyGuard(config.port))

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
        if (body.length > MAX_BATCH_SIZE) {
          return c.json(
            {
              jsonrpc: '2.0',
              id: null,
              error: { code: -32600, message: 'Batch too large' },
            },
            400
          )
        }
        const methods = body.map((req: JsonRpcRequest) => req.method).join(', ')
        logger.dim(`<- [${methods}]`)
        const responses = await Promise.all(
          body.map((req: JsonRpcRequest) => handleRpcRequest(req, rpcConfig))
        )
        return c.json(responses)
      }

      // Single request
      logger.dim(`<- ${body.method}`)
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

  // Unknown API routes return JSON 404 instead of falling through to the SPA
  // page (which would otherwise return 200 HTML for e.g. a mistyped endpoint).
  app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404))

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
