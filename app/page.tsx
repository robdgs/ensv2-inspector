"use client";

import { useState } from "react";

type TraceStep = { id: string; label: string; status: string; value?: string; error?: string };
type Result = {
  input: string;
  normalizedName?: string;
  node?: string;
  registry?: { address?: string; found: boolean };
  resolver?: { address?: string; found: boolean };
  address?: string;
  reverseName?: string;
  forwardReverseMatch?: boolean;
  trace: TraceStep[];
};

const ZERO = "0x0000000000000000000000000000000000000000";

function short(value?: string) {
  if (!value) return "—";
  if (value.length <= 24) return value;
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

function isZeroAddress(value?: string) {
  return value?.toLowerCase() === ZERO;
}

function statusMeta(status: string) {
  switch (status) {
    case "error":
      return { icon: "×", className: "error" };
    case "warning":
      return { icon: "○", className: "warning" };
    case "skipped":
      return { icon: "–", className: "skipped" };
    default:
      return { icon: "✓", className: "success" };
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="section">
      <div className="section-title">{title}</div>
      {children}
    </section>
  );
}

export default function Home() {
  const [name, setName] = useState("ur.integration-tests.eth");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function inspect() {
    setLoading(true);
    try {
      const response = await fetch(`/api/inspect?name=${encodeURIComponent(name)}`);
      setResult(await response.json());
    } finally {
      setLoading(false);
    }
  }

  const trace = result?.trace ?? [];
  const registrySteps = trace.filter((step) => /ROOT REGISTRY|getResolver\(|getSubregistry\(|Registry for /.test(step.label));
  const resolverSteps = trace.filter((step) => /Longest-suffix resolver|Resolver matched|Resolver for /.test(step.label));
  const resolutionSteps = trace.filter((step) => /Universal Resolver|resolution result|resolution envelope|address record/.test(step.label));
  const diagnosticSteps = trace.filter((step) => ["error", "warning"].includes(step.status));
  const finalSuccess = Boolean(result?.address && !isZeroAddress(result.address));

  return (
    <main className="shell">
      <header className="header">
        <div>
          <div className="eyebrow">ENSv2 Developer Tool · Sepolia</div>
          <h1>ENSv2 Inspector</h1>
          <p>Debug the actual ENSv2 resolution path. Inspect registry traversal, resolver selection, raw calls and decoded results.</p>
        </div>
        <div className="badge">DEBUGGER</div>
      </header>

      <div className="input-row">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") inspect(); }} placeholder="name.eth or 0x…" spellCheck={false} />
        <button onClick={inspect} disabled={loading}>{loading ? "Inspecting…" : "Inspect"}</button>
      </div>

      {result && (
        <div className="results">
          <div className={`target-card ${finalSuccess ? "resolved" : ""}`}>
            <div>
              <div className="muted-label">RESOLUTION TARGET</div>
              <div className="target-name">{result.normalizedName ?? result.input}</div>
            </div>
            <div className="target-result">
              <div className="muted-label">RESOLVED ADDRESS</div>
              <code>{result.address ?? "Resolution failed"}</code>
            </div>
          </div>

          {result.normalizedName && (
            <div className="name-path">
              {result.normalizedName.split(".").map((label, index, labels) => (
                <span key={`${label}-${index}`}>
                  <span className="path-node">{label}</span>{index < labels.length - 1 && <span className="path-arrow">›</span>}
                </span>
              ))}
            </div>
          )}

          <Section title="Registry Trace">
            <div className="trace-tree">
              {registrySteps.map((step) => {
                const meta = statusMeta(step.status);
                const isCall = step.label.includes("getResolver") || step.label.includes("getSubregistry");
                const value = step.value;
                return (
                  <div className={`trace-row ${meta.className}`} key={step.id}>
                    <div className="status-icon">{meta.icon}</div>
                    <div className="trace-main">
                      <div className="trace-label">{step.label}</div>
                      {value && <code className={isCall ? "call-data" : "value-data"}>{isCall ? short(value) : value}</code>}
                      {step.error && <div className="step-note">{step.error}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Resolver">
            <div className="panel-list">
              {resolverSteps.map((step) => {
                const meta = statusMeta(step.status);
                return (
                  <div className={`detail-row ${meta.className}`} key={step.id}>
                    <div className="status-icon">{meta.icon}</div>
                    <div className="detail-content">
                      <div className="trace-label">{step.label}</div>
                      {step.value && <code>{step.value}</code>}
                      {step.error && <div className="step-note">{step.error}</div>}
                    </div>
                  </div>
                );
              })}
              {result.resolver?.address && <div className="resolver-chip"><span>Selected resolver</span><code>{result.resolver.address}</code></div>}
            </div>
          </Section>

          <Section title="Resolution">
            <div className="panel-list">
              {resolutionSteps.map((step) => {
                const meta = statusMeta(step.status);
                return (
                  <div className={`detail-row ${meta.className}`} key={step.id}>
                    <div className="status-icon">{meta.icon}</div>
                    <div className="detail-content">
                      <div className="trace-label">{step.label}</div>
                      {step.value && <code>{step.label.includes("raw") ? short(step.value) : step.value}</code>}
                      {step.error && <div className="step-note">{step.error}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Diagnostics">
            <div className={`diagnostic ${finalSuccess ? "ok" : "problem"}`}>
              <div className="diagnostic-icon">{finalSuccess ? "✓" : "!"}</div>
              <div>
                <strong>{finalSuccess ? "ENSv2 resolution successful" : "ENSv2 resolution requires attention"}</strong>
                <p>{finalSuccess ? "The registry traversal, longest-suffix resolver lookup and final address resolution completed successfully." : "Inspect the trace above to identify the failing stage."}</p>
              </div>
            </div>
            {diagnosticSteps.map((step) => {
              const meta = statusMeta(step.status);
              return (
                <div className={`diagnostic-detail ${meta.className}`} key={step.id}>
                  <span className="status-icon">{meta.icon}</span>
                  <div><strong>{step.label}</strong>{step.error && <p>{step.error}</p>}</div>
                </div>
              );
            })}
          </Section>
        </div>
      )}

      {!result && <div className="empty-state"><span>⌁</span><p>Enter an ENS name or address to inspect its resolution path.</p></div>}

      <style jsx global>{`
        :root { color-scheme: dark; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #09090b; color: #f4f4f5; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        button, input { font: inherit; }
        .shell { max-width: 1120px; margin: 0 auto; padding: 58px 24px 90px; }
        .header { display: flex; justify-content: space-between; gap: 30px; align-items: flex-start; }
        .eyebrow, .muted-label, .section-title { color: #71717a; font-size: 11px; letter-spacing: .13em; text-transform: uppercase; }
        h1 { margin: 10px 0 14px; font-size: clamp(42px, 7vw, 72px); line-height: .95; letter-spacing: -.06em; }
        .header p { max-width: 700px; margin: 0; color: #a1a1aa; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 16px; line-height: 1.55; }
        .badge { border: 1px solid #27272a; border-radius: 999px; padding: 8px 11px; color: #a1a1aa; font-size: 10px; letter-spacing: .12em; white-space: nowrap; }
        .input-row { display: flex; gap: 10px; margin-top: 34px; }
        .input-row input { min-width: 0; flex: 1; border: 1px solid #27272a; background: #111113; color: #f4f4f5; border-radius: 9px; padding: 15px 16px; outline: none; }
        .input-row input:focus { border-color: #52525b; }
        .input-row button { border: 0; border-radius: 9px; padding: 15px 22px; background: #f4f4f5; color: #09090b; font-weight: 800; cursor: pointer; }
        .input-row button:disabled { opacity: .55; cursor: wait; }
        .results { margin-top: 38px; }
        .target-card { display: flex; justify-content: space-between; gap: 24px; border: 1px solid #27272a; background: #111113; border-radius: 12px; padding: 22px; }
        .target-card.resolved { border-color: #3f3f46; }
        .target-name { margin-top: 8px; font-size: 21px; }
        .target-result { text-align: right; min-width: 280px; }
        code { color: #d4d4d8; font-size: 12px; word-break: break-all; }
        .target-result code { display: block; margin-top: 8px; color: #f4f4f5; }
        .name-path { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 16px 0 4px; color: #a1a1aa; font-size: 12px; }
        .path-node { padding: 5px 8px; border: 1px solid #27272a; background: #111113; border-radius: 6px; }
        .path-arrow { padding: 0 3px; color: #52525b; }
        .section { margin-top: 34px; }
        .section-title { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #18181b; }
        .trace-tree, .panel-list { border: 1px solid #27272a; border-radius: 10px; overflow: hidden; background: #0f0f11; }
        .trace-row, .detail-row { display: flex; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #1f1f22; }
        .trace-row:last-child, .detail-row:last-child { border-bottom: 0; }
        .status-icon { flex: 0 0 18px; text-align: center; font-weight: 700; }
        .success .status-icon { color: #a1a1aa; }
        .warning .status-icon { color: #facc15; }
        .error .status-icon { color: #f87171; }
        .skipped .status-icon { color: #71717a; }
        .trace-main, .detail-content { min-width: 0; flex: 1; }
        .trace-label { font-size: 12px; color: #e4e4e7; }
        .call-data { display: block; margin-top: 8px; color: #71717a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .value-data { display: block; margin-top: 7px; color: #d4d4d8; }
        .step-note { margin-top: 7px; color: #a1a1aa; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 12px; line-height: 1.45; }
        .resolver-chip { display: flex; justify-content: space-between; gap: 15px; padding: 14px 16px; background: #141416; border-top: 1px solid #27272a; }
        .resolver-chip span { color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
        .resolver-chip code { color: #f4f4f5; }
        .diagnostic { display: flex; gap: 13px; border: 1px solid #27272a; border-radius: 10px; padding: 17px; background: #111113; }
        .diagnostic-icon { flex: 0 0 24px; text-align: center; font-weight: 800; }
        .diagnostic.ok .diagnostic-icon { color: #a1a1aa; }
        .diagnostic.problem .diagnostic-icon { color: #f87171; }
        .diagnostic strong { font-size: 13px; }
        .diagnostic p, .diagnostic-detail p { margin: 6px 0 0; color: #71717a; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 12px; line-height: 1.45; }
        .diagnostic-detail { display: flex; gap: 10px; margin-top: 8px; padding: 12px 14px; border: 1px solid #27272a; border-radius: 8px; background: #0f0f11; }
        .empty-state { margin-top: 70px; padding: 50px 20px; text-align: center; color: #52525b; border: 1px dashed #27272a; border-radius: 12px; }
        .empty-state span { font-size: 26px; }
        .empty-state p { margin: 12px 0 0; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; }
        @media (max-width: 700px) { .header, .target-card { flex-direction: column; } .target-result { min-width: 0; text-align: left; } .input-row { flex-direction: column; } .input-row button { width: 100%; } .resolver-chip { flex-direction: column; } }
      `}</style>
    </main>
  );
}
