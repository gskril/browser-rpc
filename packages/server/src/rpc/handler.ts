import {
  createPendingSign,
  createPendingSignTypedData,
  createPendingTransaction,
} from '../pending/store.js'
import {
  type InterceptedMethodType,
  getInterceptedMethodType,
  shouldIntercept,
} from './methods.js'
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  TransactionRequest,
} from './types.js'

export interface RpcHandlerConfig {
  upstreamRpcUrl: string
  uiBaseUrl: string
  fromAddress?: string
  onPendingRequest: (id: string, url: string) => void
}

function createSuccessResponse(
  id: number | string,
  result: unknown
): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result }
}

function createErrorResponse(
  id: number | string,
  code: number,
  message: string
): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

export async function handleRpcRequest(
  request: JsonRpcRequest,
  config: RpcHandlerConfig
): Promise<JsonRpcResponse> {
  const { method, id } = request

  // Handle eth_accounts and eth_requestAccounts specially
  if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
    const accounts = config.fromAddress ? [config.fromAddress] : []
    return createSuccessResponse(id, accounts)
  }

  if (shouldIntercept(method)) {
    return handleInterceptedMethod(request, config)
  }

  // Pass through to upstream RPC
  return forwardToUpstream(request, config.upstreamRpcUrl)
}

async function handleInterceptedMethod(
  request: JsonRpcRequest,
  config: RpcHandlerConfig
): Promise<JsonRpcResponse> {
  const { method, params, id } = request
  const methodType = getInterceptedMethodType(method)

  if (!methodType) {
    return createErrorResponse(id, -32601, `Method ${method} not supported`)
  }

  try {
    const pending = createPendingRequest(methodType, method, params, id)
    const url = `${config.uiBaseUrl}/tx/${pending.id}`
    config.onPendingRequest(pending.id, url)

    const result = await pending.promise
    if (result.success) {
      return createSuccessResponse(id, result.result)
    }
    return createErrorResponse(
      id,
      4001,
      result.error || 'User rejected request'
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    return createErrorResponse(id, -32603, message)
  }
}

function createPendingRequest(
  methodType: InterceptedMethodType,
  method: string,
  params: unknown[] | undefined,
  id: number | string
) {
  switch (methodType) {
    case 'transaction': {
      const tx = (params?.[0] as TransactionRequest) || {}
      return createPendingTransaction(id, tx)
    }
    case 'signTypedData': {
      const address = (params?.[0] as string) || ''
      const typedData = params?.[1]
      return createPendingSignTypedData(id, address, typedData)
    }
    case 'sign': {
      // eth_sign: [address, message], personal_sign: [message, address]
      const isPersonalSign = method === 'personal_sign'
      const address = (params?.[isPersonalSign ? 1 : 0] as string) || ''
      const message = (params?.[isPersonalSign ? 0 : 1] as string) || ''
      return createPendingSign(id, address, message)
    }
  }
}

async function forwardToUpstream(
  request: JsonRpcRequest,
  upstreamUrl: string
): Promise<JsonRpcResponse> {
  try {
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const message = `Upstream RPC error: ${response.status} ${response.statusText}`
      return createErrorResponse(request.id, -32603, message)
    }

    return (await response.json()) as JsonRpcResponse
  } catch (error) {
    const message =
      error instanceof Error
        ? `Upstream RPC error: ${error.message}`
        : 'Failed to connect to upstream RPC'
    return createErrorResponse(request.id, -32603, message)
  }
}
