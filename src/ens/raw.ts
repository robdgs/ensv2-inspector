import { encodeFunctionData, type Hex } from "viem";
import { resolverAbi, universalResolverAbi } from "@/src/ens/abi";

// Canonical ENS Universal Resolver proxy.
// ENS documents this address as the public entrypoint on Ethereum mainnet and
// testnets, including the current ENSv2 Sepolia deployment.
export const UNIVERSAL_RESOLVER = "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe" as const;

// Keep a semantic alias for the inspector's ENSv2 execution target.
// Do not pin an implementation address: the canonical proxy is upgradeable.
export const UNIVERSAL_RESOLVER_V2_SEPOLIA = UNIVERSAL_RESOLVER;

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
