import { encodeFunctionData, type Hex } from "viem";
import { resolverAbi, universalResolverAbi } from "@/src/ens/abi";

// Canonical ENS Universal Resolver proxy on Ethereum Mainnet.
// ENS documents this as the public entrypoint on mainnet.
export const UNIVERSAL_RESOLVER = "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe" as const;

// ENSv2 Universal Resolver V2, deployed separately on Sepolia for testing.
//
// IMPORTANT: this is NOT the same contract as UNIVERSAL_RESOLVER above.
// The mainnet canonical proxy address also happens to exist on Sepolia (as
// the legacy Universal Resolver), but it does not implement the ENSv2-only
// registry-navigation functions this inspector relies on (ROOT_REGISTRY(),
// findRegistries(), findResolver() against the new registry hierarchy).
// Aliasing this to UNIVERSAL_RESOLVER made every Sepolia call target the
// wrong contract, so it reverted before any real ENSv2 inspection happened
// and the tool silently fell back to mainnet for every single lookup.
export const UNIVERSAL_RESOLVER_V2_SEPOLIA =
  "0x2f8a180604c42457cb56c7c4f708748ff1f91df1" as const;

export function buildAddressResolutionCall(name: Hex, node: Hex) {
  const data = encodeFunctionData({
    abi: resolverAbi,
    functionName: "addr",
    args: [node],
  });

  return {
    to: UNIVERSAL_RESOLVER_V2_SEPOLIA,
    function: "resolve(bytes,bytes)",
    args: { name, data },
    calldata: data,
  };
}

export const universalResolverSignature = "resolve(bytes,bytes)";
export const resolverAddressSignature = "addr(bytes32)";

export const universalResolverAbiForRaw = universalResolverAbi;