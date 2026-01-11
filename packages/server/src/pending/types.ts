import type { SignTypedDataRequest, TransactionRequest } from '../rpc/types'

export type PendingRequestType = 'transaction' | 'signTypedData' | 'sign'

export interface PendingTransactionRequest {
  type: 'transaction'
  id: string
  jsonRpcId: number | string
  transaction: TransactionRequest
  createdAt: number
}

export interface PendingSignTypedDataRequest {
  type: 'signTypedData'
  id: string
  jsonRpcId: number | string
  request: SignTypedDataRequest
  createdAt: number
}

export interface PendingSignRequest {
  type: 'sign'
  id: string
  jsonRpcId: number | string
  address: string
  message: string
  createdAt: number
}

export type PendingRequest =
  | PendingTransactionRequest
  | PendingSignTypedDataRequest
  | PendingSignRequest

export interface PendingRequestResult {
  success: boolean
  result?: string
  error?: string
}
