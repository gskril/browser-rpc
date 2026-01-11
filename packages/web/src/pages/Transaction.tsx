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
import { getBlockExplorerTxUrl } from '@/lib/wagmi'

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
    <div className="bg-destructive/10 border-destructive/20 mb-4 rounded-lg border p-4">
      <p className="text-destructive mb-2 font-medium">Chain Mismatch</p>
      <p className="text-muted-foreground mb-3 text-sm">
        The server is configured for{' '}
        <span className="font-medium">{expectedChainName}</span>, but your
        wallet is connected to{' '}
        <span className="font-medium">Chain {walletChainId}</span>.
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

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>()
  const { data: pendingRequest, isLoading, error } = usePendingTransaction(id!)
  const { isConnected } = useAccount()
  const walletChainId = useChainId()
  const proxyChain = useProxyChain()

  const hasChainMismatch = isConnected && walletChainId !== proxyChain.id

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading transaction...</p>
      </div>
    )
  }

  if (error || !pendingRequest) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">
              Request Not Found
            </CardTitle>
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
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
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
          <ConnectButton showBalance={false} />
        </CardHeader>

        <CardContent>
          {hasChainMismatch && (
            <ChainMismatchWarning
              expectedChainName={proxyChain.name}
              expectedChainId={proxyChain.id}
              walletChainId={walletChainId}
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

        <CardFooter>
          {isConnected ? (
            hasChainMismatch ? (
              <p className="text-muted-foreground w-full text-center text-sm">
                Switch to the correct chain to continue
              </p>
            ) : (
              <ExecuteButton request={pendingRequest} />
            )
          ) : (
            <p className="text-muted-foreground w-full text-center text-sm">
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
          <code className="text-xs break-all">{tx.to}</code>
        </Field>
      )}
      {tx.value && tx.value !== '0x0' && (
        <Field label="Value">{formatEther(BigInt(tx.value))} ETH</Field>
      )}
      {tx.data && tx.data !== '0x' && (
        <Field label="Data">
          <code className="bg-muted block max-h-32 overflow-auto rounded p-2 text-xs break-all">
            {tx.data}
          </code>
        </Field>
      )}
      {tx.gas && <Field label="Gas Limit">{BigInt(tx.gas).toString()}</Field>}
      <Field label="Chain">{proxyChain.name}</Field>
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
        <code className="text-xs break-all">{request.request.address}</code>
      </Field>
      <Field label="Typed Data">
        <code className="bg-muted block max-h-48 overflow-auto rounded p-2 text-xs break-all">
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
        <code className="text-xs break-all">{request.address}</code>
      </Field>
      <Field label="Message">
        <code className="bg-muted block max-h-32 overflow-auto rounded p-2 text-xs break-all">
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
      <dt className="text-muted-foreground mb-1 text-sm font-medium">
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
      <div className="w-full space-y-2 text-center">
        <p className="font-medium text-green-500">Transaction submitted!</p>
        {request.type === 'transaction' && txHash ? (
          <div className="text-muted-foreground space-y-1 text-sm">
            <p className="break-all">
              Hash:{' '}
              <code className="bg-muted rounded px-1 py-0.5 text-[11px]">
                {txHash}
              </code>
            </p>
            {explorerUrl ? (
              <p>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  View on block explorer
                </a>
              </p>
            ) : null}
          </div>
        ) : null}
        <p className="text-muted-foreground text-sm">You can close this tab.</p>
      </div>
    )
  }

  if (status === 'error' && errorMessage) {
    return (
      <div className="w-full text-center">
        <p className="text-destructive font-medium">Error</p>
        <p className="text-muted-foreground mt-1 text-sm">{errorMessage}</p>
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
