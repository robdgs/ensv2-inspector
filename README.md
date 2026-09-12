# ENSv2 Inspector

> A developer debugger for ENSv2 resolution.

ENSv2 Inspector is an open-source developer tool for inspecting and debugging ENS resolution. Instead of acting as a general ENS explorer, it focuses on the resolution path: what was queried, what resolved, where a failure occurred, and why.

## MVP

- ENS name input
- ENS normalization
- ENS namehash / node calculation
- Resolution trace
- Registry and resolver inspection
- Address and reverse-resolution checks
- Human-readable diagnostics
- Raw contract calls
- ENSv2 permission inspection

## Architecture

```text
Input
  ↓
Normalize
  ↓
Namehash
  ↓
Registry
  ↓
Resolver
  ↓
Records
  ↓
Reverse resolution
  ↓
Verification
  ↓
Diagnostics
```

The core resolution engine is kept separate from the UI so it can be tested independently and reused by future developer-facing features.

## Development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Status

Early development for ETHRome 2026. ENSv2 support is being implemented incrementally, starting with a deterministic resolution trace and Sepolia-focused inspection.
