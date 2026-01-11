import { Hono } from 'hono'
import { cors } from 'hono/cors'

import {
  getAllPendingIds,
  getPendingRequest,
  resolvePendingRequest,
} from '../pending/store'

const api = new Hono()

// Enable CORS for web UI
api.use('/*', cors())

// Get a pending request by ID
api.get('/pending/:id', (c) => {
  const { id } = c.req.param()
  const request = getPendingRequest(id)

  if (!request) {
    return c.json({ error: 'Request not found or expired' }, 404)
  }

  return c.json(request)
})

// Record a submitted transaction hash (for logging/visibility)
api.post('/tx/:id/hash', async (c) => {
  const { id } = c.req.param()
  let body: { hash?: string } | null = null

  try {
    body = await c.req.json<{ hash?: string }>()
  } catch (err) {
    return c.json({ error: 'Invalid JSON payload' }, 400)
  }

  if (!body?.hash) {
    return c.json({ error: 'Missing hash' }, 400)
  }

  const request = getPendingRequest(id)
  if (!request) {
    console.warn(`\x1b[31m✗ Unknown request:\x1b[0m ${id}`)
    return c.json({ error: 'Request not found or expired' }, 404)
  }

  console.log(`\x1b[32m✓ Submitted:\x1b[0m ${body.hash}`)
  return c.json({ ok: true })
})

// Complete a pending request
api.post('/complete/:id', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json<{
    success: boolean
    result?: string
    error?: string
  }>()

  const resolved = resolvePendingRequest(id, {
    success: body.success,
    result: body.result,
    error: body.error,
  })

  if (!resolved) {
    return c.json({ error: 'Request not found or already completed' }, 404)
  }

  return c.json({ ok: true })
})

// List all pending request IDs (useful for debugging)
api.get('/pending', (c) => {
  const ids = getAllPendingIds()
  return c.json({ pending: ids })
})

export { api }
