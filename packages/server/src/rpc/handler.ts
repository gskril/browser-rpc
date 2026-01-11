import {
  createPendingSign,
  createPendingSignTypedData,
  createPendingTransaction,
} from '../pending/store'
import { getInterceptedMethodType, shouldIntercept } from './methods'
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  TransactionRequest,
} from './types'

export interface RpcHandlerConfig {
  upstreamRpcUrl: string
  uiBaseUrl: string
  onPendingRequest: (id: string, url: string) => void
}

export async function handleRpcRequest(
  request: JsonRpcRequest,
  config: RpcHandlerConfig
): Promise<JsonRpcResponse> {
  const { method, params, id } = request

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
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method ${method} not supported`,
      },
    }
  }

  try {
    switch (methodType) {
      case 'transaction': {
        const tx = (params?.[0] as TransactionRequest) || {}
        const pending = createPendingTransaction(id, tx)
        const url = `${config.uiBaseUrl}/tx/${pending.id}`
        config.onPendingRequest(pending.id, url)

        const result = await pending.promise
        if (result.success) {
          return {
            jsonrpc: '2.0',
            id,
            result: result.result,
          }
        } else {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: 4001,
              message: result.error || 'User rejected request',
            },
          }
        }
      }

      case 'signTypedData': {
        // For eth_signTypedData_v4: params are [address, typedData]
        const address = (params?.[0] as string) || ''
        const typedData = params?.[1]
        const pending = createPendingSignTypedData(id, address, typedData)
        const url = `${config.uiBaseUrl}/tx/${pending.id}`
        config.onPendingRequest(pending.id, url)

        const result = await pending.promise
        if (result.success) {
          return {
            jsonrpc: '2.0',
            id,
            result: result.result,
          }
        } else {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: 4001,
              message: result.error || 'User rejected request',
            },
          }
        }
      }

      case 'sign': {
        // eth_sign: [address, message]
        // personal_sign: [message, address]
        let address: string
        let message: string
        if (method === 'personal_sign') {
          message = (params?.[0] as string) || ''
          address = (params?.[1] as string) || ''
        } else {
          address = (params?.[0] as string) || ''
          message = (params?.[1] as string) || ''
        }

        const pending = createPendingSign(id, address, message)
        const url = `${config.uiBaseUrl}/tx/${pending.id}`
        config.onPendingRequest(pending.id, url)

        const result = await pending.promise
        if (result.success) {
          return {
            jsonrpc: '2.0',
            id,
            result: result.result,
          }
        } else {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: 4001,
              message: result.error || 'User rejected request',
            },
          }
        }
      }
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error',
      },
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: `Upstream RPC error: ${response.status} ${response.statusText}`,
        },
      }
    }

    return (await response.json()) as JsonRpcResponse
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message:
          error instanceof Error
            ? `Upstream RPC error: ${error.message}`
            : 'Failed to connect to upstream RPC',
      },
    }
  }
}
