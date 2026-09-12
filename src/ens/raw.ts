import { encodeFunctionData, type Hex } from "viem";
import { resolverAbi, universalResolverAbi } from "@/src/ens/abi";

// Canonical ENS entrypoint. On Sepolia it is currently temporarily wired back
// to the legacy resolver, so it is useful for readiness diagnostics but not
// suitable as the ENSv2 execution target for this debugger.
export const UNIVERSAL_RESOLVER = "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe" as const;

// Sepolia ENSv2 beta deployment currently used for deterministic ENSv2
// inspection. The public proxy is temporarily pointed at the previous V1
// deployment; this V2 deployment is the actual hierarchical resolver target.
export const UNIVERSAL_RESOLVER_V2_SEPOLIA = "0x2f8a180604c42457cb56c7c4f708748ff1f91df1" as const;

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
