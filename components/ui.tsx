import React from "react";

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
  noPadding = false,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div className={`bg-panel-bg border border-panel-border rounded-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-baseline justify-between border-b border-panel-border px-5 py-3">
          <div>
            {title && (
              <h3 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-midnight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[11px] text-muted-text mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "px-5 py-4"}>{children}</div>
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  size = "md",
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number;
  deltaLabel?: string;
  size?: "sm" | "md" | "lg";
}) {
  const valueClass =
    size === "lg" ? "text-4xl" : size === "sm" ? "text-xl" : "text-3xl";

  const deltaPositive = delta !== undefined && delta > 0;
  const deltaNegative = delta !== undefined && delta < 0;

  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-text mb-1.5">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-display font-medium tabular text-midnight ${valueClass}`}>
          {value}
        </span>
        {unit && <span className="text-sm text-muted-text">{unit}</span>}
      </div>
      {delta !== undefined && (
        <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
          <span
            className={`font-mono font-medium tabular ${
              deltaPositive
                ? "text-status-green"
                : deltaNegative
                ? "text-status-red"
                : "text-muted-text"
            }`}
          >
            {deltaPositive ? "▲" : deltaNegative ? "▼" : "—"} {Math.abs(delta)}
            {typeof delta === "number" && Math.abs(delta) < 100 && deltaLabel?.includes("%") ? "%" : ""}
          </span>
          {deltaLabel && (
            <span className="text-muted-text">{deltaLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function StatusPill({ tier, size = "md" }: { tier: "Green" | "Yellow" | "Red"; size?: "sm" | "md" }) {
  const colors = {
    Green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Yellow: "bg-amber-50 text-amber-700 border-amber-200",
    Red: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const dotColors = {
    Green: "bg-status-green",
    Yellow: "bg-status-yellow",
    Red: "bg-status-red",
  };
  const sizing = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-0.5";
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${sizing} font-medium rounded-sm border ${colors[tier]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[tier]}`}></span>
      {tier}
    </span>
  );
}

// Tiny inline sparkline
export function Sparkline({
  data,
  color = "#2563EB",
  height = 28,
  width = 80,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data
    .map((v, i) => `${i * stepX},${height - ((v - min) / range) * height}`)
    .join(" ");

  const lastIdx = data.length - 1;
  const lastX = lastIdx * stepX;
  const lastY = height - ((data[lastIdx] - min) / range) * height;

  return (
    <svg width={width} height={height} className="spark inline-block">
      <polyline points={points} fill="none" stroke={color} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  );
}

// Mini bar — for component score breakdown
export function MiniBar({ value, max = 100, color = "#2563EB", width = 60 }: { value: number; max?: number; color?: string; width?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="inline-flex items-center gap-2">
      <div className="bg-slate-100 rounded-sm overflow-hidden" style={{ width, height: 6 }}>
        <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-mono tabular text-muted-text w-7 text-right">{value}</span>
    </div>
  );
}

export function SectionHeader({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div className="mb-5">
      {kicker && (
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-protocol-blue mb-1.5">
          {kicker}
        </div>
      )}
      <h2 className="font-display text-[28px] font-medium text-midnight leading-tight tracking-tight">{title}</h2>
      {sub && <p className="text-sm text-muted-text mt-1.5 max-w-3xl">{sub}</p>}
    </div>
  );
}

// Tier dot — for use in dense tables
export function TierDot({ tier }: { tier: "Green" | "Yellow" | "Red" }) {
  const colors = {
    Green: "bg-status-green",
    Yellow: "bg-status-yellow",
    Red: "bg-status-red",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[tier]}`}></span>;
}

export function formatCurrency(n: number, compact = false): string {
  if (compact) {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  }
  return `$${n.toLocaleString("en-US")}`;
}
