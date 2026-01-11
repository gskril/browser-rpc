import '@rainbow-me/rainbowkit/styles.css'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { Routes, Route } from 'react-router'
import { wagmiConfig } from './lib/wagmi'
import TransactionPage from './pages/Transaction'

const queryClient = new QueryClient()

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/tx/:id" element={<TransactionPage />} />
              <Route
                path="/"
                element={
                  <div className="flex items-center justify-center min-h-screen">
                    <p className="text-muted-foreground">
                      Waiting for transactions...
                    </p>
                  </div>
                }
              />
            </Routes>
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
