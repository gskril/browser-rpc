// Methods that require wallet interaction
const INTERCEPTED_METHODS = new Set([
  'eth_sendTransaction',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'eth_sign',
  'personal_sign',
])

// Methods that pass through to upstream RPC
// This list is not exhaustive - anything not intercepted passes through
const PASSTHROUGH_METHODS = new Set([
  'eth_call',
  'eth_estimateGas',
  'eth_chainId',
  'eth_blockNumber',
  'eth_getBalance',
  'eth_getTransactionReceipt',
  'eth_getTransactionByHash',
  'eth_getBlockByNumber',
  'eth_getBlockByHash',
  'eth_gasPrice',
  'eth_maxPriorityFeePerGas',
  'eth_getCode',
  'eth_getStorageAt',
  'eth_getTransactionCount',
  'eth_getLogs',
  'eth_accounts',
  'eth_requestAccounts',
  'net_version',
  'web3_clientVersion',
])

export function shouldIntercept(method: string): boolean {
  return INTERCEPTED_METHODS.has(method)
}

export function isKnownMethod(method: string): boolean {
  return INTERCEPTED_METHODS.has(method) || PASSTHROUGH_METHODS.has(method)
}

export type InterceptedMethodType = 'transaction' | 'signTypedData' | 'sign'

export function getInterceptedMethodType(
  method: string
): InterceptedMethodType | null {
  switch (method) {
    case 'eth_sendTransaction':
      return 'transaction'
    case 'eth_signTypedData':
    case 'eth_signTypedData_v3':
    case 'eth_signTypedData_v4':
      return 'signTypedData'
    case 'eth_sign':
    case 'personal_sign':
      return 'sign'
    default:
      return null
  }
}
