import { spawn } from 'child_process'

import { logger } from './logger.js'

/** Open the default browser for the current platform. */
export function openBrowser(url: string): void {
  const platform = process.platform
  const command =
    platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url]

  try {
    spawn(command, args, { detached: true, stdio: 'ignore' }).unref()
  } catch (error) {
    logger.fatal(
      `Failed to open browser: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

/** Fetch the chain ID from an upstream RPC via eth_chainId. */
export async function fetchUpstreamChainId(rpcUrl: string): Promise<string> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_chainId',
      params: [],
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Upstream RPC responded with ${response.status} ${response.statusText}`
    )
  }

  const data = (await response.json()) as {
    result?: unknown
    error?: { message?: string }
  }

  if (typeof data.result === 'string') {
    return data.result
  }

  const upstreamError =
    typeof data.error?.message === 'string'
      ? data.error.message
      : 'Missing eth_chainId result in upstream response'
  throw new Error(upstreamError)
}
