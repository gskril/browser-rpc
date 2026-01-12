#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { program } from 'commander'

import { bold, dim, logger } from './logger.js'
import { createServer } from './server.js'
import { fetchUpstreamChainId, openBrowser } from './utils.js'

// Show help with examples when no args provided
if (process.argv.length <= 2) {
  logger.raw(`
╔═══════════════════════════════════════════════════════════════╗
║                        browser-rpc                            ║
╚═══════════════════════════════════════════════════════════════╝

${bold('USAGE')}

  browser-rpc --rpc <upstream-url> [--from <address>]

${bold('OPTIONS')}

  -r, --rpc <url>       Upstream RPC URL (required)
  -f, --from <address>  Your wallet address (required for Hardhat)
  -p, --port <number>   Server port (default: 8545)
  --no-open             Don't auto-open browser for signing

${bold('HOW IT WORKS')}

  1. Point your dev tool at http://localhost:8545
  2. When a transaction is sent, your browser opens
  3. Connect wallet, review, and sign
  4. Transaction hash returns to your script

${dim('Docs: https://github.com/gskril/browser-rpc')}
`)
  process.exit(0)
}

async function main(): Promise<void> {
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

  logger.dim('Checking upstream RPC chain ID...')
  let chainIdHex: string
  try {
    chainIdHex = await fetchUpstreamChainId(options.rpc)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch chain ID'
    logger.fatal(`Failed to fetch chain ID from upstream RPC: ${message}`)
    process.exit(1)
  }

  const chainIdDecimal = Number.parseInt(chainIdHex, 16)
  const chainIdDisplay = Number.isNaN(chainIdDecimal)
    ? chainIdHex
    : chainIdDecimal
  logger.success(`Upstream RPC chain ID: ${chainIdDisplay}`)

  const fromLine = options.from ? `  From:         ${options.from}\n` : ''

  const server = createServer({
    upstreamRpcUrl: options.rpc,
    port,
    fromAddress: options.from,
    onPendingRequest: (id, url) => {
      logger.pending(`Awaiting approval: ${url}`)
      if (options.open) {
        openBrowser(url)
      }
    },
  })

  serve({
    fetch: server.fetch,
    port,
  })

  logger.raw(`
╔═══════════════════════════════════════════════════════════════╗
║                        browser-rpc                            ║
╚═══════════════════════════════════════════════════════════════╝

  Server:       http://localhost:${port}
  Upstream:     ${options.rpc}
  Chain ID:     ${chainIdDisplay}
${fromLine}  Auto-open:    ${options.open ? 'enabled' : 'disabled'}

  Use http://localhost:${port} as your RPC URL in Foundry/Hardhat.

  Example:
    forge script script/Deploy.s.sol --rpc-url http://localhost:${port} \\
      --broadcast --unlocked --sender 0xYourWallet
`)

  if (!options.from) {
    logger.warn(
      'Warning: No --from address specified, which may cause issues in Hardhat.'
    )
  }
}

main().catch((error) => {
  logger.fatal(
    `Unexpected error starting browser-rpc: ${
      error instanceof Error ? error.message : String(error)
    }`
  )
  process.exit(1)
})
