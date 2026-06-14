import { useEffect, useState } from "react";
import type { NetWorth, NetWorthHistoryPoint } from "@fo/shared";
import { api } from "../lib/api";

const fmt = (n: number) =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

function Sparkline({ data }: { data: NetWorthHistoryPoint[] }) {
  const W = 600;
  const H = 220;
  const PX = 48;
  const PY = 24;
  const plotW = W - PX * 2;
  const plotH = H - PY * 2;

  const values = data.map((d) => d.netWorth);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const x = (i: number) => PX + (i / (data.length - 1 || 1)) * plotW;
  const y = (v: number) => PY + plotH - ((v - min) / range) * plotH;

  const points = data.map((d, i) => `${x(i)},${y(d.netWorth)}`).join(" ");

  const ticks = 5;
  const step = range / (ticks - 1 || 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxHeight: 260 }}>
      {Array.from({ length: ticks }, (_, i) => {
        const v = min + step * i;
        const yy = y(v);
        return (
          <g key={i}>
            <line
              x1={PX}
              y1={yy}
              x2={W - PX}
              y2={yy}
              stroke="var(--border, #e5e7eb)"
              strokeWidth={1}
            />
            <text
              x={PX - 6}
              y={yy}
              textAnchor="end"
              dominantBaseline="middle"
              fill="var(--muted, #9ca3af)"
              fontSize={11}
            >
              {fmt(v)}
            </text>
          </g>
        );
      })}
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent, #3b82f6)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((d, i) => (
        <circle key={d.date} cx={x(i)} cy={y(d.netWorth)} r={3} fill="var(--accent, #3b82f6)" />
      ))}
      {data.length > 0 && (
        <>
          <text
            x={PX}
            y={H - 4}
            fill="var(--muted, #9ca3af)"
            fontSize={11}
          >
            {data[0].date}
          </text>
          <text
            x={W - PX}
            y={H - 4}
            textAnchor="end"
            fill="var(--muted, #9ca3af)"
            fontSize={11}
          >
            {data[data.length - 1].date}
          </text>
        </>
      )}
    </svg>
  );
}

export default function Dashboard() {
  const [nw, setNw] = useState<NetWorth | null>(null);
  const [history, setHistory] = useState<NetWorthHistoryPoint[]>([]);

  useEffect(() => {
    api.get<NetWorth>("/accounts/net-worth").then(setNw).catch(() => {});
    api
      .get<NetWorthHistoryPoint[]>("/accounts/net-worth/history")
      .then(setHistory)
      .catch(() => {});
  }, []);

  return (
    <>
      <h1>Dashboard</h1>
      <div className="grid">
        <div className="card">
          <div className="label">Net worth</div>
          <div className="stat">{nw ? fmt(nw.netWorth) : "\u2014"}</div>
        </div>
        <div className="card">
          <div className="label">Assets</div>
          <div className="stat pos">{nw ? fmt(nw.assets) : "\u2014"}</div>
        </div>
        <div className="card">
          <div className="label">Liabilities</div>
          <div className="stat neg">{nw ? fmt(nw.liabilities) : "\u2014"}</div>
        </div>
      </div>
      {history.length > 1 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="label" style={{ marginBottom: 12 }}>
            Net worth over time
          </div>
          <Sparkline data={history} />
        </div>
      )}
    </>
  );
}