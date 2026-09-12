"use client";

import { useState } from "react";

type TraceStep = { id: string; label: string; status: string; value?: string; error?: string };
type Result = {
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
  trace: TraceStep[];
};

const ZERO = "0x0000000000000000000000000000000000000000";
const V2_TARGET = "0x2f8a180604c42457cb56c7c4f708748ff1f91df1";
const CANONICAL = "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe";

function short(value?: string, left = 12, right = 8) {
  if (!value) return "—";
  return value.length <= left + right + 1 ? value : `${value.slice(0, left)}…${value.slice(-right)}`;
}

function isZeroAddress(value?: string) { return value?.toLowerCase() === ZERO; }

function statusMeta(status: string) {
  switch (status) {
    case "error": return { icon: "×", label: "ERROR", className: "error" };
    case "warning": return { icon: "!", label: "WARN", className: "warning" };
    case "info": return { icon: "·", label: "INFO", className: "info" };
    case "skipped": return { icon: "–", label: "SKIP", className: "skipped" };
    default: return { icon: "✓", label: "OK", className: "success" };
  }
}

function Section({ eyebrow, title, count, children }: { eyebrow: string; title: string; count?: number; children: React.ReactNode }) {
  return <section className="section"><div className="section-heading"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div>{typeof count === "number" && <span className="count">{count}</span>}</div>{children}</section>;
}

