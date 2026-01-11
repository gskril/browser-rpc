import { createWalletClient, http, parseEther } from 'viem'
import { base } from 'viem/chains'

const client = createWalletClient({
  chain: base,
  transport: http('http://localhost:8545', {
    timeout: 1000 * 60 * 5, // 5 minutes
  }),
})

async function main() {
  // This will be intercepted by browser-rpc and opened in the browser
  // The actual "from" address will be set by the connected wallet

  const hash = await client.sendTransaction({
    account: '0x179A862703a4adfb29896552DF9e307980D19285',
    to: '0x0000000000000000000000000000000000000000',
    value: parseEther('0.0000001'),
  })

  console.log('Transaction hash:', hash)
}

main().catch(console.error)
