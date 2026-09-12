import { encodeFunctionData, type Hex } from "viem";
import { resolverAbi, universalResolverAbi } from "@/src/ens/abi";

export const UNIVERSAL_RESOLVER = "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe" as const;

export function buildAddressResolutionCall(name: Hex, node: Hex) {
  const data = encodeFunctionData({
    abi: resolverAbi,
    functionName: "addr",
    args: [node],
  });

  return {
    to: UNIVERSAL_RESOLVER,
    function: "resolve(bytes,bytes)",
    args: { name, data },
    calldata: data,
  };
}

export const universalResolverSignature = "resolve(bytes,bytes)";
export const resolverAddressSignature = "addr(bytes32)";

export const universalResolverAbiForRaw = universalResolverAbi;
