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
import { ensClient, mainnetEnsClient } from "@/src/lib/viem";
import { registryAbi, resolverAbi, universalResolverAbi } from "@/src/ens/abi";
import { UNIVERSAL_RESOLVER, UNIVERSAL_RESOLVER_V2_SEPOLIA } from "@/src/ens/raw";
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

async function rawCall(client: typeof ensClient, to: Address, data: Hex) {
  const response = await client.call({ to, data });
  if (!response.data) throw new Error(`Empty RPC result from ${to}`);
  return response.data;
}

function shortAddress(address: string) {
  return address === ZERO_ADDRESS ? "0x0000…0000" : `${address.slice(0, 8)}…${address.slice(-6)}`;
}

async function resolveOnMainnet(normalizedName: string, node: Hex, trace: InspectionResult["trace"], reason = "Sepolia ENSv2 resolution did not produce an address") {
  const encodedName = dnsEncode(normalizedName);
  const resolverData = encodeFunctionData({ abi: resolverAbi, functionName: "addr", args: [node] });
  const resolveData = encodeFunctionData({ abi: universalResolverAbi, functionName: "resolve", args: [encodedName, resolverData] });

  trace.push(traceStep("mainnet-fallback-call", "Try Ethereum Mainnet ENS resolution", "info", resolveData, reason));
  try {
    const rawResult = await rawCall(mainnetEnsClient, UNIVERSAL_RESOLVER, resolveData);
    trace.push(traceStep("mainnet-fallback-result", "Read Mainnet resolution result", "success", rawResult));
    const [result, resolvedResolver] = decodeFunctionResult({ abi: universalResolverAbi, functionName: "resolve", data: rawResult });
    const address = decodeFunctionResult({ abi: resolverAbi, functionName: "addr", data: result }) as Address;
    if (address === ZERO_ADDRESS) {
      trace.push(traceStep("mainnet-fallback-address", "Decode Mainnet address record", "warning", address, "The name is reachable on Mainnet, but its ETH address record is empty."));
      return { success: false as const };
    }
    trace.push(traceStep("mainnet-fallback-address", "Decode Mainnet address record", "success", `${address} · resolver=${resolvedResolver}`));
    trace.push(traceStep("mainnet-fallback", "Mainnet resolution succeeded", "warning", normalizedName, "The name resolves on Ethereum Mainnet through the canonical ENS entrypoint. It is not an ENSv2 Sepolia record."));
    return { success: true as const, address };
  } catch (error) {
    trace.push(traceStep("mainnet-fallback", "Mainnet resolution unavailable", "info", undefined, error instanceof Error ? error.message : String(error)));
    return { success: false as const };
  }
}

