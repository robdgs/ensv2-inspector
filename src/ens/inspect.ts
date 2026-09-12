import { encodeFunctionData, decodeFunctionResult, namehash, normalize, stringToHex } from "viem";
import { ensClient } from "@/src/lib/viem";
import { resolverAbi, universalResolverAbi } from "@/src/ens/abi";
import { traceStep } from "@/src/ens/trace";
import type { InspectionResult } from "@/src/types/ens";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export async function inspectEns(input: string): Promise<InspectionResult> {
  const trace = [] as InspectionResult["trace"];
  const value = input.trim();

  if (!value) {
    trace.push(traceStep("input", "Validate input", "error", undefined, "Input is empty"));
    return { input, trace };
  }

  let normalizedName: string;
  try {
    normalizedName = normalize(value);
  } catch {
    trace.push(traceStep("normalize", "Normalize ENS name", "error", undefined, "Invalid ENS name"));
    return { input, trace };
  }

  trace.push(traceStep("normalize", "Normalize ENS name", "success", normalizedName));
  const node = namehash(normalizedName);
  trace.push(traceStep("namehash", "Calculate ENS node", "success", node));

  try {
    const dnsName = stringToHex(normalizedName);
    const callData = encodeFunctionData({
      abi: resolverAbi,
      functionName: "addr",
      args: [node],
    });

    const [result, resolverAddress] = await ensClient.readContract({
      address: "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe",
      abi: universalResolverAbi,
      functionName: "resolve",
      args: [dnsName, callData],
    });

    trace.push(traceStep("universal-resolver", "Resolve through Universal Resolver V2", "success", resolverAddress));

    const address = decodeFunctionResult({
      abi: resolverAbi,
      functionName: "addr",
      data: result,
    });

    const found = address !== ZERO_ADDRESS;
    trace.push(traceStep("address", "Read address record", found ? "success" : "warning", address, found ? undefined : "Resolver returned the zero address"));

    return {
      input,
      normalizedName,
      node,
      resolver: { address: resolverAddress, found: resolverAddress !== ZERO_ADDRESS },
      address,
      trace,
    };
  } catch (error) {
    trace.push(traceStep("universal-resolver", "Resolve through Universal Resolver V2", "error", undefined, error instanceof Error ? error.message : String(error)));
    return { input, normalizedName, node, trace };
  }
}
