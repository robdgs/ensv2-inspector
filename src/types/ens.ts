export type TraceStatus = "success" | "warning" | "error" | "skipped";

export interface TraceStep {
  id: string;
  label: string;
  status: TraceStatus;
  value?: string;
  error?: string;
}

export interface Diagnostic {
  code: string;
  severity: "info" | "warning" | "error";
  title: string;
  explanation: string;
  suggestions: string[];
}

export interface InspectionResult {
  input: string;
  normalizedName?: string;
  node?: string;
  registry?: { address?: string; found: boolean };
  resolver?: { address?: string; found: boolean };
  address?: string;
  reverseName?: string;
  forwardReverseMatch?: boolean;
  trace: TraceStep[];
  diagnostics?: Diagnostic[];
}
