# browser-rpc

A local RPC proxy that routes Ethereum transactions through your browser wallet instead of requiring private keys in `.env` files.

## The Problem

Deploying smart contracts requires signing transactions with a private key. Most developers use a separate "deployer" wallet with the key stored in a `.env` file, which:

- Is less secure than a browser wallet or hardware wallet
- Requires maintaining ETH balances across multiple chains
- Is tedious to set up and manage

## The Solution

`browser-rpc` is a local proxy server that intercepts transaction requests from your development tools (Foundry, Hardhat, viem scripts) and routes them through your browser wallet for signing.

```
Foundry/Hardhat → browser-rpc (localhost:8545) → Browser Wallet → Network
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

2. Configure your tool to use `http://localhost:8545` as the RPC URL

3. Run your script - when it sends a transaction, your browser will open for approval

### With Foundry

```bash
# Start the proxy
browser-rpc --rpc https://mainnet.base.org

# In another terminal, run your script
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

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
npx hardhat run scripts/deploy.js --network browserRpc
```

### With viem

```typescript
import { createWalletClient, http } from 'viem'
import { base } from 'viem/chains'

const client = createWalletClient({
  chain: base,
  transport: http('http://localhost:8545'),
})

// This will open your browser for approval
const hash = await client.sendTransaction({
  to: '0x...',
  value: parseEther('0.01'),
})
```

## CLI Options

| Flag           | Default    | Description                      |
| -------------- | ---------- | -------------------------------- |
| `--rpc`, `-r`  | (required) | Upstream RPC URL for read calls  |
| `--port`, `-p` | `8545`     | Port for the proxy server        |
| `--no-open`    | `false`    | Disable auto-opening the browser |

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
