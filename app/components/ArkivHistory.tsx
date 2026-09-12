"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type HistoryEntry = {
  key: string;
  normalizedName: string;
  address?: string;
  resolver?: string;
  network?: string;
  mode?: string;
  createdAtBlock?: string;
  lastModifiedAtBlock?: string;
  transactionIndexInBlock?: string;
};

function short(value?: string, left = 10, right = 8) {
  if (!value) return "—";
  return value.length <= left + right + 1 ? value : `${value.slice(0, left)}…${value.slice(-right)}`;
}

export function ArkivHistory() {
  const [name, setName] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const sync = () => {
      const input = document.querySelector<HTMLInputElement>(".search input");
      setName(input?.value.trim() ?? "");
      setPortalTarget(document.querySelector<HTMLElement>(".results"));
    };

    sync();
    const interval = window.setInterval(sync, 500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!name) {
      setHistory([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/history?name=${encodeURIComponent(name)}&_=${Date.now()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Arkiv history unavailable");
        }

        setHistory(Array.isArray(data.history) ? data.history : []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [name]);

  if (!name || !portalTarget) return null;

  return createPortal(
    <section className="section arkiv-history">
      <div className="section-heading">
        <div>
          <div className="eyebrow">05 / history · Arkiv</div>
          <h2>Resolution history</h2>
        </div>
        <span className="count">
          {loading
            ? "QUERYING"
            : error
              ? "UNAVAILABLE"
              : `${history.length} SNAPSHOT${history.length === 1 ? "" : "S"}`}
        </span>
      </div>

      {error && <div className="arkiv-error">Arkiv query failed · {error}</div>}

      {!loading && !error && history.length === 0 && (
        <div className="arkiv-empty">
          <strong>No snapshots recorded yet.</strong>
          <span>Run an ENS inspection with Arkiv persistence enabled to create the first historical state.</span>
        </div>
      )}

      {history.length > 0 && (
        <div className="arkiv-timeline">
          {history.map((entry, index) => (
            <div className="arkiv-entry" key={entry.key}>
              <div className="arkiv-marker">
                <i />
                {index < history.length - 1 && <b />}
              </div>
              <div className="arkiv-entry-main">
                <div className="arkiv-entry-top">
                  <strong>{short(entry.address, 12, 10)}</strong>
                  <span>{entry.network ?? "unknown"} · {entry.mode ?? "unknown"}</span>
                </div>
                <div className="arkiv-entry-meta">
                  <span>BLOCK {entry.createdAtBlock ?? "—"}</span>
                  {entry.transactionIndexInBlock && (
                    <span>TX INDEX {entry.transactionIndexInBlock}</span>
                  )}
                  {entry.resolver && <span>RESOLVER {short(entry.resolver)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .arkiv-timeline{border-top:1px solid #292a2f;border-bottom:1px solid #292a2f}
        .arkiv-entry{display:grid;grid-template-columns:34px 1fr;min-height:70px}
        .arkiv-marker{position:relative;display:flex;justify-content:center;padding-top:22px}
        .arkiv-marker i{width:7px;height:7px;border:1px solid #b8b8bd;border-radius:50%;background:#08090b;z-index:1}
        .arkiv-marker b{position:absolute;top:29px;bottom:0;width:1px;background:#292a2f}
        .arkiv-entry-main{padding:15px 5px;border-bottom:1px solid #1d1e22}
        .arkiv-entry:last-child .arkiv-entry-main{border-bottom:0}
        .arkiv-entry-top{display:flex;justify-content:space-between;gap:20px;align-items:center}
        .arkiv-entry-top strong{font-size:13px;color:#d2d2d7;font-weight:500}
        .arkiv-entry-top span{font-size:9px;color:#66676f;letter-spacing:.08em}
        .arkiv-entry-meta{display:flex;flex-wrap:wrap;gap:14px;margin-top:8px;font-size:9px;color:#55565e;letter-spacing:.08em}
        .arkiv-empty{display:flex;flex-direction:column;gap:6px;padding:16px 15px;border:1px solid #292a2f;background:#0a0b0d}
        .arkiv-empty strong{font-size:11px;font-weight:500;color:#bfc0c5}
        .arkiv-empty span{font-size:10px;line-height:1.5;color:#5f6068}
        .arkiv-error{padding:13px 15px;border:1px solid #303137;color:#8b8c93;font-size:11px}
        @media(max-width:760px){.arkiv-entry-top{display:block}.arkiv-entry-top span{display:block;margin-top:5px}}
      `}</style>
    </section>,
    portalTarget,
  );
}
