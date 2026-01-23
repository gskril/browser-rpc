import { type UseQueryResult, useQuery } from '@tanstack/react-query'
import type { PendingRequest } from 'browser-rpc/types'

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
