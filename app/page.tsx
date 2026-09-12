export default function Home() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "96px 24px" }}>
      <div style={{ maxWidth: 720 }}>
        <p style={{ marginBottom: 16, fontSize: 14, color: "#a1a1aa", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          ENSv2 Developer Tool
        </p>
        <h1 style={{ margin: 0, fontSize: "clamp(48px, 8vw, 88px)", lineHeight: 0.95, letterSpacing: "-0.05em" }}>
          ENSv2 Inspector
        </h1>
        <p style={{ marginTop: 28, fontSize: 20, lineHeight: 1.6, color: "#a1a1aa", maxWidth: 620 }}>
          A developer debugger for ENSv2 resolution. Inspect the resolution path,
          diagnose failures, and understand what is happening under the hood.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
          <input
            aria-label="ENS name"
            placeholder="Enter an ENS name or address"
            style={{ flex: 1, minWidth: 0, padding: "16px 18px", borderRadius: 12, border: "1px solid #27272a", background: "#18181b", color: "#fff", outline: "none" }}
          />
          <button
            type="button"
            style={{ padding: "16px 22px", borderRadius: 12, border: "1px solid #fff", background: "#fff", color: "#09090b", fontWeight: 700, cursor: "pointer" }}
          >
            Inspect
          </button>
        </div>
      </div>
    </main>
  );
}
