"use client";

type RegistryPathNode = {
  label: string;
  fullName: string;
  registry: string;
  resolver?: string;
  hasResolver: boolean;
  isLeaf: boolean;
};

function short(value: string, left = 6, right = 4) {
  return value.length <= left + right + 1 ? value : `${value.slice(0, left)}…${value.slice(-right)}`;
}

<<<<<<< HEAD
<<<<<<< HEAD
function InspectorPanelStyles() {
  useEffect(() => {
    const id = "ensv2-panel-polish";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      /* Resolver / Resolution / Diagnostics visual layer */
      .section { margin-top: 46px; }
      .section-heading { margin-bottom: 16px !important; }
      .section-heading h2 { letter-spacing: -.045em; }
      .section-heading .count { min-width: 28px; height: 28px; display:inline-flex; align-items:center; justify-content:center; border-radius:9px; background:#171820; border:1px solid #2b2d38; color:#aeb1ff; font-size:10px; }

      .section:has(.section-heading h2:nth-child(1)) .trace-panel {
        border-radius:16px !important;
        border:1px solid #282b39 !important;
        overflow:hidden;
        background:linear-gradient(145deg,#11131a,#0d0f14) !important;
        box-shadow:0 18px 50px rgba(0,0,0,.18), inset 0 1px rgba(255,255,255,.025);
      }
      .section:nth-of-type(2) .trace-panel { border-color:#303050 !important; box-shadow:0 18px 50px rgba(80,75,180,.08); }
      .section:nth-of-type(3) .trace-panel { border-color:#263e4a !important; box-shadow:0 18px 50px rgba(50,170,210,.07); }

      .section:nth-of-type(2) .section-heading:before,
      .section:nth-of-type(3) .section-heading:before,
      .section:nth-of-type(4) .section-heading:before { content:""; width:8px; height:8px; border-radius:50%; margin-right:9px; align-self:center; }
      .section:nth-of-type(2) .section-heading:before { background:#8b7cff; box-shadow:0 0 18px rgba(139,124,255,.65); }
      .section:nth-of-type(3) .section-heading:before { background:#35c7e8; box-shadow:0 0 18px rgba(53,199,232,.55); }
      .section:nth-of-type(4) .section-heading:before { background:#ffb84d; box-shadow:0 0 18px rgba(255,184,77,.5); }
      .section:nth-of-type(2) .section-heading, .section:nth-of-type(3) .section-heading, .section:nth-of-type(4) .section-heading { display:flex; align-items:center; }

      .section:nth-of-type(2) .trace-row, .section:nth-of-type(3) .trace-row { background:rgba(255,255,255,.012) !important; border-bottom-color:#232631 !important; transition:background .18s ease, transform .18s ease; }
      .section:nth-of-type(2) .trace-row:hover { background:rgba(139,124,255,.075) !important; }
      .section:nth-of-type(3) .trace-row:hover { background:rgba(53,199,232,.065) !important; }
      .trace-summary { min-height:58px !important; }
      .trace-row .index { color:#5f6270 !important; }
      .section:nth-of-type(2) .trace-row .status { color:#a495ff !important; }
      .section:nth-of-type(3) .trace-row .status { color:#5bd7ef !important; }
      .trace-row .state { border-radius:999px !important; padding:4px 8px !important; font-size:9px !important; }
      .section:nth-of-type(2) .trace-row .state.success { color:#b6adff !important; background:rgba(139,124,255,.10) !important; border:1px solid rgba(139,124,255,.2); }
      .section:nth-of-type(3) .trace-row .state.success { color:#75def0 !important; background:rgba(53,199,232,.09) !important; border:1px solid rgba(53,199,232,.2); }
      .details { background:rgba(0,0,0,.18) !important; border-top:1px solid #252833 !important; padding:14px 18px !important; }
      .detail-value { border:1px solid #2a2d38 !important; border-radius:10px !important; background:#0b0d12 !important; }

      .diagnostic { border-radius:16px !important; padding:22px !important; position:relative; overflow:hidden; border:1px solid #2b3037 !important; background:linear-gradient(135deg,#12161a,#0d1013) !important; box-shadow:0 18px 50px rgba(0,0,0,.2); }
      .diagnostic:before { content:""; position:absolute; inset:0 auto 0 0; width:4px; background:#35d399; box-shadow:0 0 24px rgba(53,211,153,.35); }
      .diagnostic.ok { border-color:#23483e !important; background:linear-gradient(135deg,rgba(22,48,42,.78),#0e1314) !important; }
      .diagnostic.problem { border-color:#52372b !important; background:linear-gradient(135deg,rgba(55,35,25,.8),#12100f) !important; }
      .diagnostic.problem:before { background:#ff9f5b; box-shadow:0 0 24px rgba(255,159,91,.35); }
      .diagnostic > b { width:40px !important; height:40px !important; display:grid !important; place-items:center; border-radius:12px !important; background:rgba(53,211,153,.11); color:#57dfaa !important; font-size:20px !important; }
      .diagnostic.problem > b { background:rgba(255,159,91,.11); color:#ffad70 !important; }
      .diagnostic > div strong { font-size:14px !important; }
      .diagnostic > div p { color:#8e9299 !important; line-height:1.55 !important; }
      .diagnostic > span { border-radius:999px !important; padding:6px 10px !important; background:rgba(53,211,153,.10); color:#57dfaa !important; border:1px solid rgba(53,211,153,.2); font-size:9px !important; font-weight:700; }
      .diagnostic.problem > span { color:#ffad70 !important; background:rgba(255,159,91,.09); border-color:rgba(255,159,91,.2); }
      .diagnostic-detail { margin-top:10px !important; padding:14px 16px !important; border-radius:12px !important; border:1px solid #292c34 !important; background:#101216 !important; }
      .diagnostic-detail.error { border-color:#573238 !important; background:rgba(87,50,56,.16) !important; }
      .diagnostic-detail.warning { border-color:#59452f !important; background:rgba(89,69,47,.14) !important; }
      .diagnostic-detail b { width:28px !important; height:28px !important; display:grid !important; place-items:center; border-radius:8px !important; }
      .diagnostic-detail.error b { color:#ff7f91 !important; background:rgba(255,82,108,.1); }
      .diagnostic-detail.warning b { color:#ffc16b !important; background:rgba(255,184,77,.1); }
      .diagnostic-detail p { color:#898d95 !important; line-height:1.5; }
      @media (max-width:700px) { .section { margin-top:34px; } .diagnostic { padding:17px !important; } }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
  return null;
}

=======
=======
>>>>>>> 9689e5b868bd22d522a84ef1d4ad23a129977d12
// Renders the ENSv2 registry traversal (root -> tld -> ... -> leaf label) as a
// horizontal tree, one node per label. This mirrors exactly the getResolver()
// / getSubregistry() calls the inspector already made — it's the same data,
// just laid out spatially instead of as a scrolling log, so a broken link in
// the chain (missing resolver, missing subregistry) is visible at a glance.
<<<<<<< HEAD
>>>>>>> parent of 937f0f6 (Polish registry graph UI)
=======
>>>>>>> 9689e5b868bd22d522a84ef1d4ad23a129977d12
export function RegistryGraph({ path, rootRegistry }: { path: RegistryPathNode[]; rootRegistry?: string }) {
  if (!path.length) return null;

  const nodeWidth = 168;
  const nodeHeight = 64;
  const gap = 46;
  const padY = 30;
  const nodes = [{ label: "root", fullName: "ROOT_REGISTRY", registry: rootRegistry ?? "", hasResolver: false, isLeaf: false, isRoot: true }, ...path.map((p) => ({ ...p, isRoot: false }))];
  const width = nodes.length * nodeWidth + (nodes.length - 1) * gap + 24;
  const height = nodeHeight + padY * 2 + 34;
  const centerY = height / 2 - 17;

  return (
<<<<<<< HEAD
<<<<<<< HEAD
    <>
      <InspectorPanelStyles />
      <div className="registry-graph">
        <div className="graph-head"><div><span className="graph-eyebrow">TRAVERSAL MAP</span><strong>{nodes.length - 1} label{nodes.length - 1 === 1 ? "" : "s"} · root → leaf</strong></div><span className="graph-hint">scroll horizontally to inspect the full path</span></div>
        <div className="graph-viewport">
          <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="ENSv2 registry traversal">
            <defs><linearGradient id="edge-gradient" x1="0" x2="1"><stop offset="0%" stopColor="#3b3c43" /><stop offset="100%" stopColor="#71727a" /></linearGradient><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#66676f" /></marker></defs>
            {nodes.slice(1).map((_, i) => { const x1 = 16 + i * (nodeWidth + gap) + nodeWidth; const x2 = x1 + gap; const y = centerY + nodeHeight / 2; return <line key={`edge-${i}`} x1={x1} y1={y} x2={x2} y2={y} stroke="url(#edge-gradient)" strokeWidth={2} markerEnd="url(#arrow)" />; })}
            {nodes.map((n, i) => { const x = 16 + i * (nodeWidth + gap); const stroke = n.isRoot ? "#44454d" : n.hasResolver ? "#b5b5bc" : n.isLeaf ? "#76777f" : "#303137"; return <g key={n.fullName} transform={`translate(${x}, ${centerY})`}><rect width={nodeWidth} height={nodeHeight} rx={11} fill="#121317" stroke={stroke} strokeWidth={n.hasResolver ? 1.5 : 1} /><rect x={1} y={1} width={nodeWidth - 2} height={3} rx={2} fill={n.hasResolver ? "#a7a7ae" : n.isRoot ? "#505159" : "#292a30"} /><text x={14} y={25} fill="#ececef" fontSize={13} fontWeight="600" fontFamily="ui-monospace, SFMono-Regular, monospace">{n.isRoot ? "root" : n.label}</text><text x={14} y={43} fill="#686970" fontSize={9} fontFamily="ui-monospace, SFMono-Regular, monospace">REGISTRY</text><text x={64} y={43} fill="#a0a1a8" fontSize={9} fontFamily="ui-monospace, SFMono-Regular, monospace">{short(n.registry || "0x0…", 8, 5)}</text><text x={14} y={61} fill={n.hasResolver ? "#c2c2c7" : "#57585f"} fontSize={9} fontFamily="ui-monospace, SFMono-Regular, monospace">{n.hasResolver ? `resolver ${short(n.resolver ?? "", 7, 4)}` : n.isRoot ? "registry entrypoint" : "no resolver at label"}</text>{n.isLeaf && <circle cx={nodeWidth - 15} cy={16} r={4} fill={n.hasResolver ? "#c6c6cb" : "#777880"} />}</g>; })}
          </svg>
        </div>
        <div className="registry-graph-legend"><span><i className="dot dot-resolver" />resolver selected</span><span><i className="dot dot-leaf" />target label</span><span><i className="dot dot-empty" />traversal only</span></div>
        <style jsx>{` .registry-graph{margin:4px 0 18px;padding:18px 18px 14px;border:1px solid #24252b;border-radius:12px;background:linear-gradient(180deg,#111216 0%,#0e0f12 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.025)}.graph-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 2px 14px;border-bottom:1px solid #202127}.graph-head div{display:flex;align-items:baseline;gap:12px}.graph-eyebrow{color:#55565e;font-size:9px;letter-spacing:.16em}.graph-head strong{color:#bfc0c5;font-size:11px;font-weight:500}.graph-hint{color:#55565e;font-size:9px}.graph-viewport{overflow-x:auto;overflow-y:hidden;padding:14px 0 4px;scrollbar-width:thin}.graph-viewport svg{min-width:720px;display:block}.registry-graph-legend{display:flex;flex-wrap:wrap;gap:18px;padding:11px 2px 0;color:#686970;font-size:9px}.registry-graph-legend span{display:flex;align-items:center;gap:6px}.dot{width:7px;height:7px;border-radius:50%;display:inline-block}.dot-resolver{background:#b5b5bc;box-shadow:0 0 0 3px rgba(181,181,188,.08)}.dot-leaf{background:#777880}.dot-empty{background:#303137}@media(max-width:700px){.graph-head{align-items:flex-start;flex-direction:column;gap:5px}.graph-hint{display:none}.registry-graph{padding:14px 12px 12px}} `}</style>
      </div>
    </>
=======
    <div className="registry-graph">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="ENSv2 registry traversal">
        {nodes.slice(1).map((_, i) => {
          const x1 = 12 + i * (nodeWidth + gap) + nodeWidth;
          const x2 = x1 + gap;
          return (
            <line
              key={`edge-${i}`}
              x1={x1}
              y1={centerY + nodeHeight / 2}
              x2={x2}
              y2={centerY + nodeHeight / 2}
              stroke="#292a30"
              strokeWidth={1}
              markerEnd="url(#arrow)"
            />
          );
        })}
        <defs>
          <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill="#3f4046" />
          </marker>
        </defs>
        {nodes.map((n, i) => {
          const x = 12 + i * (nodeWidth + gap);
          const stroke = n.isRoot ? "#3f4046" : n.hasResolver ? "#a1a1aa" : n.isLeaf ? "#d0d0d5" : "#33343a";
          return (
            <g key={n.fullName} transform={`translate(${x}, ${centerY})`}>
              <rect
                width={nodeWidth}
                height={nodeHeight}
                rx={8}
                fill="#101114"
                stroke={stroke}
                strokeWidth={n.hasResolver ? 1.5 : 1}
              />
              <text x={12} y={22} fill="#d4d4d8" fontSize={12} fontFamily="ui-monospace, monospace">
                {n.isRoot ? "root" : n.label}
              </text>
              <text x={12} y={38} fill="#62636b" fontSize={9} fontFamily="ui-monospace, monospace">
                {short(n.registry || "0x0…", 8, 5)}
              </text>
              <text x={12} y={53} fill={n.hasResolver ? "#a1a1aa" : "#4d4e55"} fontSize={9} fontFamily="ui-monospace, monospace">
                {n.hasResolver ? `resolver ${short(n.resolver ?? "", 6, 4)}` : n.isRoot ? "" : "no resolver here"}
              </text>
              {n.isLeaf && (
                <circle cx={nodeWidth - 12} cy={12} r={4} fill={n.hasResolver ? "#a1a1aa" : "#d0d0d5"} />
              )}
            </g>
          );
        })}
      </svg>
      <div className="registry-graph-legend">
        <span><i className="dot dot-resolver" />resolver set at this label</span>
        <span><i className="dot dot-leaf" />leaf label (end of name)</span>
        <span><i className="dot dot-empty" />no resolver / no subregistry</span>
      </div>
=======
    <div className="registry-graph">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="ENSv2 registry traversal">
        {nodes.slice(1).map((_, i) => {
          const x1 = 12 + i * (nodeWidth + gap) + nodeWidth;
          const x2 = x1 + gap;
          return (
            <line
              key={`edge-${i}`}
              x1={x1}
              y1={centerY + nodeHeight / 2}
              x2={x2}
              y2={centerY + nodeHeight / 2}
              stroke="#292a30"
              strokeWidth={1}
              markerEnd="url(#arrow)"
            />
          );
        })}
        <defs>
          <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill="#3f4046" />
          </marker>
        </defs>
        {nodes.map((n, i) => {
          const x = 12 + i * (nodeWidth + gap);
          const stroke = n.isRoot ? "#3f4046" : n.hasResolver ? "#a1a1aa" : n.isLeaf ? "#d0d0d5" : "#33343a";
          return (
            <g key={n.fullName} transform={`translate(${x}, ${centerY})`}>
              <rect
                width={nodeWidth}
                height={nodeHeight}
                rx={8}
                fill="#101114"
                stroke={stroke}
                strokeWidth={n.hasResolver ? 1.5 : 1}
              />
              <text x={12} y={22} fill="#d4d4d8" fontSize={12} fontFamily="ui-monospace, monospace">
                {n.isRoot ? "root" : n.label}
              </text>
              <text x={12} y={38} fill="#62636b" fontSize={9} fontFamily="ui-monospace, monospace">
                {short(n.registry || "0x0…", 8, 5)}
              </text>
              <text x={12} y={53} fill={n.hasResolver ? "#a1a1aa" : "#4d4e55"} fontSize={9} fontFamily="ui-monospace, monospace">
                {n.hasResolver ? `resolver ${short(n.resolver ?? "", 6, 4)}` : n.isRoot ? "" : "no resolver here"}
              </text>
              {n.isLeaf && (
                <circle cx={nodeWidth - 12} cy={12} r={4} fill={n.hasResolver ? "#a1a1aa" : "#d0d0d5"} />
              )}
            </g>
          );
        })}
      </svg>
      <div className="registry-graph-legend">
        <span><i className="dot dot-resolver" />resolver set at this label</span>
        <span><i className="dot dot-leaf" />leaf label (end of name)</span>
        <span><i className="dot dot-empty" />no resolver / no subregistry</span>
      </div>
>>>>>>> 9689e5b868bd22d522a84ef1d4ad23a129977d12
      <style jsx>{`
        .registry-graph { overflow-x: auto; padding: 18px 0 6px; }
        .registry-graph-legend { display: flex; gap: 20px; margin-top: 12px; font-size: 10px; color: #777880; letter-spacing: 0.02em; }
        .registry-graph-legend span { display: flex; align-items: center; gap: 6px; }
        .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
        .dot-resolver { background: #a1a1aa; }
        .dot-leaf { background: #d0d0d5; }
        .dot-empty { background: #33343a; }
      `}</style>
    </div>
<<<<<<< HEAD
>>>>>>> parent of 937f0f6 (Polish registry graph UI)
=======
>>>>>>> 9689e5b868bd22d522a84ef1d4ad23a129977d12
  );
}