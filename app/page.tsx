"use client";

import { useState } from "react";

type TraceStep = { id: string; label: string; status: string; value?: string; error?: string };
type Result = { input: string; normalizedName?: string; node?: string; resolver?: { address?: string; found: boolean }; address?: string; trace: TraceStep[] };

export default function Home() {
  const [name, setName] = useState("ur.integration-tests.eth");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function inspect() {
    setLoading(true);
    try {
      const response = await fetch(`/api/inspect?name=${encodeURIComponent(name)}`);
      setResult(await response.json());
    } finally { setLoading(false); }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 24px" }}>
      <p style={{ color: "#a1a1aa", fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase" }}>ENSv2 Developer Tool · Sepolia</p>
      <h1 style={{ fontSize: "clamp(44px, 7vw, 76px)", lineHeight: .95, letterSpacing: "-.05em", margin: "14px 0 20px" }}>ENSv2 Inspector</h1>
      <p style={{ color: "#a1a1aa", fontSize: 18, maxWidth: 720, lineHeight: 1.6 }}>
        Inspect the actual resolution path and see the raw Universal Resolver call, decoded resolver, and address record.
      </p>

      <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name.eth" style={{ flex: 1, padding: 15, borderRadius: 10, border: "1px solid #27272a", background: "#18181b", color: "white" }} />
        <button onClick={inspect} disabled={loading} style={{ padding: "15px 22px", borderRadius: 10, border: 0, background: "white", color: "black", fontWeight: 700 }}>{loading ? "Inspecting…" : "Inspect"}</button>
      </div>

      {result && (
        <section style={{ marginTop: 40 }}>
          <div style={{ border: "1px solid #27272a", borderRadius: 14, padding: 22, background: "#111113" }}>
            <div style={{ color: "#a1a1aa", fontSize: 13 }}>Resolution target</div>
            <div style={{ fontSize: 22, marginTop: 6 }}>{result.normalizedName ?? result.input}</div>
            {result.address && <div style={{ marginTop: 12, fontFamily: "monospace", wordBreak: "break-all" }}>{result.address}</div>}
          </div>

          <h2 style={{ marginTop: 38 }}>Resolution Trace</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {result.trace.map((step) => (
              <div key={step.id} style={{ border: "1px solid #27272a", borderRadius: 12, padding: 16, background: "#111113" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <strong>{step.label}</strong><span style={{ color: step.status === "error" ? "#f87171" : step.status === "warning" ? "#facc15" : "#86efac" }}>{step.status}</span>
                </div>
                {step.value && <pre style={{ overflowX: "auto", whiteSpace: "pre-wrap", color: "#a1a1aa", fontSize: 12 }}>{step.value}</pre>}
                {step.error && <div style={{ marginTop: 8, color: "#f87171" }}>{step.error}</div>}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
