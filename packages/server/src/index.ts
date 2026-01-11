#!/usr/bin/env bun

import { program } from 'commander'
import { createServer } from './server'

program
  .name('browser-rpc')
  .description(
    'Local RPC proxy for secure transaction signing via browser wallet'
  )
  .requiredOption('-r, --rpc <url>', 'Upstream RPC URL for read calls')
  .option('-p, --port <number>', 'Server port', '8545')
  .option('--no-open', 'Disable auto-opening browser for transactions')
  .parse()

const options = program.opts<{
  rpc: string
  port: string
  open: boolean
}>()

const port = parseInt(options.port, 10)

async function openBrowser(url: string) {
  const args = [url]
  let command: string

  if (process.platform === 'darwin') {
    command = 'open'
  } else if (process.platform === 'win32') {
    command = 'cmd'
    args.unshift('/c', 'start', '')
  } else {
    command = 'xdg-open'
  }

  try {
    Bun.spawn([command, ...args])
  } catch (error) {
    console.error(`Failed to open browser: ${error}`)
  }
}

const server = createServer({
  upstreamRpcUrl: options.rpc,
  port,
  onPendingRequest: (id, url) => {
    console.log(`\n🔐 Transaction pending: ${url}`)
    if (options.open) {
      openBrowser(url)
    }
  },
})

Bun.serve({
  fetch: server.fetch,
  port,
})

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                        browser-rpc                            ║
╚═══════════════════════════════════════════════════════════════╝

  Server:       http://localhost:${port}
  Upstream:     ${options.rpc}
  Auto-open:    ${options.open ? 'enabled' : 'disabled'}

  Use http://localhost:${port} as your RPC URL in Foundry/Hardhat.

  Example:
    forge script script/Deploy.s.sol --rpc-url http://localhost:${port}

`)
