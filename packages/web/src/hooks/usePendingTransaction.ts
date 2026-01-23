import { type UseQueryResult, useQuery } from '@tanstack/react-query'

export interface TransactionRequest {
  from?: string
  to?: string | null
  gas?: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  value?: string
  data?: string
  input?: string // Some tools (Foundry) use "input" instead of "data"
  nonce?: string
  chainId?: string
}

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
  request: {
    address: string
    typedData: unknown
  }
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

async function fetchPendingRequest(id: string): Promise<PendingRequest> {
  const response = await fetch(`/api/pending/${id}`)
  if (!response.ok) {
    throw new Error('Request not found or expired')
  }
  return response.json()
}

export function usePendingTransaction(
  id: string
): UseQueryResult<PendingRequest, Error> {
  return useQuery<PendingRequest, Error>({
    queryKey: ['pending', id],
    queryFn: () => fetchPendingRequest(id),
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export async function completeRequest(
  id: string,
  result: { success: boolean; result?: string; error?: string }
): Promise<void> {
  const response = await fetch(`/api/complete/${id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(result),
  })

  if (!response.ok) {
    throw new Error('Failed to complete request')
  }
}

export async function notifyTransactionHash(
  id: string,
  hash: string
): Promise<void> {
  const response = await fetch(`/api/tx/${id}/hash`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hash }),
  })

  if (!response.ok) {
    throw new Error('Failed to notify transaction hash')
  }
}
