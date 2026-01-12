# Browser RPC Proxy

A local RPC proxy that routes Ethereum transactions through your browser wallet instead of requiring private keys in `.env` files.

## The Problem

Deploying smart contracts requires signing transactions with a private key. Most developers use a separate "deployer" wallet with the key stored in a `.env` file, which:

- Is less secure than a browser wallet or hardware wallet
- Requires maintaining ETH balances across multiple chains
- Is tedious to set up and manage

## The Solution

`browser-rpc` is a local proxy server that intercepts transaction requests from your development tools (Foundry, Hardhat, viem scripts) and routes them through your browser wallet for signing.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Foundry/HH     │────▶│   browser-rpc   │────▶│  Upstream RPC   │
│  Script         │◀────│ (localhost:8545)│◀────│  (Alchemy, etc) │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 │ Opens browser for signing
                                 ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │    Web UI       │────▶│  Browser Wallet │
                        │ (localhost:8545)│◀────│  (MetaMask)     │
                        └─────────────────┘     └─────────────────┘
```

## Installation

```bash
npm install -g browser-rpc
```

Or run directly with npx:

```bash
npx browser-rpc --rpc https://mainnet.base.org
```

## Usage

1. Start the proxy server pointing to your target network:

```bash
browser-rpc --rpc https://mainnet.base.org
```

2. Configure your script to use `http://localhost:8545` as the RPC URL

3. Run your script - when it sends a transaction, your browser will open for approval

### With viem

```typescript
import { createWalletClient, http } from 'viem'
import { base } from 'viem/chains'

const client = createWalletClient({
  chain: base,
  transport: http('http://localhost:8545', {
    timeout: 1000 * 60, // Viem default timeout is 10 seconds
  }),
})

// This will open your browser for approval
const hash = await client.sendTransaction({
  account: null,
  to: '0x...',
  value: parseEther('0.01'),
})
```

### With Foundry

```bash
# Start the proxy
browser-rpc --rpc https://mainnet.base.org

# In another terminal, run your script
forge script script/Deploy.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast \
  --unlocked \
  --sender 0xYourWalletAddress
```

> **Note:** The `--unlocked` flag tells Foundry to send `eth_sendTransaction` to the RPC instead of signing locally. The `--sender` flag specifies which address to use.

### With Hardhat

```javascript
// hardhat.config.js
module.exports = {
  networks: {
    browserRpc: {
      url: 'http://localhost:8545',
    },
  },
}
```

```bash
# Start the proxy with your wallet address
browser-rpc --rpc https://mainnet.base.org --from 0xYourWalletAddress

# In another terminal
npx hardhat run scripts/deploy.js --network browserRpc
```

> **Note:** The `--from` flag is required for Hardhat. Hardhat calls `eth_accounts` to get the signer address for nonce lookups and gas estimation. The address must match the wallet you'll use to sign in the browser.

## CLI Options

| Flag           | Default    | Description                                  |
| -------------- | ---------- | -------------------------------------------- |
| `--rpc`, `-r`  | (required) | Upstream RPC URL for read calls              |
| `--from`, `-f` | (none)     | Wallet address (returned for `eth_accounts`) |
| `--port`, `-p` | `8545`     | Port for the proxy server                    |
| `--no-open`    | `false`    | Disable auto-opening the browser             |

## How It Works

1. Your script sends `eth_sendTransaction` to the proxy
2. The proxy holds the connection open and opens a browser UI
3. You connect your wallet and review the transaction
4. Click "Execute" to sign and send via your wallet
5. The transaction hash is returned to your script

Read-only calls (`eth_call`, `eth_getBalance`, etc.) pass through directly to the upstream RPC.

## Supported Methods

| Method                 | Behavior                       |
| ---------------------- | ------------------------------ |
| `eth_sendTransaction`  | Opens browser for signing      |
| `eth_signTypedData_v4` | Opens browser for signing      |
| `eth_sign`             | Opens browser for signing      |
| Everything else        | Passes through to upstream RPC |

## Chain Support

The proxy automatically detects the chain from your upstream RPC and configures the UI accordingly. Any EVM-compatible chain is supported.

If your wallet is connected to the wrong chain, the UI will prompt you to switch.

## Development

```bash
# Clone the repo
git clone https://github.com/gskril/browser-rpc.git
cd browser-rpc

# Install dependencies
bun install

# Build everything
bun run build

# Start the dev server
bun run dev:server -- --rpc https://mainnet.base.org
```

## License

MIT
