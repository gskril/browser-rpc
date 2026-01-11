import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useState } from 'react'
import { Route, Routes } from 'react-router'
import type { Chain } from 'viem'
import { WagmiProvider } from 'wagmi'

import { type WagmiConfigResult, createWagmiConfig } from './lib/wagmi'
import TransactionPage from './pages/Transaction'

const queryClient = new QueryClient()

// Context to provide the chain info to child components
const ChainContext = createContext<Chain | null>(null)

export function useProxyChain() {
  const chain = useContext(ChainContext)
  if (!chain) {
    throw new Error('useProxyChain must be used within App')
  }
  return chain
}

export default function App() {
  const [configResult, setConfigResult] = useState<WagmiConfigResult | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    createWagmiConfig()
      .then(setConfigResult)
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-medium">
            Failed to connect to proxy server
          </p>
          <p className="text-muted-foreground mt-1 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!configResult) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Connecting to proxy server...</p>
      </div>
    )
  }

  return (
    <WagmiProvider config={configResult.config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <ChainContext.Provider value={configResult.chain}>
            <div className="bg-background min-h-screen">
              <Routes>
                <Route path="/tx/:id" element={<TransactionPage />} />
                <Route
                  path="/"
                  element={
                    <div className="flex min-h-screen items-center justify-center">
                      <p className="text-muted-foreground">
                        Waiting for transactions...
                      </p>
                    </div>
                  }
                />
              </Routes>
            </div>
          </ChainContext.Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
