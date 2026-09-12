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

export function RegistryGraph({ path, rootRegistry }: { path: RegistryPathNode[]; rootRegistry?: string }) {
  if (!path.length) return null;

  const nodeWidth = 190;
  const nodeHeight = 82;
  const gap = 54;
  const padY = 34;
  const nodes = [
    { label: "root", fullName: "ROOT_REGISTRY", registry: rootRegistry ?? "", hasResolver: false, isLeaf: false, isRoot: true },
    ...path.map((p) => ({ ...p, isRoot: false })),
  ];
  const width = nodes.length * nodeWidth + (nodes.length - 1) * gap + 32;
  const height = nodeHeight + padY * 2 + 30;
  const centerY = padY + 15;

  return (
    <div className="registry-graph">
      <div className="graph-head">
        <div>
          <span className="graph-eyebrow">TRAVERSAL MAP</span>
          <strong>{nodes.length - 1} label{nodes.length - 1 === 1 ? "" : "s"} · root → leaf</strong>
        </div>
        <span className="graph-hint">scroll horizontally to inspect the full path</span>
      </div>
      <div className="graph-viewport">
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="ENSv2 registry traversal">
          <defs>
            <linearGradient id="edge-gradient" x1="0" x2="1">
              <stop offset="0%" stopColor="#3b3c43" />
              <stop offset="100%" stopColor="#71727a" />
            </linearGradient>
            <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#66676f" />
            </marker>
          </defs>
          {nodes.slice(1).map((_, i) => {
            const x1 = 16 + i * (nodeWidth + gap) + nodeWidth;
            const x2 = x1 + gap;
            const y = centerY + nodeHeight / 2;
            return <line key={`edge-${i}`} x1={x1} y1={y} x2={x2} y2={y} stroke="url(#edge-gradient)" strokeWidth={2} markerEnd="url(#arrow)" />;
          })}
          {nodes.map((n, i) => {
            const x = 16 + i * (nodeWidth + gap);
            const stroke = n.isRoot ? "#44454d" : n.hasResolver ? "#b5b5bc" : n.isLeaf ? "#76777f" : "#303137";
            return (
              <g key={n.fullName} transform={`translate(${x}, ${centerY})`}>
                <rect width={nodeWidth} height={nodeHeight} rx={11} fill="#121317" stroke={stroke} strokeWidth={n.hasResolver ? 1.5 : 1} />
                <rect x={1} y={1} width={nodeWidth - 2} height={3} rx={2} fill={n.hasResolver ? "#a7a7ae" : n.isRoot ? "#505159" : "#292a30"} />
                <text x={14} y={25} fill="#ececef" fontSize={13} fontWeight="600" fontFamily="ui-monospace, SFMono-Regular, monospace">{n.isRoot ? "root" : n.label}</text>
                <text x={14} y={43} fill="#686970" fontSize={9} fontFamily="ui-monospace, SFMono-Regular, monospace">REGISTRY</text>
                <text x={64} y={43} fill="#a0a1a8" fontSize={9} fontFamily="ui-monospace, SFMono-Regular, monospace">{short(n.registry || "0x0…", 8, 5)}</text>
                <text x={14} y={61} fill={n.hasResolver ? "#c2c2c7" : "#57585f"} fontSize={9} fontFamily="ui-monospace, SFMono-Regular, monospace">
                  {n.hasResolver ? `resolver ${short(n.resolver ?? "", 7, 4)}` : n.isRoot ? "registry entrypoint" : "no resolver at label"}
                </text>
                {n.isLeaf && <circle cx={nodeWidth - 15} cy={16} r={4} fill={n.hasResolver ? "#c6c6cb" : "#777880"} />}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="registry-graph-legend">
        <span><i className="dot dot-resolver" />resolver selected</span>
        <span><i className="dot dot-leaf" />target label</span>
        <span><i className="dot dot-empty" />traversal only</span>
      </div>
      <style jsx>{`
        .registry-graph { margin: 4px 0 18px; padding: 18px 18px 14px; border: 1px solid #24252b; border-radius: 12px; background: linear-gradient(180deg,#111216 0%,#0e0f12 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,.025); }
        .graph-head { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:0 2px 14px; border-bottom:1px solid #202127; }
        .graph-head div { display:flex; align-items:baseline; gap:12px; }
        .graph-eyebrow { color:#55565e; font-size:9px; letter-spacing:.16em; }
        .graph-head strong { color:#bfc0c5; font-size:11px; font-weight:500; }
        .graph-hint { color:#55565e; font-size:9px; }
        .graph-viewport { overflow-x:auto; overflow-y:hidden; padding:14px 0 4px; scrollbar-width:thin; }
        .graph-viewport svg { min-width:720px; display:block; }
        .registry-graph-legend { display:flex; flex-wrap:wrap; gap:18px; padding:11px 2px 0; color:#686970; font-size:9px; }
        .registry-graph-legend span { display:flex; align-items:center; gap:6px; }
        .dot { width:7px; height:7px; border-radius:50%; display:inline-block; }
        .dot-resolver { background:#b5b5bc; box-shadow:0 0 0 3px rgba(181,181,188,.08); }
        .dot-leaf { background:#777880; }
        .dot-empty { background:#303137; }
        @media (max-width:700px) { .graph-head { align-items:flex-start; flex-direction:column; gap:5px; } .graph-hint { display:none; } .registry-graph { padding:14px 12px 12px; } }
      `}</style>
    </div>
  );
}
