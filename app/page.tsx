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
  const resolutionSteps = trace.filter(s => /Universal Resolver|resolution result|resolution envelope|address record|Mainnet resolution/.test(s.label));
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
      :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#08090b;color:#e7e7e9;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}button,input{font:inherit}button{cursor:pointer}.shell{max-width:1160px;margin:auto;padding:26px 28px 70px}.topbar{height:44px;border-bottom:1px solid #1b1c20;display:flex;justify-content:space-between;align-items:center}.brand{font-size:13px;font-weight:700;color:#d4d4d8}.brand b{font-size:18px;margin-right:8px}.brand small{color:#55565e;font-size:9px;letter-spacing:.15em;margin-left:8px}.network{font-size:10px;letter-spacing:.14em;color:#74757d}.network i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#a1a1aa;margin-right:7px}.hero{display:grid;grid-template-columns:1fr 250px;gap:70px;padding:72px 0 42px}.eyebrow,.kicker,.hero-meta span,.target-banner span,.stats span{font-size:10px;letter-spacing:.16em;color:#62636b;text-transform:uppercase}.hero h1{font-size:clamp(48px,8vw,82px);line-height:.92;letter-spacing:-.075em;margin:10px 0 18px}.hero h1 span{color:#a1a1aa}.hero p{max-width:650px;color:#8b8c93;font:17px/1.65 ui-sans-serif,system-ui,sans-serif}.hero-meta{border-left:1px solid #25262b;padding-left:18px;align-self:end}.hero-meta div{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #1b1c20;font-size:10px}.hero-meta strong{font-weight:500;color:#b8b8bd}.search{display:flex;min-height:60px;background:#111215;border:1px solid #303137;border-radius:10px;overflow:hidden}.search>span{padding:20px 16px;color:#55565e;border-right:1px solid #24252a;font-size:11px}.search input{min-width:0;flex:1;background:transparent;border:0;outline:0;color:#eee;padding:0 18px;font-size:15px}.search button{border:0;background:#e7e7e9;color:#0a0a0c;padding:0 23px;font-weight:700;font-size:12px}.hint{color:#5f6068;font-size:11px;padding:10px 2px 50px}.hint kbd{border:1px solid #303137;border-radius:4px;padding:3px 5px;color:#92939a;font-size:9px}.hint button{background:none;border:0;color:#92939a;padding:0}.results{border-top:1px solid #202126}.overview{display:grid;grid-template-columns:1fr 360px;gap:40px;padding:34px 0}.kicker{display:flex;align-items:center;gap:8px}.kicker i{width:7px;height:7px;border-radius:50%;background:#55565e}.kicker i.good{background:#a1a1aa}.kicker i.bad{background:#d4d4d8}.overview h3{font-size:25px;margin:13px 0 10px;letter-spacing:-.04em}.path{color:#777880;font-size:12px}.path b{color:#3f4046}.address{border-left:1px solid #24252a;padding-left:25px}.address code{display:block;color:#d6d6da;font-size:14px;margin-top:14px;word-break:break-all}.address strong{display:block;color:#999aa1;font-size:10px;margin-top:9px;letter-spacing:.08em}.target-banner{display:flex;align-items:center;gap:16px;padding:18px;border:1px solid #25262b;background:#101114;border-radius:9px}.target-banner.mainnet{border-color:#39393e}.target-icon{font-size:24px;color:#8b8c93}.target-banner div:nth-child(2){flex:1}.target-banner strong{display:block;margin-top:5px;font-size:13px}.target-banner code{color:#aaaab0;font-size:11px}.target-banner em{font-style:normal;font-size:9px;letter-spacing:.12em;color:#85868d;border:1px solid #33343a;padding:6px 8px;border-radius:4px}.fallback-note{display:flex;gap:15px;padding:15px 18px;border:1px solid #303137;border-top:0;background:#0d0e10;color:#999aa1;font-size:12px;line-height:1.55}.fallback-note b{white-space:nowrap;color:#c3c3c8;font-size:10px;letter-spacing:.1em}.stats{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #202126;border-radius:8px;margin:18px 0 65px}.stats div{padding:15px 17px;border-right:1px solid #202126}.stats div:last-child{border:0}.stats b{display:block;font-size:17px;margin-top:6px}.stats .issue{color:#c4c4c9}.section{margin:0 0 54px}.section-heading{display:flex;justify-content:space-between;align-items:end;margin-bottom:12px}.section h2{font-size:17px;margin:6px 0 0}.count{font-size:11px;color:#55565e}.trace-panel{border-top:1px solid #292a2f;border-bottom:1px solid #292a2f}.trace-row{border-bottom:1px solid #1d1e22}.trace-row:last-child{border:0}.trace-summary{width:100%;display:grid;grid-template-columns:35px 24px 1fr auto 22px;gap:8px;align-items:center;padding:13px 4px;background:none;border:0;color:#a9aab0;text-align:left}.trace-summary:disabled{cursor:default}.index{color:#4e4f56;font-size:10px}.status{font-size:13px}.label{font-size:13px}.state{font-size:9px;letter-spacing:.12em;color:#5d5e65}.success .status{color:#b5b5ba}.warning .status,.error .status{color:#d0d0d4}.info .status,.skipped .status{color:#777880}.details{padding:0 4px 15px 67px}.detail-value{position:relative;background:#0d0e10;border:1px solid #1e1f23;padding:12px}.detail-value span{display:block;color:#55565e;font-size:9px;letter-spacing:.12em;margin-bottom:7px}.detail-value code{display:block;color:#9fa0a7;font-size:11px;word-break:break-all;padding-right:55px}.detail-value button{position:absolute;right:8px;top:9px;background:none;border:1px solid #303137;color:#777880;font-size:8px;padding:5px}.details p{color:#777880;font-size:12px;line-height:1.55}.diagnostic{display:flex;gap:15px;align-items:flex-start;border:1px solid #303137;padding:18px;border-radius:8px}.diagnostic>b{font-size:18px}.diagnostic strong{font-size:14px}.diagnostic p{margin:6px 0 0;color:#777880;font:13px/1.5 ui-sans-serif,system-ui,sans-serif}.diagnostic>span{margin-left:auto;color:#777880;font-size:9px;letter-spacing:.12em}.diagnostic-detail{display:flex;gap:12px;padding:14px 3px;border-bottom:1px solid #1d1e22}.diagnostic-detail>div{flex:1}.diagnostic-detail b{color:#8b8c93}.diagnostic-detail strong{font-size:12px}.diagnostic-detail p{margin:5px 0 0;color:#777880;font-size:11px;line-height:1.5}.empty{position:relative;min-height:250px;border:1px dashed #292a2f;border-radius:9px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#66676f}.empty>b{font-size:28px;margin-bottom:12px}.empty strong{font-size:11px;letter-spacing:.14em}.empty p{font:13px ui-sans-serif,system-ui,sans-serif}.empty{background:linear-gradient(135deg,rgba(255,255,255,.015),transparent)}footer{display:flex;justify-content:space-between;color:#4e4f56;font-size:9px;letter-spacing:.1em;margin-top:45px}@media(max-width:760px){.shell{padding:18px 16px 50px}.hero{grid-template-columns:1fr;gap:28px;padding:50px 0 30px}.hero-meta{display:none}.overview{grid-template-columns:1fr;gap:25px}.address{border-left:0;border-top:1px solid #24252a;padding:18px 0 0}.stats{grid-template-columns:1fr 1fr}.stats div:nth-child(2){border-right:0}.stats div:nth-child(-n+2){border-bottom:1px solid #202126}.target-banner{align-items:flex-start;flex-wrap:wrap}.target-banner code{order:3}.target-banner em{margin-left:auto}.fallback-note{flex-direction:column;gap:6px}.trace-summary{grid-template-columns:28px 20px 1fr 20px}.state{display:none}footer{flex-direction:column;gap:8px}}
    `}</style>
  </main>;
}
