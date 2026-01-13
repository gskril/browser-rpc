import type { Chain } from 'viem'
import { createConfig, http } from 'wagmi'

import { chainMap } from './chains.generated'

const DEFAULT_NATIVE_CURRENCY = { name: 'Ether', symbol: 'ETH', decimals: 18 }

// Build a Chain object from chain ID, using generated metadata if available
function buildChain(chainId: number): Chain {
  const meta = chainMap[chainId]

  return {
    id: chainId,
    name: meta?.name ?? `Chain ${chainId}`,
    nativeCurrency: meta?.nativeCurrency ?? DEFAULT_NATIVE_CURRENCY,
    rpcUrls: {
      default: { http: ['/'] },
    },
    blockExplorers: meta?.blockExplorer
      ? { default: { name: 'Explorer', url: meta.blockExplorer } }
      : undefined,
  }
}

// Fetch chain ID from the proxy server
async function fetchProxyChainId(): Promise<number> {
  const response = await fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_chainId',
      params: [],
    }),
  })
  const data: { result?: string } = await response.json()
  if (!data.result) {
    throw new Error('Failed to fetch chain ID from proxy')
  }
  return parseInt(data.result, 16)
}

export interface WagmiConfigResult {
  config: ReturnType<typeof createConfig>
  chain: Chain
}

// Create wagmi config with the chain from the proxy
export async function createWagmiConfig(): Promise<WagmiConfigResult> {
  const chainId = await fetchProxyChainId()
  const chain = buildChain(chainId)

  const config = createConfig({
    chains: [chain],
    transports: {
      [chain.id]: http('/'),
    },
  })

  return { config, chain }
}

export function getBlockExplorerTxUrl(
  chain: Chain,
  hash: string
): string | undefined {
  const baseUrl = chain.blockExplorers?.default?.url
  if (!baseUrl) return undefined
  return `${baseUrl.replace(/\/$/, '')}/tx/${hash}`
}
