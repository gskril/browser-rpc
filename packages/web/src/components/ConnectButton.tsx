import { useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

import { Button } from '@/components/ui/button'

export function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [showWallets, setShowWallets] = useState(false)

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <code className="text-muted-foreground font-mono text-sm">
          {address.slice(0, 6)}...{address.slice(-4)}
        </code>
        <Button variant="outline" size="sm" onClick={() => disconnect()}>
          Disconnect
        </Button>
      </div>
    )
  }

  // Filter to only show injected connectors (browser wallets)
  const wallets = connectors.filter((c) => c.type === 'injected')

  if (wallets.length === 0) {
    return (
      <p className="text-muted-foreground font-mono text-sm">
        No wallet detected
      </p>
    )
  }

  // Show wallet selector if user clicked connect or if multiple wallets
  if (showWallets || wallets.length > 1) {
    return (
      <div className="space-y-2">
        <div className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
          Select Wallet
        </div>
        <div className="flex flex-col gap-2">
          {wallets.map((connector) => (
            <Button
              key={connector.id}
              variant="outline"
              size="sm"
              onClick={() => {
                connect({ connector })
                setShowWallets(false)
              }}
              disabled={isPending}
              className="justify-start"
            >
              {connector.icon && (
                <img
                  src={connector.icon}
                  alt={connector.name}
                  className="mr-2 h-4 w-4"
                />
              )}
              <span className="font-mono text-xs">{connector.name}</span>
            </Button>
          ))}
        </div>
      </div>
    )
  }

  // Single wallet - show simple connect button
  return (
    <Button
      onClick={() => {
        const firstWallet = wallets[0]
        if (wallets.length === 1 && firstWallet) {
          connect({ connector: firstWallet })
        } else {
          setShowWallets(true)
        }
      }}
      disabled={isPending}
    >
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  )
}
