import { getDefaultWallets } from '@rainbow-me/rainbowkit'
import type { Chain } from 'viem'
import * as allChains from 'viem/chains'
import { createConfig, http } from 'wagmi'

const WALLETCONNECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || 'demo'

const { connectors } = getDefaultWallets({
  appName: 'browser-rpc',
  projectId: WALLETCONNECT_ID,
})

// Find a chain by ID from viem's chain list
function findChainById(chainId: number): Chain | undefined {
  for (const chain of Object.values(allChains)) {
    if (
      typeof chain === 'object' &&
      chain !== null &&
      'id' in chain &&
      (chain as Chain).id === chainId
    ) {
      return chain as Chain
    }
  }
  return undefined
}

// Create a minimal chain definition for unknown chains
function createUnknownChain(chainId: number): Chain {
  return {
    id: chainId,
    name: `Chain ${chainId}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['/'] },
    },
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

  // Try to find a known chain, otherwise create a minimal one
  const knownChain = findChainById(chainId)
  const chain: Chain = knownChain ?? createUnknownChain(chainId)

  const config = createConfig({
    chains: [chain],
    connectors: [...connectors],
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
