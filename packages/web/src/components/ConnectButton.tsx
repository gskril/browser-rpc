import { useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

import { Button } from '@/components/ui/button'

export function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [showWallets, setShowWallets] = useState(false)

  // Filter to only show injected connectors (browser wallets)
  const wallets = connectors.filter((c) => c.type === 'injected')

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-primary h-1.5 w-1.5 animate-pulse" />
          <code className="text-muted-foreground font-mono text-sm">
            {address.slice(0, 6)}...{address.slice(-4)}
          </code>
        </div>
        <Button variant="outline" size="sm" onClick={() => disconnect()}>
          Disconnect
        </Button>
      </div>
    )
  }

  if (wallets.length === 0) {
    return (
      <p className="text-muted-foreground font-mono text-sm">
        No wallet detected
      </p>
    )
  }

  function handleConnect() {
    const firstWallet = wallets[0]
    if (wallets.length === 1 && firstWallet) {
      connect({ connector: firstWallet })
    } else {
      setShowWallets(true)
    }
  }

  // Show wallet selector inline if multiple wallets or user clicked
  if (showWallets && wallets.length > 1) {
    return (
      <div className="space-y-3">
        <div className="text-muted-foreground flex items-center gap-2 font-mono text-xs tracking-wider uppercase">
          <div className="bg-primary h-1.5 w-1.5" />
          <span>Select Wallet</span>
        </div>
        <div className="flex flex-col gap-2">
          {wallets.map((connector) => (
            <button
              key={connector.id}
              onClick={() => {
                connect({ connector })
                setShowWallets(false)
              }}
              disabled={isPending}
              className="border-border hover:border-primary hover:bg-primary/5 group flex items-center gap-3 border bg-transparent p-3 text-left transition-all disabled:opacity-40"
            >
              {connector.icon && (
                <img
                  src={connector.icon}
                  alt={connector.name}
                  className="h-5 w-5"
                />
              )}
              <span className="font-mono text-sm">{connector.name}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowWallets(false)}
          className="text-muted-foreground hover:text-foreground font-mono text-xs transition-colors"
        >
          ← Back
        </button>
      </div>
    )
  }

  return (
    <Button onClick={handleConnect} disabled={isPending}>
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  )
}
