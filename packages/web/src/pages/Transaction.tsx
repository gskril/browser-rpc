import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useState } from 'react'
import { useParams } from 'react-router'
import { type Hex, formatEther } from 'viem'
import {
  useAccount,
  useChainId,
  useSendTransaction,
  useSignMessage,
  useSignTypedData,
  useSwitchChain,
} from 'wagmi'

import { useProxyChain } from '@/App'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  type PendingRequest,
  completeRequest,
  notifyTransactionHash,
  usePendingTransaction,
} from '@/hooks/usePendingTransaction'
import { useServerConfig } from '@/hooks/useServerConfig'
import { getBlockExplorerTxUrl } from '@/lib/wagmi'

function StatusIndicator({
  status,
}: {
  status: 'error' | 'warning' | 'success' | 'pending'
}) {
  const colors = {
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    success: 'bg-primary',
    pending: 'bg-muted-foreground animate-pulse',
  }
  return <div className={`h-2 w-2 ${colors[status]}`} />
}

function ChainMismatchWarning({
  expectedChainName,
  expectedChainId,
  walletChainId,
}: {
  expectedChainName: string
  expectedChainId: number
  walletChainId: number
}) {
  const { switchChain, isPending } = useSwitchChain()

  const handleSwitch = () => {
    switchChain({ chainId: expectedChainId })
  }

  return (
    <div className="mb-4 border-2 border-red-500/50 bg-red-500/10 p-4">
      <div className="mb-2 flex items-center gap-2">
        <StatusIndicator status="error" />
        <p className="text-sm font-medium tracking-wider text-red-400 uppercase">
          Chain Mismatch
        </p>
      </div>
      <p className="text-muted-foreground mb-3 font-mono text-sm">
        Expected: <span className="text-foreground">{expectedChainName}</span>
        <br />
        Connected:{' '}
        <span className="text-foreground">Chain {walletChainId}</span>
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSwitch}
        disabled={isPending}
      >
        {isPending ? 'Switching...' : `Switch to ${expectedChainName}`}
      </Button>
    </div>
  )
}

