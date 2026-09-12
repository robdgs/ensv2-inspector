import { AsyncLocalStorage } from "node:async_hooks";
import { ccipRequest, type CcipRequestParameters } from "viem/utils";
import { traceStep } from "@/src/ens/trace";
import type { TraceStep } from "@/src/types/ens";

// viem resolves EIP-3668 (CCIP-Read) offchain lookups transparently inside
// client.call() — which is great for correctness, but it means a resolver
// that requires an offchain gateway call is completely invisible to this
// inspector: the trace just shows a normal "success" resolve step with no
// indication that a gateway round-trip happened in between.
//
// We override the client's `ccipRead.request` with a thin wrapper around
// viem's own default `ccipRequest`, and use AsyncLocalStorage to attach the
// current inspection's trace array so every gateway request/response gets
// logged as a first-class step, without changing the resolution behaviour.
export const ccipTraceContext = new AsyncLocalStorage<TraceStep[]>();

export async function tracingCcipRequest(params: CcipRequestParameters) {
  const trace = ccipTraceContext.getStore();
  const { urls, sender } = params;

  trace?.push(
    traceStep(
      `ccip-read-${trace.length}`,
      "CCIP-Read offchain lookup triggered",
      "warning",
      `sender=${sender} · ${urls.length} gateway URL(s)`,
      `This resolver reverted with OffchainLookup (EIP-3668) instead of answering onchain. Trying: ${urls.join(", ")}`,
    ),
  );

  try {
    const result = await ccipRequest(params);
    trace?.push(
      traceStep(
        `ccip-read-result-${trace.length}`,
        "CCIP-Read gateway responded",
        "success",
        result,
      ),
    );
    return result;
  } catch (error) {
    trace?.push(
      traceStep(
        `ccip-read-error-${trace.length}`,
        "CCIP-Read gateway request failed",
        "error",
        undefined,
        error instanceof Error ? error.message : String(error),
      ),
    );
    throw error;
  }
}