import { encodeFunctionData, type Hex } from "viem";
import { resolverAbi, universalResolverAbi } from "@/src/ens/abi";

// Canonical ENS entrypoint. ENS documents this as the public resolver address.
export const UNIVERSAL_RESOLVER = "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe" as const;

// Sepolia ENSv2 beta deployment currently used for deterministic ENSv2
// inspection. The public proxy is temporarily pointed at the previous V1
// deployment, so the pinned V2 implementation is used by this debugger.
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
