import { randomUUID } from 'crypto'

import type { TransactionRequest } from '../rpc/types.js'
import type {
  PendingRequest,
  PendingRequestResult,
  PendingSignRequest,
  PendingSignTypedDataRequest,
  PendingTransactionRequest,
} from './types.js'

interface PendingEntry {
  request: PendingRequest
  resolve: (result: PendingRequestResult) => void
  timer: ReturnType<typeof setTimeout>
}

type PendingResult = { id: string; promise: Promise<PendingRequestResult> }

const pending = new Map<string, PendingEntry>()

const REQUEST_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

// Cap the number of concurrent pending requests to bound memory / open tabs.
const MAX_PENDING = 100

export function createPendingTransaction(
  jsonRpcId: number | string,
  transaction: TransactionRequest
): PendingResult {
  const id = randomUUID()
  const request: PendingTransactionRequest = {
    type: 'transaction',
    id,
    jsonRpcId,
    transaction,
    createdAt: Date.now(),
  }
  return createPendingEntry(id, request)
}

export function createPendingSignTypedData(
  jsonRpcId: number | string,
  address: string,
  typedData: unknown
): PendingResult {
  const id = randomUUID()
  const request: PendingSignTypedDataRequest = {
    type: 'signTypedData',
    id,
    jsonRpcId,
    request: { address, typedData },
    createdAt: Date.now(),
  }
  return createPendingEntry(id, request)
}

export function createPendingSign(
  jsonRpcId: number | string,
  address: string,
  message: string
): PendingResult {
  const id = randomUUID()
  const request: PendingSignRequest = {
    type: 'sign',
    id,
    jsonRpcId,
    address,
    message,
    createdAt: Date.now(),
  }
  return createPendingEntry(id, request)
}

function createPendingEntry(
  id: string,
  request: PendingRequest
): PendingResult {
  if (pending.size >= MAX_PENDING) {
    throw new Error('Too many pending requests')
  }

  let resolve: (result: PendingRequestResult) => void
  const promise = new Promise<PendingRequestResult>((res) => {
    resolve = res
  })

  // Auto-timeout after 5 minutes
  const timer = setTimeout(() => {
    const entry = pending.get(id)
    if (entry) {
      entry.resolve({ success: false, error: 'Request timed out' })
      pending.delete(id)
    }
  }, REQUEST_TIMEOUT_MS)
  // Don't let a pending request keep the process alive on its own.
  timer.unref?.()

  // Store entry (resolve is guaranteed assigned after Promise constructor)
  pending.set(id, { request, resolve: resolve!, timer })

  return { id, promise }
}

export function getPendingRequest(id: string): PendingRequest | undefined {
  return pending.get(id)?.request
}

export function resolvePendingRequest(
  id: string,
  result: PendingRequestResult
): boolean {
  const entry = pending.get(id)
  if (!entry) {
    return false
  }

  clearTimeout(entry.timer)
  entry.resolve(result)
  pending.delete(id)
  return true
}
