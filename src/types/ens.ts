export type TraceStatus = "success" | "info" | "warning" | "error" | "skipped";

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

// One node per label walked during registry traversal (root -> tld -> ... -> leaf).
// This is the data the RegistryGraph component renders as a tree, so it's kept
// deliberately flat and small rather than re-deriving it from the raw trace.
export interface RegistryPathNode {
  label: string;
  fullName: string;
  registry: string;
  resolver?: string;
  hasResolver: boolean;
  isLeaf: boolean;
}

export interface InspectionResult {
  input: string;
  normalizedName?: string;
  node?: string;
  network?: "sepolia" | "mainnet";
  mode?: "ensv2" | "legacy-fallback" | "reverse";
  registry?: { address?: string; found: boolean };
  resolver?: { address?: string; found: boolean };
  address?: string;
  reverseName?: string;
  forwardReverseMatch?: boolean;
  registryPath?: RegistryPathNode[];
  usedCcipRead?: boolean;
  trace: TraceStep[];
  diagnostics?: Diagnostic[];
}