function TraceRow({ step, index }: { step: TraceStep; index: number }) {
  const [open, setOpen] = useState(false);
  const meta = statusMeta(step.status);
  const hasDetails = Boolean(step.value || step.error);
  const isCall = /getResolver|getSubregistry|findResolver|findRegistries|resolve\(/.test(step.label);
  return <div className={`trace-row ${meta.className} ${open ? "open" : ""}`}>
    <button className="trace-summary" onClick={() => hasDetails && setOpen(!open)} disabled={!hasDetails} aria-expanded={open}>
      <span className="index">{String(index + 1).padStart(2, "0")}</span><span className="status">{meta.icon}</span><span className="label">{step.label}</span><span className="state">{meta.label}</span>{hasDetails && <span>{open ? "⌃" : "⌄"}</span>}
    </button>
    {open && <div className="details">
      {step.value && <div className="detail-value"><span>{isCall ? "CALL DATA" : "VALUE"}</span><code>{step.value}</code><button onClick={() => navigator.clipboard?.writeText(step.value ?? "")}>COPY</button></div>}
      {step.error && <p>{step.error}</p>}
    </div>}
  </div>;
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
    } finally { setLoading(false); }
  }

  const trace = result?.trace ?? [];
  const registrySteps = trace.filter(s => /ROOT REGISTRY|getResolver\(|getSubregistry\(/.test(s.label));
  const resolverSteps = trace.filter(s => /Resolver for |Longest-suffix resolver|Resolver matched/.test(s.label));
  const resolutionSteps = trace.filter(s => /Universal Resolver|resolution result|resolution envelope|address record|Mainnet resolution|traced longest-suffix resolver|resolver override|inherited address/.test(s.label));
  const diagnosticSteps = trace.filter(s => ["error", "warning"].includes(s.status));
  const finalSuccess = Boolean(result?.address && !isZeroAddress(result.address));
  const isMainnet = result?.network === "mainnet";
  const isFallback = result?.mode === "legacy-fallback";
  const targetLabel = isMainnet ? "Ethereum Mainnet" : "Sepolia";
  const modeLabel = isFallback ? "MAINNET FALLBACK" : result?.mode === "ensv2" ? "ENSv2" : result?.mode === "reverse" ? "REVERSE" : "RAW TRACE";

  return <main className="shell">
    <header className="topbar"><div className="brand"><b>◎</b> ENSv2 Inspector <small>DEV TOOL</small></div><div className="network"><i /> {targetLabel.toUpperCase()}</div></header>

    <header className="hero"><div><div className="eyebrow">ENSv2 resolution debugger</div><h1>See <span>why</span> ENS resolves.</h1><p>Trace registry hierarchy, resolver selection and raw contract calls — then see exactly where resolution succeeds or breaks.</p></div><div className="hero-meta"><div><span>ENGINE</span><strong>ENSv2</strong></div><div><span>NETWORK</span><strong>{targetLabel}</strong></div><div><span>MODE</span><strong>{modeLabel}</strong></div></div></header>

    <div className="search"><span>ENS</span><input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && inspect()} placeholder="name.eth or 0x…" spellCheck={false}/><button onClick={inspect} disabled={loading}>{loading ? "Running" : "Inspect"}{!loading && " ↗"}</button></div>
    <div className="hint"><kbd>ENTER</kbd> to inspect · <button onClick={() => setName("ur.integration-tests.eth")}>ur.integration-tests.eth</button> · <button onClick={() => setName("mandragor.eth")}>mandragor.eth</button></div>

    {result && <div className="results">
      <div className="overview"><div><div className="kicker"><i className={finalSuccess ? "good" : "bad"}/> RESOLUTION TARGET</div><h3>{result.normalizedName ?? result.input}</h3>{result.normalizedName && <div className="path">{result.normalizedName.split(".").reverse().map((x,i,a) => <span key={`${x}-${i}`}>{x}{i < a.length - 1 && <b> › </b>}</span>)}</div>}</div><div className="address"><div className="kicker">RESOLVED ADDRESS</div><code>{result.address ?? "Resolution failed"}</code>{finalSuccess && <strong>● ADDRESS RESOLVED</strong>}</div></div>

      <div className={`target-banner ${isMainnet ? "mainnet" : "sepolia"}`}><div className="target-icon">⌁</div><div><span>EXECUTION TARGET</span><strong>{isMainnet ? "Universal Resolver · Ethereum Mainnet" : "UniversalResolverV2 · Sepolia"}</strong></div><code>{isMainnet ? short(CANONICAL, 10, 6) : short(V2_TARGET, 10, 6)}</code><em>{isFallback ? "MAINNET FALLBACK" : modeLabel}</em></div>

      {isFallback && <div className="fallback-note"><b>✓ NAME FOUND ON MAINNET</b><span>Sepolia ENSv2 has no matching resolver for this name. The inspector continued with the canonical ENS entrypoint on Ethereum Mainnet instead of reporting the existing name as missing.</span></div>}

      <div className="stats"><div><span>TRACE STEPS</span><b>{trace.length}</b></div><div><span>REGISTRY LEVELS</span><b>{registrySteps.filter(s => s.label.includes("getResolver")).length}</b></div><div><span>NETWORK</span><b>{targetLabel}</b></div><div><span>ISSUES</span><b className={diagnosticSteps.length ? "issue" : ""}>{diagnosticSteps.length}</b></div></div>

      <Section eyebrow="01 / hierarchy" title="Registry trace" count={registrySteps.length}><div className="trace-panel">{registrySteps.map((s,i) => <TraceRow key={s.id} step={s} index={i}/>)}</div></Section>
      <Section eyebrow="02 / selection" title="Resolver" count={resolverSteps.length}><div className="trace-panel">{resolverSteps.map((s,i) => <TraceRow key={s.id} step={s} index={i}/>)}</div></Section>
      <Section eyebrow="03 / execution" title="Resolution" count={resolutionSteps.length}><div className="trace-panel">{resolutionSteps.map((s,i) => <TraceRow key={s.id} step={s} index={i}/>)}</div></Section>
      <Section eyebrow="04 / analysis" title="Diagnostics"><div className={`diagnostic ${finalSuccess ? "ok" : "problem"}`}><b>{finalSuccess ? "✓" : "!"}</b><div><strong>{finalSuccess ? "Resolution completed" : "Resolution requires attention"}</strong><p>{finalSuccess ? (isFallback ? "The name resolves on Ethereum Mainnet through the canonical ENS entrypoint." : "The inspected name reached a resolver and returned a non-zero address.") : "Use the trace to locate the first actionable failure."}</p></div><span>{finalSuccess ? "PASS" : "CHECK"}</span></div>{diagnosticSteps.map(s => { const m=statusMeta(s.status); return <div className={`diagnostic-detail ${m.className}`} key={s.id}><b>{m.icon}</b><div><strong>{s.label}</strong>{s.error && <p>{s.error}</p>}</div></div>; })}</Section>
    </div>}

    {!result && <div className="empty"><b>⌁</b><strong>READY TO TRACE</strong><p>Enter an ENS name or address to inspect its resolution path.</p></div>}
    <footer><span>ENSv2 INSPECTOR</span><span>developer debugger · not an explorer</span></footer>

    <style jsx global>{`
      :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#08090b;color:#e7e7e9;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}button,input{font:inherit}button{cursor:pointer}.shell{max-width:1160px;margin:auto;padding:26px 28px 70px}.topbar{height:44px;border-bottom:1px solid #1b1c20;display:flex;justify-content:space-between;align-items:center}.brand{font-size:13px;font-weight:700;color:#d4d4d8}.brand b{font-size:18px;margin-right:8px}.brand small{color:#55565e;font-size:9px;letter-spacing:.15em;margin-left:8px}.network{font-size:10px;letter-spacing:.14em;color:#74757d}.network i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#a1a1aa;margin-right:7px}.hero{display:grid;grid-template-columns:1fr 250px;gap:70px;padding:72px 0 42px}.eyebrow,.kicker,.hero-meta span,.target-banner span,.stats span{font-size:10px;letter-spacing:.16em;color:#62636b;text-transform:uppercase}.hero h1{font-size:clamp(48px,8vw,82px);line-height:.92;letter-spacing:-.075em;margin:10px 0 18px}.hero h1 span{color:#a1a1aa}.hero p{max-width:650px;color:#8b8c93;font:17px/1.65 ui-sans-serif,system-ui,sans-serif}.hero-meta{border-left:1px solid #25262b;padding-left:18px;align-self:end}.hero-meta div{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #1b1c20;font-size:10px}.hero-meta strong{font-weight:500;color:#b8b8bd}.search{display:flex;min-height:60px;background:#111215;border:1px solid #303137;border-radius:10px;overflow:hidden}.search>span{padding:20px 16px;color:#55565e;border-right:1px solid #24252a;font-size:11px}.search input{min-width:0;flex:1;background:transparent;border:0;outline:0;color:#eee;padding:0 18px;font-size:15px}.search button{border:0;background:#e7e7e9;color:#0a0a0c;padding:0 23px;font-weight:700;font-size:12px}.hint{color:#5f6068;font-size:11px;padding:10px 2px 50px}.hint kbd{border:1px solid #303137;border-radius:4px;padding:3px 5px;color:#92939a;font-size:9px}.hint button{background:none;border:0;color:#92939a;padding:0}.results{border-top:1px solid #202126}.overview{display:grid;grid-template-columns:1fr 360px;gap:40px;padding:34px 0}.kicker{display:flex;align-items:center;gap:8px}.kicker i{width:7px;height:7px;border-radius:50%;background:#55565e}.kicker i.good{background:#a1a1aa}.kicker i.bad{background:#d4d4d8}.overview h3{font-size:25px;margin:13px 0 10px;letter-spacing:-.04em}.path{color:#777880;font-size:12px}.path b{color:#3f4046}.address{border-left:1px solid #24252a;padding-left:25px}.address code{display:block;color:#d6d6da;font-size:14px;margin-top:14px;word-break:break-all}.address strong{display:block;color:#999aa1;font-size:10px;margin-top:9px;letter-spacing:.08em}.target-banner{display:flex;align-items:center;gap:16px;padding:18px;border:1px solid #25262b;background:#101114;border-radius:9px}.target-banner.mainnet{border-color:#39393e}.target-icon{font-size:24px;color:#8b8c93}.target-banner div:nth-child(2){flex:1}.target-banner strong{display:block;margin-top:5px;font-size:13px}.target-banner code{color:#aaaab0;font-size:11px}.target-banner em{font-style:normal;font-size:9px;letter-spacing:.12em;color:#85868d;border:1px solid #33343a;padding:6px 8px;border-radius:4px}.fallback-note{display:flex;gap:15px;padding:15px 18px;border:1px solid #303137;border-top:0;background:#0d0e10;color:#999aa1;font-size:12px;line-height:1.55}.fallback-note b{white-space:nowrap;color:#c3c3c8;font-size:10px;letter-spacing:.1em}.stats{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #202126;border-radius:8px;margin:18px 0 65px}.stats div{padding:15px 17px;border-right:1px solid #202126}.stats div:last-child{border:0}.stats b{display:block;font-size:17px;margin-top:6px}.stats .issue{color:#c4c4c9}.section{margin:0 0 54px}.section-heading{display:flex;justify-content:space-between;align-items:end;margin-bottom:12px}.section h2{font-size:17px;margin:6px 0 0}.count{font-size:11px;color:#55565e}.trace-panel{border-top:1px solid #292a2f;border-bottom:1px solid #292a2f}.trace-row{border-bottom:1px solid #1d1e22}.trace-row:last-child{border:0}.trace-summary{width:100%;display:grid;grid-template-columns:35px 24px 1fr auto 22px;gap:8px;align-items:center;padding:13px 4px;background:none;border:0;color:#a9aab0;text-align:left}.trace-summary:disabled{cursor:default}.trace-row .index{color:#4e4f56;font-size:10px}.trace-row .status{font-size:12px}.trace-row.success .status{color:#a6a7ad}.trace-row.warning .status{color:#d0d0d4}.trace-row.error .status{color:#f0f0f2}.trace-row.skipped .status{color:#55565e}.trace-row .label{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.trace-row .state{font-size:9px;letter-spacing:.1em;color:#55565e}.trace-row.warning .state{color:#aaaab0}.trace-row.error .state{color:#dddde1}.details{margin:0 0 10px 59px;padding:12px 13px;border-left:1px solid #2b2c31;background:#0d0e10}.detail-value{display:grid;grid-template-columns:75px 1fr auto;gap:12px;align-items:start}.detail-value span{font-size:8px;letter-spacing:.12em;color:#55565e}.detail-value code{font-size:10px;line-height:1.6;color:#a7a8ae;word-break:break-all}.detail-value button{background:none;border:1px solid #303137;color:#74757d;border-radius:3px;font-size:8px;padding:3px 6px}.details p{margin:9px 0 0;color:#7e7f86;font:12px/1.5 ui-sans-serif,system-ui,sans-serif}.diagnostic{display:grid;grid-template-columns:32px 1fr auto;gap:13px;padding:18px;border:1px solid #303137;background:#101114;border-radius:7px}.diagnostic>b{font-size:18px}.diagnostic strong{font-size:12px}.diagnostic p{margin:5px 0 0;color:#777880;font:12px/1.45 ui-sans-serif,system-ui,sans-serif}.diagnostic span{font-size:9px;letter-spacing:.12em;color:#a1a1a6}.diagnostic.ok{border-color:#303137}.diagnostic.problem{border-color:#3a3a40}.diagnostic-detail{display:flex;gap:13px;padding:13px 3px;border-bottom:1px solid #1d1e22}.diagnostic-detail>b{width:29px;text-align:center;color:#a0a1a7}.diagnostic-detail strong{font-size:11px}.diagnostic-detail p{margin:5px 0 0;color:#777880;font:11px/1.5 ui-sans-serif,system-ui,sans-serif}.empty{text-align:center;padding:120px 0;color:#55565e}.empty>b{display:block;font-size:40px;color:#34353a;margin-bottom:14px}.empty strong{font-size:11px;letter-spacing:.14em}.empty p{font:13px/1.5 ui-sans-serif,system-ui,sans-serif;color:#62636b}.empty+footer{margin-top:0}footer{display:flex;justify-content:space-between;border-top:1px solid #1b1c20;margin-top:30px;padding-top:18px;color:#4f5057;font-size:9px;letter-spacing:.1em}@media(max-width:760px){.shell{padding:18px 16px 50px}.hero{grid-template-columns:1fr;gap:25px;padding:50px 0 30px}.hero h1{font-size:52px}.hero p{font-size:15px}.hero-meta{border-left:0;border-top:1px solid #25262b;padding:10px 0 0}.overview{grid-template-columns:1fr;gap:25px}.address{border-left:0;border-top:1px solid #24252a;padding:20px 0 0}.target-banner{flex-wrap:wrap}.target-banner code{order:4;width:100%}.stats{grid-template-columns:repeat(2,1fr);margin-bottom:50px}.stats div:nth-child(2){border-right:0}.stats div:nth-child(-n+2){border-bottom:1px solid #202126}.trace-summary{grid-template-columns:28px 20px 1fr auto 16px}.details{margin-left:48px}.detail-value{grid-template-columns:1fr}.detail-value button{width:max-content}.hint{padding-bottom:35px}footer{gap:20px;flex-direction:column}}
    `}</style>
  </main>;
}
