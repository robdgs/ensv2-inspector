# ENSv2 Inspector

> A developer debugger for ENSv2 resolution.

ENSv2 Inspector is an open-source developer tool for inspecting the actual ENSv2 resolution path instead of merely displaying the final ENS record.

## Current resolution trace

```text
Input
  ↓
Normalize
  ↓
Namehash
  ↓
findRegistries()
  ↓
findResolver()
  ↓
resolve(name, addr(node))
  ↓
Decode address
```

For each on-chain stage the inspector records the ABI-encoded calldata and raw return data before decoding it. This makes the tool useful for debugging failures and comparing what a library thinks happened with what the Universal Resolver actually returned.

## Stack

- Next.js
- TypeScript
- viem
- ENSv2 Universal Resolver V2
- Sepolia

ENSv2 is currently deployed on Sepolia for testing. The ENS documentation describes Universal Resolver V2 as the canonical entry point and exposes registry-navigation functions such as `findRegistries()` and `findResolver()`. citeturn0search0turn0search2

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000` and inspect a Sepolia ENS name.

## Next

- human-readable diagnostics
- reverse resolution + forward verification
- resolver capability checks via ERC-165
- text/avatar/contenthash records
- raw call explorer with copyable calldata
- intentionally broken ENSv2 scenarios for demos