function AddressMismatchWarning({
  expectedAddress,
  connectedAddress,
}: {
  expectedAddress: string
  connectedAddress: string
}) {
  return (
    <div className="mb-4 border-2 border-amber-500/50 bg-amber-500/10 p-4">
      <div className="mb-2 flex items-center gap-2">
        <StatusIndicator status="warning" />
        <p className="text-sm font-medium tracking-wider text-amber-400 uppercase">
          Address Mismatch
        </p>
      </div>
      <p className="text-muted-foreground mb-2 text-sm">
        Transaction may fail or be sent from unexpected account.
      </p>
      <div className="space-y-1 font-mono text-xs">
        <div className="flex gap-2">
          <span className="text-muted-foreground w-20">Expected:</span>
          <code className="text-foreground">{expectedAddress}</code>
        </div>
        <div className="flex gap-2">
          <span className="text-muted-foreground w-20">Connected:</span>
          <code className="text-foreground">{connectedAddress}</code>
        </div>
      </div>
    </div>
  )
}

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>()
  const { data: pendingRequest, isLoading, error } = usePendingTransaction(id!)
  const { isConnected, address: connectedAddress } = useAccount()
  const walletChainId = useChainId()
  const proxyChain = useProxyChain()
  const { data: serverConfig } = useServerConfig()

  const hasChainMismatch = isConnected && walletChainId !== proxyChain.id
  const hasAddressMismatch =
    isConnected &&
    serverConfig?.fromAddress &&
    connectedAddress &&
    serverConfig.fromAddress.toLowerCase() !== connectedAddress.toLowerCase()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3">
          <StatusIndicator status="pending" />
          <p className="text-muted-foreground font-mono text-sm">
            Loading transaction...
          </p>
        </div>
      </div>
    )
  }

  if (error || !pendingRequest) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <StatusIndicator status="error" />
              <CardTitle className="text-red-400">Request Not Found</CardTitle>
            </div>
            <CardDescription>
              This request may have expired or already been completed.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary h-8 w-1" />
              <div>
                <CardTitle>
                  {pendingRequest.type === 'transaction'
                    ? 'Transaction Request'
                    : pendingRequest.type === 'signTypedData'
                      ? 'Sign Typed Data'
                      : 'Sign Message'}
                </CardTitle>
                <CardDescription>
                  Review and execute with your wallet
                </CardDescription>
              </div>
            </div>
          </div>
          <div className="pt-4">
            <ConnectButton showBalance={false} />
          </div>
        </CardHeader>

        <CardContent>
          {hasChainMismatch && (
            <ChainMismatchWarning
              expectedChainName={proxyChain.name}
              expectedChainId={proxyChain.id}
              walletChainId={walletChainId}
            />
          )}
          {hasAddressMismatch &&
            serverConfig?.fromAddress &&
            connectedAddress && (
              <AddressMismatchWarning
                expectedAddress={serverConfig.fromAddress}
                connectedAddress={connectedAddress}
              />
            )}
          {pendingRequest.type === 'transaction' ? (
            <TransactionDetails request={pendingRequest} />
          ) : pendingRequest.type === 'signTypedData' ? (
            <SignTypedDataDetails request={pendingRequest} />
          ) : (
            <SignMessageDetails request={pendingRequest} />
          )}
        </CardContent>

        <CardFooter className="border-border border-t pt-6">
          {isConnected ? (
            hasChainMismatch ? (
              <p className="text-muted-foreground w-full text-center font-mono text-sm">
                Switch to the correct chain to continue
              </p>
            ) : (
              <ExecuteButton request={pendingRequest} />
            )
          ) : (
            <p className="text-muted-foreground w-full text-center font-mono text-sm">
              Connect your wallet to continue
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

function TransactionDetails({
  request,
}: {
  request: Extract<PendingRequest, { type: 'transaction' }>
}) {
  const proxyChain = useProxyChain()
  const tx = request.transaction

  return (
    <div className="space-y-4">
      {tx.to && (
        <Field label="To">
          <code className="text-primary font-mono text-xs break-all">
            {tx.to}
          </code>
        </Field>
      )}
      {tx.value && tx.value !== '0x0' && (
        <Field label="Value">
          <span className="font-mono">{formatEther(BigInt(tx.value))} ETH</span>
        </Field>
      )}
      {tx.data && tx.data !== '0x' && (
        <Field label="Data">
          <code className="bg-muted/50 border-border block max-h-32 overflow-auto border p-3 font-mono text-xs break-all">
            {tx.data}
          </code>
        </Field>
      )}
      {tx.gas && (
        <Field label="Gas Limit">
          <span className="font-mono">{BigInt(tx.gas).toString()}</span>
        </Field>
      )}
      <Field label="Chain">
        <span className="font-mono">{proxyChain.name}</span>
      </Field>
    </div>
  )
}

function SignTypedDataDetails({
  request,
}: {
  request: Extract<PendingRequest, { type: 'signTypedData' }>
}) {
  return (
    <div className="space-y-4">
      <Field label="Address">
        <code className="text-primary font-mono text-xs break-all">
          {request.request.address}
        </code>
      </Field>
      <Field label="Typed Data">
        <code className="bg-muted/50 border-border block max-h-48 overflow-auto border p-3 font-mono text-xs break-all whitespace-pre">
          {JSON.stringify(request.request.typedData, null, 2)}
        </code>
      </Field>
    </div>
  )
}

function SignMessageDetails({
  request,
}: {
  request: Extract<PendingRequest, { type: 'sign' }>
}) {
  return (
    <div className="space-y-4">
      <Field label="Address">
        <code className="text-primary font-mono text-xs break-all">
          {request.address}
        </code>
      </Field>
      <Field label="Message">
        <code className="bg-muted/50 border-border block max-h-32 overflow-auto border p-3 font-mono text-xs break-all">
          {request.message}
        </code>
      </Field>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wider uppercase">
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

function ExecuteButton({ request }: { request: PendingRequest }) {
  const proxyChain = useProxyChain()
  const [status, setStatus] = useState<
    'idle' | 'pending' | 'success' | 'error'
  >('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null)

  const { sendTransactionAsync } = useSendTransaction()
  const { signMessageAsync } = useSignMessage()
  const { signTypedDataAsync } = useSignTypedData()

  const handleExecute = async () => {
    setStatus('pending')
    setErrorMessage('')

    try {
      let result: string

      if (request.type === 'transaction') {
        const tx = request.transaction
        const hash = await sendTransactionAsync({
          to: tx.to as Hex | undefined,
          value: tx.value ? BigInt(tx.value) : undefined,
          data: tx.data as Hex | undefined,
          gas: tx.gas ? BigInt(tx.gas) : undefined,
          gasPrice: tx.gasPrice ? BigInt(tx.gasPrice) : undefined,
          maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas) : undefined,
          maxPriorityFeePerGas: tx.maxPriorityFeePerGas
            ? BigInt(tx.maxPriorityFeePerGas)
            : undefined,
          nonce: tx.nonce ? parseInt(tx.nonce, 16) : undefined,
          chainId: tx.chainId ? parseInt(tx.chainId, 16) : undefined,
        })

        try {
          await notifyTransactionHash(request.id, hash)
        } catch (notifyError) {
          console.warn(
            'Failed to notify server of transaction hash',
            notifyError
          )
        }

        setTxHash(hash)
        const explorer = getBlockExplorerTxUrl(proxyChain, hash)
        setExplorerUrl(explorer ?? null)
        result = hash
      } else if (request.type === 'signTypedData') {
        const typedData = request.request.typedData as any
        const signature = await signTypedDataAsync({
          domain: typedData.domain,
          types: typedData.types,
          primaryType: typedData.primaryType,
          message: typedData.message,
        })
        result = signature
      } else {
        const signature = await signMessageAsync({
          message: request.message,
        })
        result = signature
      }

      await completeRequest(request.id, { success: true, result })
      setStatus('success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setErrorMessage(message)
      setStatus('error')

      // If user rejected, notify the server
      if (message.includes('rejected') || message.includes('denied')) {
        await completeRequest(request.id, {
          success: false,
          error: 'User rejected request',
        })
      }
    }
  }

  const handleReject = async () => {
    await completeRequest(request.id, {
      success: false,
      error: 'User rejected request',
    })
    setStatus('error')
    setErrorMessage('Request rejected')
  }

  if (status === 'success') {
    return (
      <div className="w-full space-y-3">
        <div className="flex items-center justify-center gap-2">
          <StatusIndicator status="success" />
          <p className="text-primary text-sm font-medium tracking-wider uppercase">
            {request.type === 'transaction'
              ? 'Transaction Submitted'
              : 'Message Signed'}
          </p>
        </div>
        {request.type === 'transaction' && txHash ? (
          <div className="space-y-2 text-center">
            <p className="text-muted-foreground font-mono text-xs break-all">
              {txHash}
            </p>
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:text-primary/80 text-sm underline underline-offset-4"
              >
                View on block explorer →
              </a>
            ) : null}
          </div>
        ) : null}
        <p className="text-muted-foreground text-center font-mono text-xs">
          You can close this tab.
        </p>
      </div>
    )
  }

  if (status === 'error' && errorMessage) {
    return (
      <div className="w-full space-y-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <StatusIndicator status="error" />
          <p className="text-sm font-medium tracking-wider text-red-400 uppercase">
            Error
          </p>
        </div>
        <p className="text-muted-foreground font-mono text-sm">
          {errorMessage}
        </p>
      </div>
    )
  }

  return (
    <div className="flex w-full gap-3">
      <Button
        variant="outline"
        className="flex-1"
        onClick={handleReject}
        disabled={status === 'pending'}
      >
        Reject
      </Button>
      <Button
        className="flex-1"
        onClick={handleExecute}
        disabled={status === 'pending'}
      >
        {status === 'pending' ? 'Confirming...' : 'Execute'}
      </Button>
    </div>
  )
}
