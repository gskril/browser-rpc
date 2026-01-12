// Methods that require wallet interaction
const INTERCEPTED_METHODS = new Set([
  'eth_sendTransaction',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'eth_sign',
  'personal_sign',
])

export type InterceptedMethodType = 'transaction' | 'signTypedData' | 'sign'

export function shouldIntercept(method: string): boolean {
  return INTERCEPTED_METHODS.has(method)
}

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
