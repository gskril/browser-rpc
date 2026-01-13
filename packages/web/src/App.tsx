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

export function useProxyChain(): Chain {
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
    function handleError(err: unknown): void {
      const message =
        err instanceof Error ? err.message : 'Failed to connect to proxy'
      setError(message)
    }

    createWagmiConfig().then(setConfigResult, handleError)
  }, [])

  if (error) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="max-w-md border-2 border-red-500/50 bg-red-500/10 p-6">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 bg-red-500" />
            <p className="text-sm font-medium tracking-wider text-red-400 uppercase">
              Connection Failed
            </p>
          </div>
          <p className="text-muted-foreground font-mono text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!configResult) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="bg-muted-foreground h-2 w-2 animate-pulse" />
          <p className="text-muted-foreground font-mono text-sm">
            Connecting to proxy server...
          </p>
        </div>
      </div>
    )
  }

  return (
    <WagmiProvider config={configResult.config}>
      <QueryClientProvider client={queryClient}>
        <ChainContext.Provider value={configResult.chain}>
          <div className="bg-background min-h-screen">
            <Routes>
              <Route path="/tx/:id" element={<TransactionPage />} />
              <Route
                path="/"
                element={
                  <div className="flex min-h-screen items-center justify-center">
                    <div className="space-y-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="bg-primary h-2 w-2 animate-pulse" />
                        <p className="text-muted-foreground font-mono text-sm tracking-wider uppercase">
                          Awaiting Transactions
                        </p>
                      </div>
                      <p className="text-muted-foreground/60 font-mono text-xs">
                        Run a script to see transactions here
                      </p>
                    </div>
                  </div>
                }
              />
            </Routes>
          </div>
        </ChainContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
