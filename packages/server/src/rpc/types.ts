export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number | string
  method: string
  params?: unknown[]
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number | string
  result?: unknown
  error?: JsonRpcError
}

export interface JsonRpcError {
  code: number
  message: string
  data?: unknown
}

export interface TransactionRequest {
  from?: string
  to?: string
  gas?: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  value?: string
  data?: string
  nonce?: string
  chainId?: string
}

export interface SignTypedDataRequest {
  address: string
  typedData: unknown
}
