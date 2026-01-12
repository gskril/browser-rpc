import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit'
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

// Hook to detect system color scheme
function useColorScheme() {
  const [isDark, setIsDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return isDark
}

// RainbowKit themes to match industrial aesthetic
const industrialDarkTheme = darkTheme({
  accentColor: 'hsl(160, 100%, 45%)',
  accentColorForeground: 'hsl(220, 15%, 6%)',
  borderRadius: 'none',
  fontStack: 'system',
})

const industrialLightTheme = lightTheme({
  accentColor: 'hsl(160, 85%, 35%)',
  accentColorForeground: 'hsl(0, 0%, 100%)',
  borderRadius: 'none',
  fontStack: 'system',
})

export default function App() {
  const [configResult, setConfigResult] = useState<WagmiConfigResult | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const isDark = useColorScheme()

  useEffect(() => {
    createWagmiConfig()
      .then(setConfigResult)
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="border-2 border-red-500/50 bg-red-500/10 p-6 max-w-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-red-500" />
            <p className="text-red-400 font-medium text-sm uppercase tracking-wider">
              Connection Failed
            </p>
          </div>
          <p className="text-muted-foreground text-sm font-mono">{error}</p>
        </div>
      </div>
    )
  }

  if (!configResult) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-muted-foreground animate-pulse" />
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
        <RainbowKitProvider theme={isDark ? industrialDarkTheme : industrialLightTheme}>
          <ChainContext.Provider value={configResult.chain}>
            <div className="bg-background min-h-screen">
              <Routes>
                <Route path="/tx/:id" element={<TransactionPage />} />
                <Route
                  path="/"
                  element={
                    <div className="flex min-h-screen items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-2 h-2 bg-primary animate-pulse" />
                          <p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">
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
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
