import type { TraceStep, TraceStatus } from "@/src/types/ens";

export function traceStep(
  id: string,
  label: string,
  status: TraceStatus,
  value?: string,
  error?: string,
): TraceStep {
  return { id, label, status, value, error };
}
