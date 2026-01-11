# browser-rpc

A local RPC proxy that lets developers execute blockchain transactions through their browser wallet (MetaMask, hardware wallets, etc.) instead of managing separate deployer keys.

## Problem

Deploying EVM smart contracts requires a private key. Most developers use a separate "deployer" key stored in a `.env` file, which:

- Has weaker security than a browser wallet or hardware wallet
- Requires maintaining ETH balances across multiple chains
- Is a hassle to set up correctly

## Solution

A local RPC proxy server that:

1. Receives RPC calls from Foundry/Hardhat scripts
2. Intercepts transaction requests and opens a browser UI
3. Lets users execute transactions through their preferred wallet
4. Returns the result back to the calling script

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Foundry/HH     │────▶│   browser-rpc   │────▶│  Upstream RPC   │
│  Script         │◀────│ (localhost:8545)│◀────│  (Infura, etc)  │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 │ Opens browser for signing
                                 │ (serves web UI on same port)
                                 ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │    Web UI       │────▶│  Browser Wallet │
                        │ (localhost:8545)│◀────│  (MetaMask)     │
                        └─────────────────┘     └─────────────────┘
```

## Transaction Flow

1. Foundry calls `eth_sendTransaction` to `localhost:8545`
2. Server generates unique request ID, stores tx data in memory
3. Server holds the HTTP connection open (doesn't respond yet)
4. Server opens `http://localhost:8545/tx/{id}` in browser (and logs URL)
5. Web UI loads, fetches pending tx data from `GET /api/pending/{id}`
6. User connects wallet via Rainbowkit
7. User reviews transaction details and clicks "Execute"
8. Wagmi's `useSendTransaction` sends tx directly through the wallet's RPC
9. Web UI receives tx hash from wallet
10. Web UI calls `POST /api/complete/{id}` with the tx hash
11. Server receives tx hash, responds to original Foundry request
12. Foundry continues (can poll `eth_getTransactionReceipt` as usual)

**Note:** The callback in step 10 is necessary so the server knows the tx hash to return to Foundry. The wallet executes the transaction directly (not the server), but we still need to communicate the result back.

## RPC Method Routing

| Method                      | Behavior                                                    |
| --------------------------- | ----------------------------------------------------------- |
| `eth_sendTransaction`       | Intercept → open browser → wallet executes → return tx hash |
| `eth_signTypedData*`        | Intercept → open browser → wallet signs → return signature  |
| `eth_sign`                  | Intercept → open browser → wallet signs → return signature  |
| `eth_call`                  | Pass through to upstream RPC                                |
| `eth_estimateGas`           | Pass through to upstream RPC                                |
| `eth_chainId`               | Pass through to upstream RPC                                |
| `eth_blockNumber`           | Pass through to upstream RPC                                |
| `eth_getBalance`            | Pass through to upstream RPC                                |
| `eth_getTransactionReceipt` | Pass through to upstream RPC                                |
| Everything else             | Pass through to upstream RPC                                |

The code is structured to easily add new intercepted methods later (see `packages/server/src/rpc/methods.ts`).

## Project Structure

```
browser-rpc/
├── packages/
│   ├── server/                 # Hono RPC proxy server
│   │   ├── src/
│   │   │   ├── index.ts        # Entry point, CLI parsing
│   │   │   ├── server.ts       # Hono app setup
│   │   │   ├── rpc/
│   │   │   │   ├── handler.ts  # Main RPC request handler
│   │   │   │   ├── methods.ts  # Method routing logic
│   │   │   │   └── types.ts    # RPC types
│   │   │   ├── pending/
│   │   │   │   ├── store.ts    # In-memory pending tx store
│   │   │   │   └── types.ts    # Pending tx types
│   │   │   └── api/
│   │   │       └── routes.ts   # REST API for web UI
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                    # React signing UI
│   │   ├── src/
│   │   │   ├── main.tsx        # Entry point
│   │   │   ├── App.tsx         # App wrapper with providers
│   │   │   ├── pages/
│   │   │   │   └── Transaction.tsx  # Transaction signing page
│   │   │   ├── components/
│   │   │   │   └── ui/         # Shadcn components (button, card)
│   │   │   ├── hooks/
│   │   │   │   └── usePendingTransaction.ts
│   │   │   └── lib/
│   │   │       ├── wagmi.ts    # Wagmi config
│   │   │       └── utils.ts    # Shadcn utils
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   └── scripts/                # Test scripts (viem playground)
│       ├── src/
│       │   └── transfer.ts     # Simple ETH transfer test
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                # Workspace root
├── bunfig.toml                 # Bun configuration
├── tsconfig.json               # Base TypeScript config
├── PLAN.md                     # This file
└── CLAUDE.md                   # Context for AI assistants
```

## CLI Interface

```bash
# Basic usage
bun run packages/server/src/index.ts -- --rpc https://mainnet.base.org

# With options
bun run packages/server/src/index.ts -- \
  --rpc https://mainnet.base.org \
  --port 8545 \
  --no-open  # Disable auto-opening browser
```

### CLI Options

| Flag           | Default    | Description                              |
| -------------- | ---------- | ---------------------------------------- |
| `--rpc`, `-r`  | (required) | Upstream RPC URL for read calls          |
| `--port`, `-p` | `8545`     | Server port (serves both RPC and web UI) |
| `--no-open`    | `false`    | Disable auto-opening browser             |

## Tech Stack

### Server (`packages/server`)

- **Runtime**: Bun
- **Framework**: Hono
- **Language**: TypeScript

### Web UI (`packages/web`)

- **Build**: Vite 7
- **Framework**: React 19
- **Language**: TypeScript
- **Wallet**: Wagmi 2.16 + RainbowKit 2.2 + Porto
- **Styling**: Tailwind CSS 4 + Shadcn/ui

### Scripts (`packages/scripts`)

- **Runtime**: Bun
- **Library**: viem 2.37

### Tooling

- **Package Manager**: Bun
- **Workspaces**: Bun workspaces

## Implementation Status

### Phase 1: Basic Infrastructure ✅

- [x] Set up monorepo with Bun workspaces
- [x] Create server package with Hono
- [x] Create web package with Vite + React
- [x] Implement basic RPC pass-through

### Phase 2: Transaction Interception ✅

- [x] Implement pending transaction store
- [x] Add `eth_sendTransaction` interception
- [x] Add REST API for web UI (`/api/pending/:id`, `/api/complete/:id`)
- [x] Implement browser opening logic

### Phase 3: Web UI ✅

- [x] Set up Wagmi + Rainbowkit
- [x] Set up Shadcn/ui (button, card)
- [x] Build transaction review page
- [x] Implement wallet connection
- [x] Implement transaction execution
- [x] Add callback to server on completion

### Phase 4: Testing & Polish 🔄

- [x] Add CLI argument parsing
- [x] Add timeout handling for pending transactions (5 min)
- [x] Create test scripts package
- [ ] **NEXT: End-to-end test with transfer script**
- [ ] Test with Foundry scripts
- [ ] Error handling improvements
- [ ] UI polish

## Future Considerations (Not in MVP)

- Batch transaction page (queue multiple txs)
- `eth_signTypedData` support (EIP-712) - basic structure exists
- Transaction simulation/preview
- Gas estimation display
- Multi-chain support in single session
- Persistent configuration file
- npm package publishing
