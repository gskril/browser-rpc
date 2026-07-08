import { Hono } from 'hono'

import { logger } from '../logger.js'
import { getPendingRequest, resolvePendingRequest } from '../pending/store.js'

const api = new Hono()

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
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400)
  }

  if (!body?.hash) {
    return c.json({ error: 'Missing hash' }, 400)
  }

  const request = getPendingRequest(id)
  if (!request) {
    logger.error(`Unknown request: ${id}`)
    return c.json({ error: 'Request not found or expired' }, 404)
  }

  logger.success(`Submitted: ${body.hash}`)
  return c.json({ ok: true })
})

// Complete a pending request
api.post('/complete/:id', async (c) => {
  const { id } = c.req.param()

  let body: { success?: boolean; result?: string; error?: string } | null = null
  try {
    body = await c.req.json<{
      success?: boolean
      result?: string
      error?: string
    }>()
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400)
  }

  if (typeof body?.success !== 'boolean') {
    return c.json({ error: 'Missing or invalid "success" field' }, 400)
  }

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

export { api }
