#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { spawn } from 'child_process'
import { program } from 'commander'

import { createServer } from './server'

// Show help with examples when no args provided
if (process.argv.length <= 2) {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                        browser-rpc                            ║
╚═══════════════════════════════════════════════════════════════╝

\x1b[1mUSAGE\x1b[0m

  browser-rpc --rpc <upstream-url> [--from <address>]

\x1b[1mOPTIONS\x1b[0m

  -r, --rpc <url>       Upstream RPC URL (required)
  -f, --from <address>  Your wallet address (required for Hardhat)
  -p, --port <number>   Server port (default: 8545)
  --no-open             Don't auto-open browser for signing

\x1b[1mHOW IT WORKS\x1b[0m

  1. Point your dev tool at http://localhost:8545
  2. When a transaction is sent, your browser opens
  3. Connect wallet, review, and sign
  4. Transaction hash returns to your script

\x1b[2mDocs: https://github.com/gskril/browser-rpc\x1b[0m
`)
  process.exit(0)
}

program
  .name('browser-rpc')
  .description(
    'Local RPC proxy for secure transaction signing via browser wallet'
  )
  .requiredOption('-r, --rpc <url>', 'Upstream RPC URL for read calls')
  .option('-p, --port <number>', 'Server port', '8545')
  .option(
    '-f, --from <address>',
    'Default wallet address (returned for eth_accounts)'
  )
  .option('--no-open', 'Disable auto-opening browser for transactions')
  .parse()

const options = program.opts<{
  rpc: string
  port: string
  from?: string
  open: boolean
}>()

const port = parseInt(options.port, 10)

function openBrowser(url: string) {
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
    spawn(command, args, { detached: true, stdio: 'ignore' }).unref()
  } catch (error) {
    console.error(`Failed to open browser: ${error}`)
  }
}

const server = createServer({
  upstreamRpcUrl: options.rpc,
  port,
  fromAddress: options.from,
  onPendingRequest: (id, url) => {
    console.log(`\n\x1b[33m⏳ Awaiting approval:\x1b[0m ${url}`)
    if (options.open) {
      openBrowser(url)
    }
  },
})

serve({
  fetch: server.fetch,
  port,
})

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                        browser-rpc                            ║
╚═══════════════════════════════════════════════════════════════╝

  Server:       http://localhost:${port}
  Upstream:     ${options.rpc}
  From:         ${options.from || '(not set - use --from to specify)'}
  Auto-open:    ${options.open ? 'enabled' : 'disabled'}

  Use http://localhost:${port} as your RPC URL in Foundry/Hardhat.

  Example:
    forge script script/Deploy.s.sol --rpc-url http://localhost:${port} \\
      --broadcast --unlocked --sender 0xYourWallet
${!options.from ? '\n  \x1b[33m⚠ Warning: No --from address specified, which may cause issues in Hardhat.\x1b[0m\n' : ''}
`)
