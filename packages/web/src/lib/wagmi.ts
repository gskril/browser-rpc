import { getDefaultWallets } from '@rainbow-me/rainbowkit'
import { porto } from 'porto/wagmi'
import { createConfig, http } from 'wagmi'
import { base, mainnet } from 'wagmi/chains'

const WALLETCONNECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || 'demo'

const { connectors } = getDefaultWallets({
  appName: 'browser-rpc',
  projectId: WALLETCONNECT_ID,
})

export const chains = [base, mainnet] as const

export const wagmiConfig = createConfig({
  chains,
  connectors: [...connectors, porto()],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
  },
})

export function getBlockExplorerTxUrl(
  chainId: number,
  hash: string
): string | undefined {
  const chain = wagmiConfig.chains.find((c) => c.id === chainId)
  const baseUrl = chain?.blockExplorers?.default?.url
  if (!baseUrl) return undefined
  return `${baseUrl.replace(/\/$/, '')}/tx/${hash}`
}
