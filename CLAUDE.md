# Claude Context for browser-rpc

This file provides context for AI assistants working on this project.

## Project Overview

`browser-rpc` is a local RPC proxy server that intercepts Ethereum transactions from development tools (Foundry, Hardhat) and routes them through a browser wallet for signing. This eliminates the need for developers to manage separate deployer keys with private keys in `.env` files.

## Current State

**Status: MVP feature-complete, ready for end-to-end testing**

All core components are built and the project compiles successfully. The next step is testing the full flow with a real transaction.

### What's Working

- Server starts and serves both RPC endpoint and web UI on a single port
- Transaction interception logic is implemented
- Web UI builds and renders
- Wallet connection via RainbowKit works
- API endpoints for pending transactions exist

### What Needs Testing

- Full end-to-end flow: script → server → browser → wallet → back to script
- The transfer test script in `packages/scripts/src/transfer.ts` is ready to use

## Quick Start for Testing

```bash
# Terminal 1: Build web UI and start the server
bun run dev:web
bun run dev:server -- --rpc https://mainnet.base.org

# Terminal 2: Run the test transfer script
bun run packages/scripts/src/transfer.ts
```

When the script runs, it should:

1. Call `eth_sendTransaction` to localhost:8545
2. Server intercepts and opens browser to http://localhost:8545/tx/{uuid}
3. User connects wallet and approves transaction
4. Transaction hash returns to the script

## Key Files

### Server

- `packages/server/src/index.ts` - CLI entry point
- `packages/server/src/server.ts` - Hono app setup, static file serving
- `packages/server/src/rpc/handler.ts` - RPC request routing
- `packages/server/src/rpc/methods.ts` - Which methods to intercept vs pass-through
- `packages/server/src/pending/store.ts` - In-memory store for pending transactions

### Web UI

- `packages/web/src/App.tsx` - Main app with providers, async chain loading, `useProxyChain` hook
- `packages/web/src/pages/Transaction.tsx` - Transaction review/execute page with chain mismatch detection
- `packages/web/src/lib/wagmi.ts` - Dynamic wagmi config (fetches chain from proxy)
- `packages/web/src/hooks/usePendingTransaction.ts` - Fetch pending tx data

### Scripts

- `packages/scripts/src/transfer.ts` - Simple ETH transfer for testing

## Architecture Notes

1. **Single-port architecture**: The server serves both the RPC endpoint (POST /) and the static web UI (GET /\*) on the same port (default 8545). No separate dev server needed.

2. **No private keys on server**: The server never touches private keys. It just forwards the transaction request to the browser, where the wallet handles signing.

3. **Wallet executes via proxy**: When the user clicks "Execute" in the web UI, the wallet sends the transaction through the proxy server (`http('/')`). This ensures all RPC calls go through the same endpoint.

4. **Promise-based pending store**: The server holds the HTTP connection open using a Promise that resolves when the web UI calls `/api/complete/{id}`.

5. **Extensible method routing**: To add new intercepted methods, edit `packages/server/src/rpc/methods.ts`.

6. **Dynamic chain detection**: The web UI fetches the chain ID from the proxy via `eth_chainId` on startup, then looks up chain metadata from viem's chain list. No hardcoded chains.

7. **Chain mismatch prevention**: The UI compares the proxy's chain with the wallet's connected chain and blocks execution if they don't match, offering a "Switch Chain" button.

## Publishing

The server package (`browser-rpc`) is the only published package. Web and scripts are marked private.

### GitHub Actions (Recommended)

Publishing is automated via `.github/workflows/publish.yml` using npm trusted publishers:

1. Create a GitHub release
2. The workflow builds and publishes with provenance automatically

First-time setup requires manual publish to create the package on npm, then configure trusted publishers at https://www.npmjs.com/package/browser-rpc/access.

### Manual Publishing

```bash
# Dry run (test without publishing)
bun run build && cd packages/server && npm publish --dry-run

# Publish to npm (builds web, bundles into server, publishes with provenance)
bun run publish:server
```

The publish script:

1. Builds the web package
2. Copies `packages/web/dist` to `packages/server/web-dist`
3. Builds the server package
4. Publishes with `--provenance --access public`

Note: `packages/server/web-dist` is gitignored but included in the npm tarball via the `files` list.

## Known Issues / TODOs

1. **Large bundle size**: The web UI bundle is large (~1MB) due to wallet connector dependencies and viem's chain list. Could be optimized with code splitting.

2. **No persistent config**: Users must pass `--rpc` every time. Could add a config file.

3. **Single chain per session**: The upstream RPC is fixed at startup. Multi-chain switching would require changes.

## Development Commands

```bash
# Install dependencies
bun install

# Build web UI (required before running server)
bun run --filter @browser-rpc/web build

# Run server (serves both RPC and web UI)
bun run packages/server/src/index.ts -- --rpc https://mainnet.base.org

# Build everything
bun run build

# Run transfer test script
bun run packages/scripts/src/transfer.ts

# Publish to npm
bun run publish:server

# Format code (run after major code changes)
bun run format
```

## Package Versions (as of last update)

- Bun: 1.2.8
- Hono: 4.x
- React: 19.2
- Vite: 7.3
- Wagmi: 2.16
- RainbowKit: 2.2
- viem: 2.37
- Tailwind CSS: 4.1
