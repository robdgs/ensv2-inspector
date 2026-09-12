import {
  bytesToHex,
  decodeFunctionResult,
  encodeFunctionData,
  isAddress,
  namehash,
  type Address,
  type Hex,
} from "viem";
import { normalize } from "viem/ens";
import { ensClient } from "@/src/lib/viem";
import { registryAbi, resolverAbi, universalResolverAbi } from "@/src/ens/abi";
import { UNIVERSAL_RESOLVER_V2_SEPOLIA } from "@/src/ens/raw";
import { traceStep } from "@/src/ens/trace";
import type { InspectionResult } from "@/src/types/ens";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const ETH_COIN_TYPE = 60n;

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

function normalizeEnsName(input: string): { name: string; usedFallback: boolean } {
  try {
    return { name: normalize(input), usedFallback: false };
  } catch (error) {
    const name = input.toLowerCase().replace(/^\.|\.$/g, "");
    const labels = name.split(".");
    const valid = labels.length > 0 && labels.every(
      (label) => label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    );
    if (!valid) throw error;
    return { name, usedFallback: true };
  }
}

async function rawCall(to: Address, data: Hex) {
  const response = await ensClient.call({ to, data });
  if (!response.data) throw new Error(`Empty RPC result from ${to}`);
  return response.data;
}

