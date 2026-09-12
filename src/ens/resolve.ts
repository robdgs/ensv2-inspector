import { normalize, namehash } from "viem/ens";
import type { InspectionResult } from "@/src/types/ens";
import { traceStep } from "@/src/ens/trace";

export function prepareInspection(input: string): InspectionResult {
  const trace = [] as InspectionResult["trace"];
  const value = input.trim();
  if (!value) {
    trace.push(traceStep("input", "Validate input", "error", undefined, "Input is empty"));
    return { input, trace };
  }
  let normalizedName: string;
  try { normalizedName = normalize(value); }
  catch { trace.push(traceStep("normalize", "Normalize ENS name", "error", undefined, "Invalid ENS name")); return { input, trace }; }
  trace.push(traceStep("normalize", "Normalize ENS name", "success", normalizedName));
  const node = namehash(normalizedName);
  trace.push(traceStep("namehash", "Calculate ENS node", "success", node));
  return { input, normalizedName, node, trace };
}
