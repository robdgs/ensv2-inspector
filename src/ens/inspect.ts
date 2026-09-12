import {
  bytesToHex,
  decodeFunctionResult,
  encodeFunctionData,
  namehash,
  normalize,
  type Hex,
} from "viem";
import { ensClient } from "@/src/lib/viem";
import { resolverAbi, universalResolverAbi } from "@/src/ens/abi";
import { UNIVERSAL_RESOLVER } from "@/src/ens/raw";
import { traceStep } from "@/src/ens/trace";
import type { InspectionResult } from "@/src/types/ens";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

function dnsEncode(name: string): Hex {
  const labels = name.replace(/^\.|\.$/g, "").split(".");
  const bytes: number[] = [];

  for (const label of labels) {
    const encoded = new TextEncoder().encode(label);
    if (encoded.length > 255) throw new Error(`ENS label is too long: ${label}`);
    bytes.push(encoded.length, ...encoded);
  }

  bytes.push(0);
  return bytesToHex(Uint8Array.from(bytes));
}

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
    const encodedName = dnsEncode(normalizedName);
    const resolverData = encodeFunctionData({
      abi: resolverAbi,
      functionName: "addr",
      args: [node],
    });
    const universalResolverData = encodeFunctionData({
      abi: universalResolverAbi,
      functionName: "resolve",
      args: [encodedName, resolverData],
    });

    trace.push(traceStep("universal-resolver-call", "Call Universal Resolver V2", "success", universalResolverData));

    const raw = await ensClient.call({ to: UNIVERSAL_RESOLVER, data: universalResolverData });
    const rawResult = raw.data;

    if (!rawResult) {
      trace.push(traceStep("universal-resolver-result", "Read raw resolver result", "error", undefined, "Universal Resolver returned empty data"));
      return { input, normalizedName, node, trace };
    }

    trace.push(traceStep("universal-resolver-result", "Read raw resolver result", "success", rawResult));

    const [result, resolverAddress] = decodeFunctionResult({
      abi: universalResolverAbi,
      functionName: "resolve",
      data: rawResult,
    });

    trace.push(traceStep(
      "resolver",
      "Decode resolved resolver address",
      resolverAddress !== ZERO_ADDRESS ? "success" : "warning",
      resolverAddress,
      resolverAddress === ZERO_ADDRESS ? "No resolver was found for this name" : undefined,
    ));

    const address = decodeFunctionResult({ abi: resolverAbi, functionName: "addr", data: result });
    const found = address !== ZERO_ADDRESS;

    trace.push(traceStep(
      "address",
      "Decode address record",
      found ? "success" : "warning",
      address,
      found ? undefined : "Resolver returned the zero address",
    ));

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