function shortAddress(address: string) {
  return address === ZERO_ADDRESS ? "0x0000…0000" : `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export async function inspectEns(input: string): Promise<InspectionResult> {
  const trace = [] as InspectionResult["trace"];
  const value = input.trim();

  if (!value) {
    trace.push(traceStep("input", "Validate input", "error", undefined, "Input is empty"));
    return { input, trace };
  }

  if (isAddress(value)) {
    trace.push(traceStep("input", "Detect input type", "success", "EVM address"));
    try {
      const reverseData = encodeFunctionData({ abi: universalResolverAbi, functionName: "reverse", args: [value as Hex, ETH_COIN_TYPE] });
      trace.push(traceStep("reverse-call", "Reverse-resolve address", "success", reverseData));
      const reverseRaw = await rawCall(UNIVERSAL_RESOLVER_V2_SEPOLIA, reverseData);
      trace.push(traceStep("reverse-result", "Read raw reverse result", "success", reverseRaw));
      const [primary, resolver, reverseResolver] = decodeFunctionResult({ abi: universalResolverAbi, functionName: "reverse", data: reverseRaw });
      const found = primary.length > 0;
      trace.push(traceStep("reverse", "Decode primary ENS name", found ? "success" : "warning", `${primary || "No primary name"} · resolver=${resolver} · reverseResolver=${reverseResolver}`, found ? undefined : "No verified primary ENS name was found for this address"));
      return { input, address: value, reverseName: primary || undefined, forwardReverseMatch: found, trace };
    } catch (error) {
      trace.push(traceStep("reverse", "Reverse ENS resolution", "error", undefined, error instanceof Error ? error.message : String(error)));
      return { input, address: value, trace };
    }
  }

  let normalizedName: string;
  let normalizationFallback = false;
  try {
    const normalized = normalizeEnsName(value);
    normalizedName = normalized.name;
    normalizationFallback = normalized.usedFallback;
  } catch (error) {
    trace.push(traceStep("normalize", "Normalize ENS name", "error", undefined, `Invalid ENS name: ${value}${error instanceof Error ? ` (${error.message})` : ""}`));
    return { input, trace };
  }

  trace.push(traceStep("normalize", "Normalize ENS name", normalizationFallback ? "warning" : "success", normalizedName, normalizationFallback ? "Used the narrow ASCII DNS-compatible fallback after viem rejected the input." : undefined));
  const node = namehash(normalizedName);
  trace.push(traceStep("namehash", "Calculate ENS node", "success", node));

  try {
    const encodedName = dnsEncode(normalizedName);
    const labels = normalizedName.split(".").filter(Boolean).reverse();
    const rootData = encodeFunctionData({ abi: universalResolverAbi, functionName: "ROOT_REGISTRY", args: [] });
    trace.push(traceStep("root-call", "Read ENSv2 root registry", "success", rootData));
    const rootRaw = await rawCall(UNIVERSAL_RESOLVER_V2_SEPOLIA, rootData);
    const rootRegistry = decodeFunctionResult({ abi: universalResolverAbi, functionName: "ROOT_REGISTRY", data: rootRaw }) as Address;
    trace.push(traceStep("root", "ROOT REGISTRY", rootRegistry !== ZERO_ADDRESS ? "success" : "error", rootRegistry, rootRegistry === ZERO_ADDRESS ? "Universal Resolver returned a zero root registry" : undefined));

    let currentRegistry = rootRegistry;
    let deepestResolver: Address = ZERO_ADDRESS;
    let deepestResolverLabel = "";

    for (const [index, label] of labels.entries()) {
      if (currentRegistry === ZERO_ADDRESS) break;
      const resolverData = encodeFunctionData({ abi: registryAbi, functionName: "getResolver", args: [label] });
      trace.push(traceStep(`resolver-${index}-call`, `getResolver("${label}") @ ${shortAddress(currentRegistry)}`, "success", resolverData));
      const resolverRaw = await rawCall(currentRegistry, resolverData);
      const labelResolver = decodeFunctionResult({ abi: registryAbi, functionName: "getResolver", data: resolverRaw }) as Address;
      trace.push(traceStep(`resolver-${index}-result`, `Resolver for ${label}`, labelResolver !== ZERO_ADDRESS ? "success" : "info", `${labelResolver} · registry=${currentRegistry}`, labelResolver === ZERO_ADDRESS ? `No resolver configured at ${label}; resolution can inherit a resolver from a suffix registry.` : undefined));
      if (labelResolver !== ZERO_ADDRESS) {
        deepestResolver = labelResolver;
        deepestResolverLabel = labels.slice(0, index + 1).reverse().join(".");
      }
      const subregistryData = encodeFunctionData({ abi: registryAbi, functionName: "getSubregistry", args: [label] });
      trace.push(traceStep(`subregistry-${index}-call`, `getSubregistry("${label}") @ ${shortAddress(currentRegistry)}`, "success", subregistryData));
      const subregistryRaw = await rawCall(currentRegistry, subregistryData);
      const nextRegistry = decodeFunctionResult({ abi: registryAbi, functionName: "getSubregistry", data: subregistryRaw }) as Address;
      trace.push(traceStep(`subregistry-${index}-result`, `Subregistry for ${label}`, nextRegistry !== ZERO_ADDRESS ? "success" : "info", nextRegistry, nextRegistry === ZERO_ADDRESS ? `${label} is a leaf registry; no deeper subregistry exists.` : undefined));
      currentRegistry = nextRegistry;
    }

    const registriesData = encodeFunctionData({ abi: universalResolverAbi, functionName: "findRegistries", args: [encodedName] });
    trace.push(traceStep("registry-check-call", "Verify registry ancestry with findRegistries", "success", registriesData));
    const registriesRaw = await rawCall(UNIVERSAL_RESOLVER_V2_SEPOLIA, registriesData);
    const registries = decodeFunctionResult({ abi: universalResolverAbi, functionName: "findRegistries", data: registriesRaw });
    trace.push(traceStep("registry-check", "Decoded registry ancestry", registries.length ? "success" : "warning", registries.join(" → "), registries.length ? undefined : "No registry ancestry was returned"));

    const resolverLookupData = encodeFunctionData({ abi: universalResolverAbi, functionName: "findResolver", args: [encodedName] });
    trace.push(traceStep("resolver-lookup-call", "Find resolver with Universal Resolver V2", "success", resolverLookupData));
    const resolverLookupRaw = await rawCall(UNIVERSAL_RESOLVER_V2_SEPOLIA, resolverLookupData);
    const [resolverAddress, resolverNode, resolverOffset] = decodeFunctionResult({ abi: universalResolverAbi, functionName: "findResolver", data: resolverLookupRaw });
    trace.push(traceStep("resolver", "Longest-suffix resolver", resolverAddress !== ZERO_ADDRESS ? "success" : "warning", `${resolverAddress} · node ${resolverNode} · offset ${resolverOffset}${deepestResolver !== ZERO_ADDRESS ? ` · trace=${deepestResolver}` : ""}`, resolverAddress === ZERO_ADDRESS ? "No resolver was found for this name" : undefined));
    if (deepestResolver !== ZERO_ADDRESS) {
      trace.push(traceStep("resolver-path", "Resolver matched at registry label", deepestResolver === resolverAddress ? "success" : "warning", `${deepestResolver} · ${deepestResolverLabel}`, deepestResolver === resolverAddress ? undefined : "The manually traced resolver differs from Universal Resolver findResolver(). Inspect the registry traversal."));
    }

    const resolverData = encodeFunctionData({ abi: resolverAbi, functionName: "addr", args: [node] });
    const universalResolverData = encodeFunctionData({ abi: universalResolverAbi, functionName: "resolve", args: [encodedName, resolverData] });
    trace.push(traceStep("resolve-call", "Call Universal Resolver V2", "success", universalResolverData));
    const rawResult = await rawCall(UNIVERSAL_RESOLVER_V2_SEPOLIA, universalResolverData);
    trace.push(traceStep("resolve-result", "Read raw resolution result", "success", rawResult));
    const [result, resolvedResolver] = decodeFunctionResult({ abi: universalResolverAbi, functionName: "resolve", data: rawResult });
    trace.push(traceStep("resolve", "Decode resolution envelope", "success", `resolver=${resolvedResolver}`));
    const address = decodeFunctionResult({ abi: resolverAbi, functionName: "addr", data: result });
    const found = address !== ZERO_ADDRESS;
    trace.push(traceStep("address", "Decode address record", found ? "success" : "warning", address, found ? undefined : "Resolver returned the zero address"));

    return { input, normalizedName, node, registry: { address: registries[0], found: registries.length > 0 }, resolver: { address: resolverAddress, found: resolverAddress !== ZERO_ADDRESS }, address, trace };
  } catch (error) {
    trace.push(traceStep("resolution", "ENSv2 resolution", "error", undefined, error instanceof Error ? error.message : String(error)));
    return { input, normalizedName, node, trace };
  }
}
