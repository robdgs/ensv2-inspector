import { createPublicClient, fallback, http } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { tracingCcipRequest } from "@/src/ens/ccip";

// A bare http() transport uses viem's single built-in default public RPC.
// That endpoint is frequently rate-limited or briefly unreachable when this
// app runs server-side (e.g. on Vercel), and a plain fetch failure there was
// indistinguishable from "this name genuinely doesn't resolve" once it
// reached the UI as "Resolution failed". Falling back across a short list of
// public endpoints makes a single flaky provider much less likely to take
// down a valid lookup.
export const ensClient = createPublicClient({
  chain: sepolia,
  transport: fallback([
    http("https://ethereum-sepolia-rpc.publicnode.com"),
    http("https://rpc.sepolia.org"),
    http(),
  ]),
  // Keep CCIP-Read enabled (this is the default), but route it through our
  // own wrapper so every offchain gateway round-trip shows up in the trace.
  ccipRead: { request: tracingCcipRequest },
});

export const mainnetEnsClient = createPublicClient({
  chain: mainnet,
  transport: fallback([
    http("https://ethereum-rpc.publicnode.com"),
    http("https://cloudflare-eth.com"),
    http(),
  ]),
  ccipRead: { request: tracingCcipRequest },
});