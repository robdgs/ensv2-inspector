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

async function rawCall(data: Hex) {
  const response = await ensClient.call({ to: UNIVERSAL_RESOLVER, data });
  if (!response.data) throw new Error("Universal Resolver returned empty data");
  return response.data;
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

    const registriesData = encodeFunctionData({
      abi: universalResolverAbi,
      functionName: "findRegistries",
      args: [encodedName],
    });
    trace.push(traceStep("registry-call", "Find ENSv2 registry path", "success", registriesData));
    const registriesRaw = await rawCall(registriesData);
    trace.push(traceStep("registry-result", "Read registry path", "success", registriesRaw));
    const registries = decodeFunctionResult({
      abi: universalResolverAbi,
      functionName: "findRegistries",
      data: registriesRaw,
    });
    trace.push(traceStep("registry", "Decode registry path", registries.length ? "success" : "warning", registries.join(" → "), registries.length ? undefined : "No registry path was found"));

    const resolverLookupData = encodeFunctionData({
      abi: universalResolverAbi,
      functionName: "findResolver",
      args: [encodedName],
    });
    trace.push(traceStep("resolver-lookup-call", "Find resolver", "success", resolverLookupData));
    const resolverLookupRaw = await rawCall(resolverLookupData);
    trace.push(traceStep("resolver-lookup-result", "Read resolver lookup result", "success", resolverLookupRaw));
    const [resolverAddress, resolverNode] = decodeFunctionResult({
      abi: universalResolverAbi,
      functionName: "findResolver",
      data: resolverLookupRaw,
    });
    trace.push(traceStep("resolver", "Decode resolver", resolverAddress !== ZERO_ADDRESS ? "success" : "warning", `${resolverAddress} · node ${resolverNode}`, resolverAddress === ZERO_ADDRESS ? "No resolver was found for this name" : undefined));

    const resolverData = encodeFunctionData({ abi: resolverAbi, functionName: "addr", args: [node] });
    const universalResolverData = encodeFunctionData({
      abi: universalResolverAbi,
      functionName: "resolve",
      args: [encodedName, resolverData],
    });
    trace.push(traceStep("resolve-call", "Call Universal Resolver V2", "success", universalResolverData));
    const rawResult = await rawCall(universalResolverData);
    trace.push(traceStep("resolve-result", "Read raw resolution result", "success", rawResult));

    const [result, resolvedResolver] = decodeFunctionResult({
      abi: universalResolverAbi,
      functionName: "resolve",
      data: rawResult,
    });
    trace.push(traceStep("resolve", "Decode resolution envelope", "success", `resolver=${resolvedResolver}`));

    const address = decodeFunctionResult({ abi: resolverAbi, functionName: "addr", data: result });
    const found = address !== ZERO_ADDRESS;
    trace.push(traceStep("address", "Decode address record", found ? "success" : "warning", address, found ? undefined : "Resolver returned the zero address"));

    return {
      input,
      normalizedName,
      node,
      registry: { address: registries[0], found: registries.length > 0 },
      resolver: { address: resolverAddress, found: resolverAddress !== ZERO_ADDRESS },
      address,
      trace,
    };
  } catch (error) {
    trace.push(traceStep("resolution", "ENSv2 resolution", "error", undefined, error instanceof Error ? error.message : String(error)));
    return { input, normalizedName, node, trace };
  }
}
