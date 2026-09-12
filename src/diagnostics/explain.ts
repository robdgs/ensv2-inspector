import type { TraceStep } from "@/src/types/ens";

export interface Diagnostic {
  code: string;
  severity: "info" | "warning" | "error";
  title: string;
  explanation: string;
  suggestions: string[];
}

export function explainTrace(trace: TraceStep[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const failed = trace.find((step) => step.status === "error");
  const warnings = trace.filter((step) => step.status === "warning");

  if (failed) {
    const message = failed.error ?? "The resolution step failed without a detailed error.";
    const lower = message.toLowerCase();

    if (lower.includes("resolvernotfound") || lower.includes("no resolver")) {
      diagnostics.push({
        code: "RESOLVER_NOT_FOUND",
        severity: "error",
        title: "No suitable resolver was found",
        explanation: "The Universal Resolver could not find a resolver covering this name in the ENSv2 registry hierarchy.",
        suggestions: [
          "Check that the name exists on the selected network.",
          "Inspect the parent registry chain and resolver assignments.",
          "Verify that you are not inspecting a mainnet-only ENS name on Sepolia.",
        ],
      });
    } else if (lower.includes("resolvernotcontract")) {
      diagnostics.push({
        code: "RESOLVER_NOT_CONTRACT",
        severity: "error",
        title: "Resolver address has no contract code",
        explanation: "A resolver address was found, but there is no deployed contract at that address on the selected network.",
        suggestions: [
          "Check the active network.",
          "Inspect the resolver address directly.",
          "Check whether the registry points to stale or invalid resolver data.",
        ],
      });
    } else if (lower.includes("unsupportedresolverprofile")) {
      diagnostics.push({
        code: "UNSUPPORTED_RESOLVER_PROFILE",
        severity: "error",
        title: "Resolver does not support this record profile",
        explanation: "The resolver was found, but it does not support the resolver function requested by the Inspector.",
        suggestions: [
          "Inspect the resolver's supported interfaces.",
          "Try a record profile supported by the resolver.",
        ],
      });
    } else if (lower.includes("resolvererror")) {
      diagnostics.push({
        code: "RESOLVER_REVERTED",
        severity: "error",
        title: "The resolver reverted",
        explanation: "The registry path reached a resolver, but the resolver rejected or failed while processing the record request.",
        suggestions: [
          "Inspect the raw resolver error data.",
          "Check whether the resolver expects a different record interface.",
          "Check for CCIP-Read or gateway-related failures.",
        ],
      });
    } else {
      diagnostics.push({
        code: "RESOLUTION_FAILED",
        severity: "error",
        title: `Resolution failed at ${failed.label}`,
        explanation: message,
        suggestions: [
          "Inspect the raw call and returned error data.",
          "Verify the selected network and ENS name.",
        ],
      });
    }
  }

  for (const warning of warnings) {
    if (warning.id === "address") {
      diagnostics.push({
        code: "ZERO_ADDRESS",
        severity: "warning",
        title: "No address record was returned",
        explanation: "The resolver answered successfully, but the requested address record is empty.",
        suggestions: [
          "Check whether the name has an address record.",
          "Inspect text and other records to confirm the resolver is otherwise usable.",
        ],
      });
    }
  }

  if (!failed && !warnings.length && trace.length) {
    diagnostics.push({
      code: "RESOLUTION_OK",
      severity: "info",
      title: "Resolution completed successfully",
      explanation: "Every executed inspection step completed without errors or warnings.",
      suggestions: [],
    });
  }

  return diagnostics;
}
