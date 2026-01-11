import { createWalletClient, http, parseEther, publicActions } from 'viem'
import { base } from 'viem/chains'

const client = createWalletClient({
  chain: base,
  transport: http('http://localhost:8545', {
    timeout: 1000 * 60 * 5, // 5 minutes
  }),
}).extend(publicActions)

console.log('Sending transaction...')

// This will be intercepted by browser-rpc and opened in the browser
// The actual "from" address will be set by the connected wallet
const hash = await client.sendTransaction({
  account: null,
  to: '0x179A862703a4adfb29896552DF9e307980D19285',
  value: parseEther('0.0000001'),
})

console.log('Transaction hash:', hash)

console.log('Watching for transaction receipt...')

const receipt = await client.waitForTransactionReceipt({ hash })

console.log('Transaction receipt:', receipt)
