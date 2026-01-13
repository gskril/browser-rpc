import { useAccount, useConnect, useConnectors, useDisconnect } from 'wagmi'

import { Button } from '@/components/ui/button'

export function ConnectButton() {
  const { address, isConnected } = useAccount()
  const connectors = useConnectors()
  const { mutate: connect, isPending } = useConnect()
  const { mutate: disconnect } = useDisconnect()

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

  // Find injected connector (browser wallet)
  const injected = connectors.find((c) => c.type === 'injected')

  if (!injected) {
    return (
      <p className="text-muted-foreground font-mono text-sm">
        No wallet detected
      </p>
    )
  }

  return (
    <Button
      onClick={() => connect({ connector: injected })}
      disabled={isPending}
    >
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  )
}
