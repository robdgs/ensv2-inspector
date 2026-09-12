import { normalize } from "viem/ens";
import { namehash } from "viem/ens";
import type { InspectionResult } from "@/src/types/ens";
import { traceStep } from "@/src/ens/trace";

/**
 * First, network-independent stage of the ENSv2 inspection pipeline.
 * Contract reads will be added next; keeping normalization/namehash separate
 * makes the resolution trace deterministic and easy to diagnose.
 */
export function prepareInspection(input: string): InspectionResult {
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

  if (!normalizedName.endsWith(".eth")) {
    trace.push(traceStep("namehash", "Calculate ENS node", "skipped", undefined, "MVP currently accepts ENS names ending in .eth"));
    return { input, normalizedName, trace };
  }

  const node = namehash(normalizedName);
  trace.push(traceStep("namehash", "Calculate ENS node", "success", node));

  return {
    input,
    normalizedName,
    node,
    trace,
  };
}
