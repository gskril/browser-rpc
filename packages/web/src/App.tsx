import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Route, Routes } from 'react-router'
import { WagmiProvider } from 'wagmi'

import { wagmiConfig } from './lib/wagmi'
import TransactionPage from './pages/Transaction'

const queryClient = new QueryClient()

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
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
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
