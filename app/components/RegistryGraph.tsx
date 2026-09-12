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

// Renders the ENSv2 registry traversal (root -> tld -> ... -> leaf label) as a
// horizontal tree, one node per label. This mirrors exactly the getResolver()
// / getSubregistry() calls the inspector already made — it's the same data,
// just laid out spatially instead of as a scrolling log, so a broken link in
// the chain (missing resolver, missing subregistry) is visible at a glance.
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
  );
}