async function resolveWithKnownResolver(
  normalizedName: string,
  node: Hex,
  resolver: Address,
  trace: InspectionResult["trace"],
) {
  const encodedName = dnsEncode(normalizedName);
  const resolverData = encodeFunctionData({ abi: resolverAbi, functionName: "addr", args: [node] });
  const overrideData = encodeFunctionData({
    abi: universalResolverAbi,
    functionName: "resolveWithResolver",
    args: [resolver, encodedName, resolverData, []],
  });

  trace.push(traceStep(
    "resolve-override-call",
    "Resolve with traced longest-suffix resolver",
    "warning",
    overrideData,
    "Universal Resolver V2 findResolver() returned zero, but direct registry traversal found a resolver. The inspector is bypassing the inconsistent lookup result to verify the resolver itself.",
  ));

  try {
    const rawResult = await rawCall(ensClient, UNIVERSAL_RESOLVER_V2_SEPOLIA, overrideData);
    trace.push(traceStep("resolve-override-result", "Read resolver override result", "success", rawResult));
    const address = decodeFunctionResult({ abi: resolverAbi, functionName: "addr", data: rawResult }) as Address;
    const found = address !== ZERO_ADDRESS;
    trace.push(traceStep(
      "resolve-override-address",
      "Decode inherited address record",
      found ? "success" : "warning",
      address,
      found ? undefined : "The traced resolver executed successfully but returned the zero address.",
    ));
    return { success: found, address };
  } catch (error) {
    trace.push(traceStep(
      "resolve-override-error",
      "Resolver override failed",
      "error",
      undefined,
      error instanceof Error ? error.message : String(error),
    ));
    return { success: false as const };
  }
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
      trace.push(traceStep("reverse-call", "Reverse-resolve address on Sepolia", "success", reverseData));
      try {
        const reverseRaw = await rawCall(ensClient, UNIVERSAL_RESOLVER_V2_SEPOLIA, reverseData);
        trace.push(traceStep("reverse-result", "Read raw reverse result", "success", reverseRaw));
        const [primary, resolver, reverseResolver] = decodeFunctionResult({ abi: universalResolverAbi, functionName: "reverse", data: reverseRaw });
        const found = primary.length > 0;
        trace.push(traceStep("reverse", "Decode primary ENS name", found ? "success" : "warning", `${primary || "No primary name"} · resolver=${resolver} · reverseResolver=${reverseResolver}`, found ? undefined : "No verified primary ENS name was found for this address"));
        if (found) return { input, address: value, reverseName: primary, forwardReverseMatch: true, network: "sepolia", mode: "reverse", trace };
      } catch (sepoliaError) {
        trace.push(traceStep("reverse-sepolia", "Sepolia reverse resolution unavailable", "info", undefined, sepoliaError instanceof Error ? sepoliaError.message : String(sepoliaError)));
      }

      const reverseRaw = await rawCall(mainnetEnsClient, UNIVERSAL_RESOLVER, reverseData);
      trace.push(traceStep("reverse-mainnet-result", "Read Mainnet reverse result", "success", reverseRaw));
      const [primary, resolver, reverseResolver] = decodeFunctionResult({ abi: universalResolverAbi, functionName: "reverse", data: reverseRaw });
      const found = primary.length > 0;
      trace.push(traceStep("reverse-mainnet", "Decode Mainnet primary ENS name", found ? "success" : "warning", `${primary || "No primary name"} · resolver=${resolver} · reverseResolver=${reverseResolver}`, found ? undefined : "No verified primary ENS name was found for this address"));
      return { input, address: value, reverseName: primary || undefined, forwardReverseMatch: found, network: "mainnet", mode: "reverse", trace };
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

  try {
    const encodedName = dnsEncode(normalizedName);
    const labels = normalizedName.split(".").filter(Boolean).reverse();
    const rootData = encodeFunctionData({ abi: universalResolverAbi, functionName: "ROOT_REGISTRY", args: [] });
    trace.push(traceStep("root-call", "Read ENSv2 root registry", "success", rootData));
    const rootRaw = await rawCall(ensClient, UNIVERSAL_RESOLVER_V2_SEPOLIA, rootData);
    const rootRegistry = decodeFunctionResult({ abi: universalResolverAbi, functionName: "ROOT_REGISTRY", data: rootRaw }) as Address;
    trace.push(traceStep("root", "ROOT REGISTRY", rootRegistry !== ZERO_ADDRESS ? "success" : "error", rootRegistry, rootRegistry === ZERO_ADDRESS ? "Universal Resolver returned a zero root registry" : undefined));

    let currentRegistry = rootRegistry;
    let deepestResolver: Address = ZERO_ADDRESS;
    let deepestResolverLabel = "";

    for (const [index, label] of labels.entries()) {
      if (currentRegistry === ZERO_ADDRESS) break;
      const resolverData = encodeFunctionData({ abi: registryAbi, functionName: "getResolver", args: [label] });
      trace.push(traceStep(`resolver-${index}-call`, `getResolver("${label}") @ ${shortAddress(currentRegistry)}`, "success", resolverData));
      const resolverRaw = await rawCall(ensClient, currentRegistry, resolverData);
      const labelResolver = decodeFunctionResult({ abi: registryAbi, functionName: "getResolver", data: resolverRaw }) as Address;
      trace.push(traceStep(`resolver-${index}-result`, `Resolver for ${label}`, labelResolver !== ZERO_ADDRESS ? "success" : "info", `${labelResolver} · registry=${currentRegistry}`, labelResolver === ZERO_ADDRESS ? `No resolver configured at ${label}; resolution can inherit a resolver from a suffix registry.` : undefined));
      if (labelResolver !== ZERO_ADDRESS) {
        deepestResolver = labelResolver;
        deepestResolverLabel = labels.slice(0, index + 1).reverse().join(".");
      }
      const subregistryData = encodeFunctionData({ abi: registryAbi, functionName: "getSubregistry", args: [label] });
      trace.push(traceStep(`subregistry-${index}-call`, `getSubregistry("${label}") @ ${shortAddress(currentRegistry)}`, "success", subregistryData));
      const subregistryRaw = await rawCall(ensClient, currentRegistry, subregistryData);
      const nextRegistry = decodeFunctionResult({ abi: registryAbi, functionName: "getSubregistry", data: subregistryRaw }) as Address;
      trace.push(traceStep(`subregistry-${index}-result`, `Subregistry for ${label}`, nextRegistry !== ZERO_ADDRESS ? "success" : "info", nextRegistry, nextRegistry === ZERO_ADDRESS ? `${label} is a leaf registry; no deeper subregistry exists.` : undefined));
      currentRegistry = nextRegistry;
    }

    const registriesData = encodeFunctionData({ abi: universalResolverAbi, functionName: "findRegistries", args: [encodedName] });
    trace.push(traceStep("registry-check-call", "Verify registry ancestry with findRegistries", "success", registriesData));
    const registriesRaw = await rawCall(ensClient, UNIVERSAL_RESOLVER_V2_SEPOLIA, registriesData);
    const registries = decodeFunctionResult({ abi: universalResolverAbi, functionName: "findRegistries", data: registriesRaw });
    trace.push(traceStep("registry-check", "Decoded registry ancestry", registries.length ? "success" : "warning", registries.join(" → "), registries.length ? undefined : "No registry ancestry was returned"));

    const resolverLookupData = encodeFunctionData({ abi: universalResolverAbi, functionName: "findResolver", args: [encodedName] });
    trace.push(traceStep("resolver-lookup-call", "Find resolver with Universal Resolver V2", "success", resolverLookupData));
    const resolverLookupRaw = await rawCall(ensClient, UNIVERSAL_RESOLVER_V2_SEPOLIA, resolverLookupData);
    const [resolverAddress, resolverNode, resolverOffset] = decodeFunctionResult({ abi: universalResolverAbi, functionName: "findResolver", data: resolverLookupRaw });
    trace.push(traceStep("resolver", "Longest-suffix resolver", resolverAddress !== ZERO_ADDRESS ? "success" : "warning", `${resolverAddress} · node ${resolverNode} · offset ${resolverOffset}${deepestResolver !== ZERO_ADDRESS ? ` · trace=${deepestResolver}` : ""}`, resolverAddress === ZERO_ADDRESS ? (deepestResolver !== ZERO_ADDRESS ? "Universal Resolver returned no resolver, but direct ENSv2 registry traversal found an inherited resolver. This is an inconsistency in the resolution path." : "No resolver was found for this name") : undefined));
    if (deepestResolver !== ZERO_ADDRESS) {
      trace.push(traceStep("resolver-path", "Resolver matched at registry label", deepestResolver === resolverAddress ? "success" : "warning", `${deepestResolver} · ${deepestResolverLabel}`, deepestResolver === resolverAddress ? undefined : "The manually traced resolver differs from Universal Resolver findResolver(). Inspect the registry traversal."));
    }

    if (resolverAddress === ZERO_ADDRESS && deepestResolver !== ZERO_ADDRESS) {
      const override = await resolveWithKnownResolver(normalizedName, node, deepestResolver, trace);
      if (override.success) {
        return { input, normalizedName, node, network: "sepolia", mode: "ensv2", registry: { address: registries[0], found: registries.length > 0 }, resolver: { address: deepestResolver, found: true }, address: override.address, trace };
      }
    }

    if (resolverAddress === ZERO_ADDRESS) {
      trace.push(traceStep("resolve-skipped", "Call Universal Resolver V2", "skipped", undefined, "Skipped because findResolver() returned the zero address and no resolver was recovered from the direct registry traversal."));
      const mainnet = await resolveOnMainnet(normalizedName, node, trace, "Sepolia ENSv2 has no resolver for this name; checking whether the same name exists on Ethereum Mainnet.");
      if (mainnet.success) return { input, normalizedName, node, network: "mainnet", mode: "legacy-fallback", registry: { found: false }, resolver: { found: false }, address: mainnet.address, trace };
      return { input, normalizedName, node, network: "sepolia", mode: "ensv2", registry: { address: registries[0], found: registries.length > 0 }, resolver: { address: resolverAddress, found: false }, trace };
    }

    const resolverData = encodeFunctionData({ abi: resolverAbi, functionName: "addr", args: [node] });
    const universalResolverData = encodeFunctionData({ abi: universalResolverAbi, functionName: "resolve", args: [encodedName, resolverData] });
    trace.push(traceStep("resolve-call", "Call Universal Resolver V2", "success", universalResolverData));
    try {
      const rawResult = await rawCall(ensClient, UNIVERSAL_RESOLVER_V2_SEPOLIA, universalResolverData);
      trace.push(traceStep("resolve-result", "Read raw resolution result", "success", rawResult));
      const [result, resolvedResolver] = decodeFunctionResult({ abi: universalResolverAbi, functionName: "resolve", data: rawResult });
      trace.push(traceStep("resolve", "Decode resolution envelope", "success", `resolver=${resolvedResolver}`));
      const address = decodeFunctionResult({ abi: resolverAbi, functionName: "addr", data: result }) as Address;
      const found = address !== ZERO_ADDRESS;
      trace.push(traceStep("address", "Decode address record", found ? "success" : "warning", address, found ? undefined : "Resolver returned the zero address"));
      if (found) return { input, normalizedName, node, network: "sepolia", mode: "ensv2", registry: { address: registries[0], found: registries.length > 0 }, resolver: { address: resolverAddress, found: true }, address, trace };

      const mainnet = await resolveOnMainnet(normalizedName, node, trace, "Sepolia found a resolver, but the ENS address record is empty; checking Ethereum Mainnet.");
      if (mainnet.success) return { input, normalizedName, node, network: "mainnet", mode: "legacy-fallback", registry: { found: false }, resolver: { found: false }, address: mainnet.address, trace };
      return { input, normalizedName, node, network: "sepolia", mode: "ensv2", registry: { address: registries[0], found: registries.length > 0 }, resolver: { address: resolverAddress, found: true }, address, trace };
    } catch (sepoliaError) {
      trace.push(traceStep("resolve-sepolia-error", "Sepolia ENSv2 resolution failed", "error", undefined, sepoliaError instanceof Error ? sepoliaError.message : String(sepoliaError)));
      const mainnet = await resolveOnMainnet(normalizedName, node, trace, "Sepolia ENSv2 resolution reverted; checking whether the same name resolves on Ethereum Mainnet.");
      if (mainnet.success) return { input, normalizedName, node, network: "mainnet", mode: "legacy-fallback", registry: { found: false }, resolver: { found: false }, address: mainnet.address, trace };
      return { input, normalizedName, node, network: "sepolia", mode: "ensv2", registry: { address: registries[0], found: registries.length > 0 }, resolver: { address: resolverAddress, found: true }, trace };
    }
  } catch (error) {
    trace.push(traceStep("resolution", "ENSv2 resolution", "error", undefined, error instanceof Error ? error.message : String(error)));
    const mainnet = await resolveOnMainnet(normalizedName, node, trace, "Sepolia ENSv2 inspection failed before a usable resolution result was obtained; checking Ethereum Mainnet.");
    if (mainnet.success) return { input, normalizedName, node, network: "mainnet", mode: "legacy-fallback", registry: { found: false }, resolver: { found: false }, address: mainnet.address, trace };
    return { input, normalizedName, node, network: "sepolia", mode: "ensv2", trace };
  }
}
