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
const V2_TARGET = "0x2f8a180604c42457cb56c7c4f708748ff1f91df1";
const CANONICAL = "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe";

function short(value?: string, left = 12, right = 8) {
  if (!value) return "—";
  if (value.length <= left + right + 1) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

function isZeroAddress(value?: string) {
  return value?.toLowerCase() === ZERO;
}

function statusMeta(status: string) {
  switch (status) {
    case "error": return { icon: "×", label: "ERROR", className: "error" };
    case "warning": return { icon: "!", label: "WARN", className: "warning" };
    case "info": return { icon: "·", label: "INFO", className: "info" };
    case "skipped": return { icon: "–", label: "SKIP", className: "skipped" };
    default: return { icon: "✓", label: "OK", className: "success" };
  }
}

function Section({ eyebrow, title, count, children }: { eyebrow?: string; title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="section">
      <div className="section-heading">
        <div>
          {eyebrow && <div className="section-eyebrow">{eyebrow}</div>}
          <h2>{title}</h2>
        </div>
        {typeof count === "number" && <span className="count">{count}</span>}
      </div>
      {children}
    </section>
  );
}

function TraceRow({ step, index, compact = false }: { step: TraceStep; index: number; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = statusMeta(step.status);
  const hasDetails = Boolean(step.value || step.error);
  const isCall = /getResolver|getSubregistry|findResolver|findRegistries|resolve\(/.test(step.label);

  return (
    <div className={`trace-row ${meta.className} ${open ? "open" : ""}`}>
      <button className="trace-summary" onClick={() => hasDetails && setOpen(!open)} disabled={!hasDetails} aria-expanded={open}>
        <span className="trace-index">{String(index + 1).padStart(2, "0")}</span>
        <span className="status-icon">{meta.icon}</span>
        <span className="trace-label">{step.label}</span>
        <span className="trace-status">{meta.label}</span>
        {hasDetails && <span className="chevron">{open ? "⌃" : "⌄"}</span>}
      </button>
      {open && (
        <div className="trace-details">
          {step.value && (
            <div className="detail-block">
              <div className="detail-label">{isCall || compact ? "CALL DATA" : "VALUE"}</div>
              <div className="detail-value"><code>{step.value}</code></div>
              <button className="copy" onClick={() => navigator.clipboard?.writeText(step.value ?? "")}>COPY</button>
            </div>
          )}
          {step.error && <div className="detail-note">{step.error}</div>}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [name, setName] = useState("ur.integration-tests.eth");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function inspect() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/inspect?name=${encodeURIComponent(name.trim())}`);
      setResult(await response.json());
    } finally {
      setLoading(false);
    }
  }

  const trace = result?.trace ?? [];
  const registrySteps = trace.filter((step) => /ROOT REGISTRY|getResolver\(|getSubregistry\(/.test(step.label));
  const resolverSteps = trace.filter((step) => /Resolver for |Longest-suffix resolver|Resolver matched/.test(step.label));
  const resolutionSteps = trace.filter((step) => /Universal Resolver|resolution result|resolution envelope|address record/.test(step.label));
  const diagnosticSteps = trace.filter((step) => ["error", "warning"].includes(step.status));
  const finalSuccess = Boolean(result?.address && !isZeroAddress(result.address));
  const infoCount = trace.filter((step) => step.status === "info").length;

  return (
    <main className="shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◎</span>
          <span>ENSv2 Inspector</span>
          <span className="version">DEV TOOL</span>
        </div>
        <div className="network"><span className="live-dot" /> SEPOLIA</div>
      </header>

      <header className="hero">
        <div className="hero-copy">
          <div className="eyebrow">ENSv2 resolution debugger</div>
          <h1>See <span>why</span> ENS resolves.</h1>
          <p>Trace registry hierarchy, resolver selection and raw contract calls — then see exactly where resolution succeeds or breaks.</p>
        </div>
        <div className="hero-side">
          <div className="side-line"><span>ENGINE</span><strong>ENSv2</strong></div>
          <div className="side-line"><span>NETWORK</span><strong>Sepolia</strong></div>
          <div className="side-line"><span>MODE</span><strong>RAW TRACE</strong></div>
        </div>
      </header>

      <div className="search-card">
        <div className="input-prefix">ENS</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") inspect(); }}
          placeholder="name.eth or 0x…"
          spellCheck={false}
          aria-label="ENS name or address"
        />
        <button onClick={inspect} disabled={loading}>
          <span>{loading ? "Running" : "Inspect"}</span>
          {!loading && <span className="button-arrow">↗</span>}
        </button>
      </div>
      <div className="hint"><kbd>ENTER</kbd> to inspect <span>·</span> Try <button onClick={() => { setName("ur.integration-tests.eth"); }}>ur.integration-tests.eth</button></div>

      {result && (
        <div className="results">
          <div className="result-overview">
            <div className="overview-main">
              <div className="result-kicker"><span className={`pulse ${finalSuccess ? "good" : "bad"}`} /> RESOLUTION TARGET</div>
              <div className="target-name">{result.normalizedName ?? result.input}</div>
              {result.normalizedName && (
                <div className="name-path">
                  {result.normalizedName.split(".").reverse().map((label, index, labels) => (
                    <span className="path-part" key={`${label}-${index}`}>
                      <span>{label}</span>{index < labels.length - 1 && <b>›</b>}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="overview-address">
              <div className="result-kicker">RESOLVED ADDRESS</div>
              <code>{result.address ?? "Resolution failed"}</code>
              {finalSuccess && <div className="success-label">● ADDRESS RESOLVED</div>}
            </div>
          </div>

          <div className="execution-banner">
            <div className="execution-icon">⌁</div>
            <div>
              <span>EXECUTION TARGET</span>
              <strong>UniversalResolverV2 · Sepolia</strong>
            </div>
            <code>{short(V2_TARGET, 10, 6)}</code>
            <div className="canonical-note"><span>CANONICAL PROXY</span> {short(CANONICAL, 8, 5)}</div>
          </div>

          <div className="stats-row">
            <div><span>TRACE STEPS</span><strong>{trace.length}</strong></div>
            <div><span>REGISTRY LEVELS</span><strong>{registrySteps.filter((s) => s.label.includes("getResolver")).length}</strong></div>
            <div><span>NOTES</span><strong>{infoCount}</strong></div>
            <div><span>ISSUES</span><strong className={diagnosticSteps.length ? "issue-number" : ""}>{diagnosticSteps.length}</strong></div>
          </div>

          <Section eyebrow="01 / hierarchy" title="Registry trace" count={registrySteps.length}>
            <div className="trace-panel">
              {registrySteps.map((step, index) => <TraceRow key={step.id} step={step} index={index} compact={step.label.includes("call")} />)}
            </div>
          </Section>

          <Section eyebrow="02 / selection" title="Resolver" count={resolverSteps.length}>
            <div className="trace-panel">
              {resolverSteps.map((step, index) => <TraceRow key={step.id} step={step} index={index} />)}
              {result.resolver?.address && (
                <div className="selected-resolver">
                  <div><span>SELECTED RESOLVER</span><strong>{short(result.resolver.address, 14, 8)}</strong></div>
                  <span className="selected-badge">LONGEST SUFFIX</span>
                </div>
              )}
            </div>
          </Section>

          <Section eyebrow="03 / execution" title="Resolution" count={resolutionSteps.length}>
            <div className="trace-panel">
              {resolutionSteps.map((step, index) => <TraceRow key={step.id} step={step} index={index} compact={step.label.includes("raw")} />)}
            </div>
          </Section>

          <Section eyebrow="04 / analysis" title="Diagnostics">
            <div className={`diagnostic ${finalSuccess ? "ok" : "problem"}`}>
              <div className="diagnostic-symbol">{finalSuccess ? "✓" : "!"}</div>
              <div className="diagnostic-copy">
                <strong>{finalSuccess ? "Resolution completed" : "Resolution requires attention"}</strong>
                <p>{finalSuccess ? "The inspected name reached a resolver and returned a non-zero address." : "Use the trace to locate the first failing stage in the resolution path."}</p>
              </div>
              <span className="diagnostic-code">{finalSuccess ? "PASS" : "CHECK"}</span>
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

      {!result && (
        <div className="empty-state">
          <div className="empty-grid" />
          <div className="empty-symbol">⌁</div>
          <strong>READY TO TRACE</strong>
          <p>Enter an ENS name or address to inspect its resolution path.</p>
        </div>
      )}

      <footer>
        <span>ENSv2 INSPECTOR</span>
        <span>developer debugger · not an explorer</span>
      </footer>

      <style jsx global>{`
        :root { color-scheme: dark; }
        * { box-sizing: border-box; }
        html { background: #08090b; }
        body { margin: 0; background: #08090b; color: #e7e7e9; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        button, input { font: inherit; }
        button { -webkit-tap-highlight-color: transparent; }
        .shell { position: relative; isolation: isolate; max-width: 1160px; margin: 0 auto; padding: 26px 28px 70px; overflow: hidden; }
        .ambient { position: absolute; pointer-events: none; z-index: -1; border-radius: 50%; filter: blur(90px); opacity: .12; }
        .ambient-one { width: 420px; height: 420px; top: 60px; right: -230px; background: #5b5bd6; }
        .ambient-two { width: 300px; height: 300px; top: 560px; left: -220px; background: #3b82f6; opacity: .07; }
        .topbar { height: 42px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #18191d; }
        .brand { display: flex; align-items: center; gap: 9px; color: #d4d4d8; font-size: 12px; font-weight: 700; letter-spacing: -.02em; }
        .brand-mark { font-size: 19px; line-height: 1; color: #a1a1aa; }
        .version { margin-left: 4px; color: #52525b; font-size: 9px; letter-spacing: .12em; font-weight: 600; }
        .network { display: flex; align-items: center; gap: 7px; color: #71717a; font-size: 9px; letter-spacing: .13em; }
        .live-dot { width: 6px; height: 6px; border-radius: 50%; background: #a1a1aa; box-shadow: 0 0 9px rgba(161,161,170,.5); }
        .hero { display: grid; grid-template-columns: minmax(0, 1fr) 250px; gap: 70px; padding: 74px 0 42px; }
        .eyebrow, .section-eyebrow, .result-kicker, .execution-banner span, .stats-row span, .selected-resolver span, .canonical-note span { color: #62636b; font-size: 9px; letter-spacing: .16em; text-transform: uppercase; }
        h1 { margin: 10px 0 18px; max-width: 760px; font-size: clamp(48px, 8vw, 82px); line-height: .92; letter-spacing: -.075em; font-weight: 750; }
        h1 span { color: #a1a1aa; }
        .hero-copy p { max-width: 650px; margin: 0; color: #777980; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 15px; line-height: 1.65; }
        .hero-side { align-self: end; border-left: 1px solid #222328; padding-left: 18px; }
        .side-line { display: flex; justify-content: space-between; gap: 20px; padding: 9px 0; border-bottom: 1px solid #18191d; font-size: 9px; }
        .side-line strong { color: #b8b8bd; font-weight: 500; }
        .search-card { display: flex; align-items: stretch; min-height: 56px; border: 1px solid #303137; background: rgba(17,18,21,.9); border-radius: 10px; box-shadow: 0 18px 50px rgba(0,0,0,.18); overflow: hidden; }
        .input-prefix { display: flex; align-items: center; padding: 0 15px; border-right: 1px solid #25262b; color: #52535b; font-size: 9px; letter-spacing: .14em; }
        .search-card input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: #e4e4e7; padding: 0 16px; font-size: 13px; }
        .search-card input::placeholder { color: #4f5057; }
        .search-card button { display: flex; align-items: center; gap: 18px; margin: 5px; padding: 0 18px; border: 0; border-radius: 6px; background: #e4e4e7; color: #101114; font-size: 11px; font-weight: 800; cursor: pointer; }
        .search-card button:hover { background: #fff; }
        .search-card button:disabled { opacity: .55; cursor: wait; }
        .button-arrow { font-size: 15px; }
        .hint { margin-top: 9px; color: #45464d; font-size: 9px; }
        .hint kbd { padding: 2px 5px; border: 1px solid #28292e; border-radius: 3px; color: #65666d; font-size: 8px; }
        .hint span { margin: 0 5px; color: #303137; }
        .hint button { padding: 0; border: 0; background: transparent; color: #777980; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; font-size: 9px; }
        .results { margin-top: 55px; }
        .result-overview { display: grid; grid-template-columns: 1fr minmax(310px, .8fr); gap: 30px; padding: 25px 0 22px; border-top: 1px solid #2a2b30; border-bottom: 1px solid #1c1d21; }
        .result-kicker { display: flex; align-items: center; gap: 7px; }
        .pulse { width: 5px; height: 5px; border-radius: 50%; display: inline-block; background: #777980; }
        .pulse.bad { background: #f87171; }
        .target-name { margin-top: 10px; font-size: 21px; letter-spacing: -.04em; color: #dedee1; overflow-wrap: anywhere; }
        .name-path { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin-top: 15px; }
        .path-part { display: inline-flex; align-items: center; gap: 5px; color: #85868d; font-size: 10px; }
        .path-part span { padding: 4px 7px; border: 1px solid #27282d; background: #111216; border-radius: 4px; }
        .path-part b { color: #3e3f45; font-weight: 400; }
        .overview-address { padding-left: 30px; border-left: 1px solid #1c1d21; }
        .overview-address code { display: block; margin-top: 10px; color: #e4e4e7; font-size: 12px; overflow-wrap: anywhere; }
        .success-label { margin-top: 9px; color: #777980; font-size: 8px; letter-spacing: .12em; }
        .execution-banner { display: flex; align-items: center; gap: 13px; margin-top: 10px; padding: 13px 15px; border: 1px solid #24252a; background: #0d0e11; border-radius: 7px; }
        .execution-icon { width: 24px; height: 24px; display: grid; place-items: center; border: 1px solid #303137; border-radius: 5px; color: #a1a1aa; }
        .execution-banner div:nth-child(2) { display: flex; flex-direction: column; gap: 3px; flex: 1; }
        .execution-banner strong { color: #bdbdc2; font-size: 10px; font-weight: 600; }
        .execution-banner > code { color: #62636b; font-size: 9px; }
        .canonical-note { display: flex; flex-direction: column; gap: 3px; padding-left: 14px; border-left: 1px solid #23242a; color: #52535b; font-size: 9px; }
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 10px; border-bottom: 1px solid #1c1d21; }
        .stats-row > div { padding: 15px; border-right: 1px solid #1c1d21; }
        .stats-row > div:first-child { padding-left: 0; }
        .stats-row > div:last-child { border-right: 0; }
        .stats-row strong { display: block; margin-top: 5px; color: #bcbcc1; font-size: 14px; font-weight: 500; }
        .stats-row .issue-number { color: #d4d4d8; }
        .section { margin-top: 47px; }
        .section-heading { display: flex; align-items: end; justify-content: space-between; margin-bottom: 11px; }
        h2 { margin: 4px 0 0; color: #c9c9cd; font-size: 13px; font-weight: 600; letter-spacing: -.02em; }
        .count { min-width: 22px; height: 20px; display: grid; place-items: center; border: 1px solid #28292e; border-radius: 4px; color: #62636b; font-size: 9px; }
        .trace-panel { border-top: 1px solid #2b2c31; border-bottom: 1px solid #222329; background: rgba(12,13,16,.65); }
        .trace-row { border-bottom: 1px solid #1c1d21; }
        .trace-row:last-child { border-bottom: 0; }
        .trace-summary { width: 100%; min-height: 47px; display: flex; align-items: center; gap: 10px; padding: 0 10px; border: 0; background: transparent; color: inherit; text-align: left; }
        .trace-row:not(.open) .trace-summary:enabled:hover { background: #111216; cursor: pointer; }
        .trace-row.open .trace-summary { background: #111216; }
        .trace-index { width: 22px; color: #37383e; font-size: 8px; }
        .status-icon { width: 15px; color: #8b8c92; font-size: 12px; text-align: center; font-weight: 700; }
        .trace-label { flex: 1; min-width: 0; color: #a6a7ac; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .trace-status { color: #4f5057; font-size: 8px; letter-spacing: .08em; }
        .chevron { width: 15px; color: #4d4e55; font-size: 11px; text-align: center; }
        .warning .status-icon { color: #eab308; }
        .error .status-icon { color: #f87171; }
        .info .status-icon { color: #65666d; }
        .skipped .status-icon { color: #45464d; }
        .trace-details { position: relative; margin-left: 47px; margin-right: 10px; margin-bottom: 10px; padding: 12px; border: 1px solid #24252a; background: #090a0d; border-radius: 5px; }
        .detail-block { padding-right: 44px; }
        .detail-label { color: #4e4f56; font-size: 8px; letter-spacing: .13em; }
        .detail-value { margin-top: 7px; }
        .detail-value code { color: #96979d; font-size: 9px; line-height: 1.7; word-break: break-all; }
        .copy { position: absolute; top: 10px; right: 10px; padding: 4px 6px; border: 1px solid #25262b; border-radius: 3px; background: transparent; color: #5c5d64; font-size: 7px; cursor: pointer; }
        .copy:hover { color: #a1a1aa; border-color: #3b3c42; }
        .detail-note { margin-top: 8px; color: #8a8b91; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; line-height: 1.5; }
        .selected-resolver { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 0; padding: 13px 15px; background: #101115; border-top: 1px solid #25262b; }
        .selected-resolver div { display: flex; align-items: center; gap: 15px; }
        .selected-resolver strong { color: #c8c8cd; font-size: 10px; font-weight: 500; }
        .selected-badge { color: #6a6b72 !important; padding: 4px 6px; border: 1px solid #292a30; border-radius: 3px; font-size: 7px !important; }
        .diagnostic { display: flex; align-items: center; gap: 13px; padding: 15px; border: 1px solid #2a2b30; background: #101115; border-radius: 6px; }
        .diagnostic-symbol { width: 25px; height: 25px; display: grid; place-items: center; border: 1px solid #35363c; border-radius: 5px; color: #b3b3b8; font-weight: 700; }
        .diagnostic.problem .diagnostic-symbol { color: #f87171; border-color: #4a2929; }
        .diagnostic-copy { flex: 1; }
        .diagnostic-copy strong { color: #c4c4c9; font-size: 11px; }
        .diagnostic-copy p { margin: 4px 0 0; color: #696a71; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; line-height: 1.45; }
        .diagnostic-code { color: #5e5f66; font-size: 8px; letter-spacing: .12em; }
        .diagnostic-detail { display: flex; gap: 10px; margin-top: 7px; padding: 11px 13px; border: 1px solid #24252a; background: #0d0e11; border-radius: 5px; }
        .diagnostic-detail strong { color: #97989e; font-size: 9px; }
        .diagnostic-detail p { margin: 5px 0 0; color: #686970; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 10px; line-height: 1.45; }
        .empty-state { position: relative; min-height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 55px; overflow: hidden; border: 1px dashed #25262b; border-radius: 8px; text-align: center; color: #53545b; }
        .empty-grid { position: absolute; inset: 0; opacity: .35; background-image: linear-gradient(#18191d 1px, transparent 1px), linear-gradient(90deg, #18191d 1px, transparent 1px); background-size: 35px 35px; mask-image: linear-gradient(to bottom, transparent, black, transparent); }
        .empty-symbol { position: relative; margin-bottom: 12px; color: #66676e; font-size: 28px; }
        .empty-state strong { position: relative; color: #686970; font-size: 9px; letter-spacing: .18em; }
        .empty-state p { position: relative; margin: 8px 0 0; color: #45464d; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; }
        footer { display: flex; justify-content: space-between; margin-top: 70px; padding-top: 15px; border-top: 1px solid #18191d; color: #37383e; font-size: 8px; letter-spacing: .1em; }
        @media (max-width: 760px) {
          .shell { padding: 20px 16px 50px; }
          .hero { grid-template-columns: 1fr; gap: 28px; padding-top: 55px; }
          .hero-side { max-width: 310px; }
          .result-overview { grid-template-columns: 1fr; gap: 24px; }
          .overview-address { padding-left: 0; padding-top: 20px; border-left: 0; border-top: 1px solid #1c1d21; }
          .execution-banner { flex-wrap: wrap; }
          .canonical-note { width: 100%; padding: 10px 0 0; border-left: 0; border-top: 1px solid #23242a; }
          .trace-status { display: none; }
        }
        @media (max-width: 500px) {
          h1 { font-size: 48px; }
          .search-card { min-height: 112px; flex-wrap: wrap; }
          .input-prefix { height: 50px; }
          .search-card input { height: 50px; width: calc(100% - 60px); }
          .search-card button { width: 100%; height: 47px; justify-content: center; margin: 0 5px 5px; }
          .stats-row > div { padding: 12px 8px; }
          .stats-row > div:first-child { padding-left: 0; }
          .trace-index { display: none; }
          .trace-details { margin-left: 25px; }
          .selected-resolver, .diagnostic { align-items: flex-start; }
          .selected-resolver { flex-direction: column; gap: 8px; }
          .selected-resolver div { flex-direction: column; align-items: flex-start; gap: 6px; }
          footer { flex-direction: column; gap: 8px; }
        }
      `}</style>
    </main>
  );
}
