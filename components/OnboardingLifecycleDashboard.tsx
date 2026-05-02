"use client";

import { useState } from "react";
import {
  Panel,
  StatusPill,
  TierDot,
  SectionHeader,
  formatCurrency,
} from "./ui";
import {
  bucketLabels,
  bucketShort,
  bucketBaseline,
  bucketMovement,
  csmByBucket,
  standupMetrics,
  subtaskVelocity,
  onboardingAccounts,
  handRaiseSignals,
  hypercareAccounts,
  onboardingSummary,
  mayWeeks,
  currentWeekIndex,
  type Bucket,
  type OnboardingAccount,
} from "@/lib/onboardingData";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid, ReferenceLine } from "recharts";
import { Calendar, AlertCircle, Hand, TrendingUp, Users } from "lucide-react";

const BUCKET_COLORS: Record<Bucket, string> = {
  B1: "#06B6D4", // hand-raised — cyan, attention-getting
  B2: "#94A3B8", // deferred — slate, dormant
  B3: "#6B9FE4", // pre-kickoff — pulse blue
  B4: "#F59E0B", // STUCK — amber, needs attention
  B5: "#2563EB", // mid-journey — protocol blue, biggest bucket
  B6: "#8B5CF6", // near-launch — purple, momentum
  B7: "#10B981", // launched — green, success
};

export default function OnboardingLifecycleDashboard() {
  const [selectedBucket, setSelectedBucket] = useState<Bucket | "all" | "hypercare">("all");
  const [selectedAcct, setSelectedAcct] = useState<OnboardingAccount | null>(onboardingAccounts[5]);

  const filtered = (() => {
    if (selectedBucket === "all") return onboardingAccounts;
    if (selectedBucket === "hypercare") return onboardingAccounts.filter(a => a.hypercare);
    return onboardingAccounts.filter(a => a.bucket === selectedBucket);
  })();

  const totalNet = onboardingSummary.netCompletionsThisWeek;
  const totalNetLast = onboardingSummary.netCompletionsLastWeek;
  const totalMay = onboardingSummary.netCompletionsTotalMay;

  return (
    <div className="tab-fade-in">
      <SectionHeader
        kicker="Onboarding Lifecycle · Weekly snapshot · ISO-2026-W18"
        title="Operation: GoLive — May 2026"
        sub="367 active onboardings across 7 buckets. Move every customer toward GoLive. Bucket assignment updated weekly by CSMs (Friday EOD); subtask completions tracked from Project records."
      />

      {/* Top KPI strip */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Panel className="!bg-gradient-to-br from-midnight to-navy-core text-white border-0">
          <div className="px-1">
            <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-pulse-blue mb-1.5">
              Net completions this week
            </div>
            <div className="font-display text-4xl font-medium tabular">
              {totalNet}
            </div>
            <div className="text-[11px] text-pulse-blue mt-1.5">
              vs. {totalNetLast} last wk · target W2: 36–45
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-text mb-1.5">
            May progress
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-medium tabular text-midnight">
              {totalMay}
            </span>
            <span className="text-sm text-muted-text">/ {onboardingSummary.monthTarget}</span>
          </div>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-sm overflow-hidden">
            <div
              className="h-full bg-protocol-blue rounded-sm"
              style={{ width: `${(totalMay / onboardingSummary.monthTarget) * 100}%` }}
            />
          </div>
          <div className="text-[11px] text-muted-text mt-1.5">
            {Math.round((totalMay / onboardingSummary.monthTarget) * 100)}% of month target
          </div>
        </Panel>

        <Panel>
          <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-text mb-1.5">
            Active book
          </div>
          <div className="font-display text-4xl font-medium tabular text-midnight">
            {onboardingSummary.totalActive}
          </div>
          <div className="text-[11px] text-muted-text mt-2">
            {onboardingSummary.pctActedTrailing14d}% acted in trailing 14d · target 70%
          </div>
        </Panel>

        <Panel>
          <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-text mb-1.5">
            Hypercare
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-medium tabular text-midnight">
              {onboardingSummary.hypercareTotal}
            </span>
            <span className="text-sm text-status-red">●</span>
          </div>
          <div className="text-[11px] text-muted-text mt-2">
            E:16 · J:6 · V:13 · escalation crosscut
          </div>
        </Panel>
      </div>

      {/* Standup metric — the headline of the Monday 9am MST */}
      <Panel
        title="The Standup Metric"
        subtitle="Net Review Training + Test Patients completions, trailing 7 days, per CSM. Reviewed Monday 9am MST."
        className="mb-6"
      >
        <div className="space-y-1">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-3 pb-2 border-b border-panel-border text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium">
            <div className="col-span-3">CSM</div>
            <div className="col-span-2 text-right">This week</div>
            <div className="col-span-2 text-right">Last week</div>
            <div className="col-span-2 text-right">W2 target</div>
            <div className="col-span-3 text-right">From bucket</div>
          </div>
          {standupMetrics.map(m => {
            const onTarget = m.thisWeek >= m.weekTarget;
            const closeToTarget = m.thisWeek >= m.weekTarget - 2;
            const color = onTarget ? "text-status-green" : closeToTarget ? "text-status-yellow" : "text-status-red";
            const dotColor = onTarget ? "bg-status-green" : closeToTarget ? "bg-status-yellow" : "bg-status-red";
            return (
              <div key={m.csm} className="grid grid-cols-12 gap-3 py-3 items-center border-b border-panel-border last:border-0">
                <div className="col-span-3 flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
                  <span className="text-sm font-medium text-midnight">{m.csm}</span>
                </div>
                <div className={`col-span-2 text-right font-display text-2xl font-medium tabular ${color}`}>
                  {m.thisWeek}
                </div>
                <div className="col-span-2 text-right font-mono tabular text-base text-muted-text">
                  {m.lastWeek}
                </div>
                <div className="col-span-2 text-right font-mono tabular text-sm text-muted-text">
                  {m.weekTarget}
                </div>
                <div className="col-span-3 flex items-center justify-end gap-3 text-[11px]">
                  <span className="text-muted-text">
                    B4: <span className="font-mono tabular text-midnight">{m.fromB4}</span>
                  </span>
                  <span className="text-muted-text">
                    B5: <span className="font-mono tabular text-midnight">{m.fromB5}</span>
                  </span>
                </div>
              </div>
            );
          })}
          {/* Team total row */}
          <div className="grid grid-cols-12 gap-3 pt-3 mt-2 border-t-2 border-midnight items-center">
            <div className="col-span-3 text-sm font-semibold text-midnight uppercase tracking-wider text-[11px]">
              Team total
            </div>
            <div className="col-span-2 text-right font-display text-2xl font-medium tabular text-midnight">
              {totalNet}
            </div>
            <div className="col-span-2 text-right font-mono tabular text-base text-muted-text">
              {totalNetLast}
            </div>
            <div className="col-span-2 text-right font-mono tabular text-sm text-muted-text">
              36–45
            </div>
            <div className="col-span-3 flex items-center justify-end gap-3 text-[11px]">
              <span className="text-muted-text">
                B4: <span className="font-mono tabular text-midnight font-medium">{standupMetrics.reduce((s, m) => s + m.fromB4, 0)}</span>
              </span>
              <span className="text-muted-text">
                B5: <span className="font-mono tabular text-midnight font-medium">{standupMetrics.reduce((s, m) => s + m.fromB5, 0)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* May calendar */}
        <div className="mt-5 pt-4 border-t border-panel-border">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-text font-medium mb-2.5">May Execution Calendar</div>
          <div className="grid grid-cols-4 gap-2">
            {mayWeeks.map((w, i) => (
              <div
                key={w.label}
                className={`p-3 rounded-sm border ${
                  i === currentWeekIndex
                    ? "border-protocol-blue bg-light-bg"
                    : i < currentWeekIndex
                    ? "border-panel-border bg-subtle opacity-70"
                    : "border-panel-border bg-white"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span className={`text-[11px] font-semibold ${i === currentWeekIndex ? "text-protocol-blue" : "text-midnight"}`}>
                    {w.label}
                  </span>
                  <span className="text-[10px] text-muted-text">{w.dates}</span>
                </div>
                <div className="text-[11px] text-dark-text mt-1 leading-snug">{w.focus}</div>
                <div className="text-[10px] font-mono tabular text-muted-text mt-1.5">
                  Target: {w.target.lo}–{w.target.hi}/CSM
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Bucket distribution + movement */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Panel
          title="Bucket Distribution"
          subtitle="Current snapshot · Friday EOD update"
          className="col-span-2"
        >
          <div className="space-y-2.5">
            {(["B1", "B2", "B3", "B4", "B5", "B6", "B7"] as Bucket[]).map(b => {
              const m = bucketMovement.find(x => x.bucket === b)!;
              const max = Math.max(...bucketMovement.map(x => x.thisWeek));
              const pct = (m.thisWeek / max) * 100;
              const delta = m.thisWeek - m.lastWeek;
              const baselineDelta = m.thisWeek - m.baseline;
              return (
                <div key={b}>
                  <div className="flex items-baseline justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-midnight w-6">{b}</span>
                      <span className="text-[12px] text-dark-text">{bucketLabels[b]}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-base font-medium tabular text-midnight w-7 text-right">
                        {m.thisWeek}
                      </span>
                      <span className={`text-[10px] font-mono tabular w-12 text-right ${
                        delta > 0 ? "text-status-green" : delta < 0 ? "text-status-red" : "text-muted-text"
                      }`}>
                        {delta > 0 ? "+" : ""}{delta} wk
                      </span>
                      <span className={`text-[10px] font-mono tabular w-12 text-right ${
                        baselineDelta > 0 ? "text-status-green" : baselineDelta < 0 ? "text-status-red" : "text-muted-text"
                      }`}>
                        {baselineDelta > 0 ? "+" : ""}{baselineDelta} bl
                      </span>
                    </div>
                  </div>
                  <div className="h-5 bg-slate-100 rounded-sm overflow-hidden">
                    <div
                      className="h-full rounded-sm transition-all"
                      style={{ width: `${pct}%`, background: BUCKET_COLORS[b] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-panel-border text-[11px] text-muted-text">
            <span className="font-medium text-midnight">wk</span> = change from last Friday. <span className="font-medium text-midnight">bl</span> = change from May 1 baseline. Movement out of B4/B5 is the operation's primary signal — parity landed late April and demo patients are seeded.
          </div>
        </Panel>

        <Panel title="Subtask Velocity" subtitle="May completions vs. targets">
          <div className="space-y-4">
            {subtaskVelocity.map(t => {
              const fromBaseline = t.current - t.baseline;
              const targetGap = t.target - t.current;
              const pct = (t.current / t.target) * 100;
              const isPrimary = t.task === "Review Training" || t.task === "Test Patients";
              return (
                <div key={t.task}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className={`text-[12px] ${isPrimary ? "font-semibold text-midnight" : "text-dark-text"}`}>
                      {t.task}
                      {isPrimary && <span className="ml-1.5 text-[9px] uppercase tracking-wider text-protocol-blue font-medium">primary</span>}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-[10px] text-muted-text mb-1">
                    <span>
                      Baseline <span className="font-mono tabular">{t.baseline}</span> →{" "}
                      <span className="font-mono tabular text-midnight font-medium">{t.current}</span>
                    </span>
                    <span>
                      Target <span className="font-mono tabular">{t.target}</span>
                      <span className="text-status-green ml-1">+{fromBaseline}</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-sm overflow-hidden relative">
                    <div className="absolute h-full bg-pulse-blue/40" style={{ width: `${(t.baseline / t.target) * 100}%` }} />
                    <div className="absolute h-full bg-protocol-blue rounded-sm" style={{ width: `${pct}%` }} />
                    <div className="absolute h-full border-r-2 border-dashed border-status-green" style={{ left: "100%" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* CSM × Bucket grid + Hand-raise signals */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Panel
          title="CSM × Bucket"
          subtitle="Live ownership across the active book"
          className="col-span-2"
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-subtle border-b border-panel-border">
                <tr className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium">
                  <th className="text-left px-4 py-2.5 font-medium">CSM</th>
                  {(["B1", "B2", "B3", "B4", "B5", "B6", "B7"] as Bucket[]).map(b => (
                    <th key={b} className="text-center px-2 py-2.5 font-medium">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-mono text-[11px]">{b}</span>
                        <span className="text-[9px] normal-case tracking-normal text-muted-text/70 font-normal">{bucketShort[b].split(" ")[0]}</span>
                      </div>
                    </th>
                  ))}
                  <th className="text-right px-4 py-2.5 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {csmByBucket.map(row => (
                  <tr key={row.csm} className="border-b border-panel-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-midnight">{row.csm}</div>
                    </td>
                    {(["B1", "B2", "B3", "B4", "B5", "B6", "B7"] as Bucket[]).map(b => {
                      const v = row[b];
                      const isHigh = v >= 30;
                      return (
                        <td key={b} className="text-center px-2 py-3">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-7 rounded-sm font-mono tabular text-sm ${
                              v === 0
                                ? "text-muted-text/50"
                                : isHigh
                                ? "bg-protocol-blue/10 text-protocol-blue font-semibold"
                                : "text-midnight"
                            }`}
                          >
                            {v}
                          </span>
                        </td>
                      );
                    })}
                    <td className="text-right px-4 py-3 font-display tabular text-base font-medium text-midnight">
                      {row.total}
                    </td>
                  </tr>
                ))}
                <tr className="bg-light-bg border-t-2 border-midnight">
                  <td className="px-4 py-3 text-[11px] uppercase tracking-wider font-semibold text-midnight">Team total</td>
                  {(["B1", "B2", "B3", "B4", "B5", "B6", "B7"] as Bucket[]).map(b => {
                    const total = csmByBucket.reduce((s, r) => s + r[b], 0);
                    return (
                      <td key={b} className="text-center px-2 py-3 font-mono tabular text-sm font-semibold text-midnight">
                        {total}
                      </td>
                    );
                  })}
                  <td className="text-right px-4 py-3 font-display text-lg font-semibold tabular text-midnight">
                    367
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Hand-Raise Signals" subtitle="B2 → B1 transitions in flight (trailing 7d)">
          <div className="space-y-3">
            {handRaiseSignals.map((s, i) => (
              <div key={i} className="border-b border-panel-border last:border-0 pb-3 last:pb-0">
                <div className="flex items-start gap-2">
                  <Hand size={13} className="text-cyan mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-midnight truncate">{s.account}</div>
                    <div className="text-[11px] text-protocol-blue mt-0.5">{s.signal}</div>
                    <div className="text-[10px] text-muted-text mt-0.5">
                      {s.firedDaysAgo}d ago · {s.csmOwner}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-panel-border text-[11px] text-muted-text">
            Pardot 'Hand Raise Path' sequence active. CSM action: schedule re-launch session within 5 days of signal.
          </div>
        </Panel>
      </div>

      {/* Account workbench */}
      <SectionHeader
        kicker="Account Workbench"
        title="Active onboarding accounts"
        sub="Filter by bucket. Click any account to see Project state, task completion, and next-blocking subtask."
      />

      {/* Bucket filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <FilterChip
          label="All"
          count={onboardingAccounts.length}
          active={selectedBucket === "all"}
          onClick={() => setSelectedBucket("all")}
        />
        <FilterChip
          label="Hypercare"
          count={hypercareAccounts.length}
          active={selectedBucket === "hypercare"}
          onClick={() => setSelectedBucket("hypercare")}
          color="#EF4444"
          icon={<AlertCircle size={11} />}
        />
        {(["B1", "B2", "B3", "B4", "B5", "B6", "B7"] as Bucket[]).map(b => (
          <FilterChip
            key={b}
            label={`${b} ${bucketShort[b]}`}
            count={onboardingAccounts.filter(a => a.bucket === b).length}
            active={selectedBucket === b}
            onClick={() => setSelectedBucket(b)}
            color={BUCKET_COLORS[b]}
          />
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7">
          <Panel
            title={selectedBucket === "all" ? "All accounts in mock dataset" : selectedBucket === "hypercare" ? "Hypercare accounts" : `${selectedBucket} — ${bucketLabels[selectedBucket]}`}
            subtitle={`${filtered.length} accounts shown · representative subset of ${onboardingSummary.totalActive} active`}
            noPadding
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-subtle border-b border-panel-border">
                  <tr className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium">
                    <th className="text-left px-4 py-2.5 font-medium">Account</th>
                    <th className="text-center px-2 py-2.5 font-medium">Bucket</th>
                    <th className="text-right px-2 py-2.5 font-medium">Progress</th>
                    <th className="text-left px-2 py-2.5 font-medium">Next blocking</th>
                    <th className="text-right px-2 py-2.5 font-medium">Days in bucket</th>
                    <th className="text-left px-2 py-2.5 font-medium">CSM</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => {
                    const pct = Math.round((a.tasksCompleted / a.tasksTotal) * 100);
                    return (
                      <tr
                        key={a.id}
                        onClick={() => setSelectedAcct(a)}
                        className={`cursor-pointer transition-colors border-b border-panel-border last:border-0 ${
                          selectedAcct?.id === a.id ? "bg-light-bg" : "hover:bg-subtle"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {a.hypercare && (
                              <AlertCircle size={12} className="text-status-red flex-shrink-0" />
                            )}
                            <div>
                              <div className="font-medium text-midnight">{a.accountName}</div>
                              <div className="text-[11px] text-muted-text mt-0.5">
                                {a.id} · {a.projectStage}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center px-2">
                          <span
                            className="inline-block px-1.5 py-0.5 rounded-sm font-mono text-[10px] font-semibold"
                            style={{
                              background: `${BUCKET_COLORS[a.bucket]}20`,
                              color: BUCKET_COLORS[a.bucket],
                            }}
                          >
                            {a.bucket}
                          </span>
                        </td>
                        <td className="text-right px-2">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                              <div className="h-full bg-protocol-blue rounded-sm" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-mono tabular text-[11px] text-midnight w-9 text-right">
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td className="text-left px-2 text-[11px] text-dark-text">
                          {a.nextBlockingTask || "—"}
                        </td>
                        <td className="text-right px-2 font-mono tabular text-[11px]">
                          <span className={a.daysInBucket > 30 ? "text-status-red" : a.daysInBucket > 14 ? "text-status-yellow" : "text-muted-text"}>
                            {a.daysInBucket}d
                          </span>
                        </td>
                        <td className="text-left px-2 text-[11px] text-muted-text">
                          {a.csmOwner.split(" ")[0]}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* Detail panel */}
        <div className="col-span-5">
          {selectedAcct && <AccountDetail account={selectedAcct} />}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
  color = "#2563EB",
  icon,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border text-[11px] font-medium transition-all ${
        active
          ? "text-white border-transparent shadow-sm"
          : "bg-white text-dark-text border-panel-border hover:border-protocol-blue"
      }`}
      style={active ? { background: color } : undefined}
    >
      {icon}
      <span>{label}</span>
      <span
        className={`px-1.5 py-0.5 rounded-sm text-[10px] font-mono tabular ${
          active ? "bg-white/20" : "bg-slate-100 text-muted-text"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function AccountDetail({ account: a }: { account: OnboardingAccount }) {
  const pct = Math.round((a.tasksCompleted / a.tasksTotal) * 100);
  return (
    <Panel title={a.accountName} subtitle={`${a.id} · ${a.csmOwner}`} noPadding>
      <div className="px-5 py-4 space-y-4">
        {/* Top: bucket + project stage + ARR */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block px-2 py-0.5 rounded-sm font-mono text-[11px] font-semibold"
                style={{ background: `${BUCKET_COLORS[a.bucket]}20`, color: BUCKET_COLORS[a.bucket] }}
              >
                {a.bucket} · {bucketShort[a.bucket]}
              </span>
              {a.hypercare && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-rose-50 text-status-red text-[10px] font-semibold uppercase tracking-wider">
                  <AlertCircle size={11} />
                  Hypercare
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-text mt-1.5">
              Project stage: <span className="text-dark-text font-medium">{a.projectStage}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-xl font-medium tabular text-midnight">
              {formatCurrency(a.arr, true)}
            </div>
            <div className="text-[10px] text-muted-text uppercase tracking-wider">ARR</div>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <div className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium">
              Onboarding Progress
            </div>
            <div className="font-mono tabular text-sm font-medium text-midnight">
              {a.tasksCompleted} / {a.tasksTotal} tasks ({pct}%)
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-sm overflow-hidden">
            <div className="h-full bg-protocol-blue rounded-sm" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Next blocking task */}
        {a.nextBlockingTask && (
          <div className="bg-light-bg border-l-2 border-protocol-blue px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.1em] text-protocol-blue font-medium">
              Next blocking task
            </div>
            <div className="text-sm text-midnight mt-0.5 font-medium">{a.nextBlockingTask}</div>
            <div className="text-[10px] text-muted-text mt-1">
              {a.daysInBucket} days in {a.bucket}
              {a.daysInBucket > 30 && (
                <span className="text-status-red ml-2">· extended stall</span>
              )}
            </div>
          </div>
        )}

        {/* Hand-raise readiness for B2 */}
        {a.bucket === "B2" && (
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="bg-subtle px-3 py-2.5 rounded-sm">
              <div className="text-[10px] uppercase tracking-wider text-muted-text">Migration Q'naire</div>
              <div className={`text-sm font-medium mt-1 ${a.questionnaireComplete ? "text-status-green" : "text-muted-text"}`}>
                {a.questionnaireComplete ? "✓ Complete" : "Not started"}
              </div>
            </div>
            <div className="bg-subtle px-3 py-2.5 rounded-sm">
              <div className="text-[10px] uppercase tracking-wider text-muted-text">Kickoff Requested</div>
              <div className={`text-sm font-medium mt-1 ${a.kickoffRequested ? "text-status-green" : "text-muted-text"}`}>
                {a.kickoffRequested ? "✓ Yes" : "No"}
              </div>
            </div>
          </div>
        )}

        {/* This week's standup contribution */}
        {(a.reviewTrainingCompletedThisWeek || a.testPatientsCompletedThisWeek) && (
          <div className="border-t border-panel-border pt-3">
            <div className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium mb-2">
              Standup metric contribution this week
            </div>
            <div className="flex flex-wrap gap-2">
              {a.reviewTrainingCompletedThisWeek && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-sm bg-emerald-50 text-status-green text-[11px] font-medium">
                  ✓ Review Training
                </span>
              )}
              {a.testPatientsCompletedThisWeek && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-sm bg-emerald-50 text-status-green text-[11px] font-medium">
                  ✓ Test Patients
                </span>
              )}
            </div>
          </div>
        )}

        {/* Key dates */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-panel-border text-[11px]">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-text">Account age</div>
            <div className="font-display text-base font-medium tabular text-midnight mt-0.5">{a.createdDaysAgo}d</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-text">Go-live target</div>
            <div className="font-display text-base font-medium tabular text-midnight mt-0.5">
              {a.goLiveDate || "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-text">Champion confirmed</div>
            <div className={`font-display text-base font-medium tabular mt-0.5 ${
              a.championLastConfirmed > 30 ? "text-status-yellow" : "text-midnight"
            }`}>
              {a.championLastConfirmed}d ago
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-text">Days in bucket</div>
            <div className={`font-display text-base font-medium tabular mt-0.5 ${
              a.daysInBucket > 30 ? "text-status-red" : a.daysInBucket > 14 ? "text-status-yellow" : "text-midnight"
            }`}>
              {a.daysInBucket}d
            </div>
          </div>
        </div>

        {/* Suggested action */}
        <div className="pt-3 border-t border-panel-border">
          <div className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium mb-2">
            Suggested action
          </div>
          <div className="text-xs text-dark-text leading-relaxed">{suggestedAction(a)}</div>
        </div>
      </div>
    </Panel>
  );
}

function suggestedAction(a: OnboardingAccount): string {
  if (a.bucket === "B1") {
    return "Hand-raised migration. Schedule 30-min re-launch session this week. Locked agenda: parity message + demo patients walk-through + lock champion + go-live date + 14-day check-in.";
  }
  if (a.bucket === "B2") {
    if (a.questionnaireComplete && !a.kickoffRequested) {
      return "Questionnaire complete. Pardot 'Hand Raise Path' sequence escalating. CSM watch for kickoff request.";
    }
    return "Deferred 1.0 customer. Pardot drip only. No direct CSM touch this month.";
  }
  if (a.bucket === "B3") {
    return "Pre-kickoff. Book 30-min kickoff this week. Locked agenda: champion concept + live walkthrough + Help Center + go-live date + 14-day check-in.";
  }
  if (a.bucket === "B4") {
    return "Post-kickoff STUCK. Book 30-min STUCK working session this week. Single deliverable: get team enrolled live in the call. Don't touch devices or labs.";
  }
  if (a.bucket === "B5") {
    if (a.nextBlockingTask === "Review Training") {
      return "Mid-journey unblock. 15-min targeted call. Lead with parity message — they were waiting on it. Screen-share Review Training with them, finish in the call.";
    }
    if (a.nextBlockingTask === "Test Patients") {
      return "Mid-journey unblock. Demo patients are seeded — point them to the existing demo patients rather than asking them to create test patients. They've already been done.";
    }
    return "Mid-journey unblock. 15-min targeted call. Solve the one blocking subtask in the call.";
  }
  if (a.bucket === "B6") {
    return "Near-launch — highest leverage CSM time of the month. Coordinate Patient Pilot, complete Internal Pilot, prep launch. A successful launch is worth 10 fresh kickoffs.";
  }
  if (a.bucket === "B7") {
    return "Launched. Hand off to standard CS motion. Mark Project Completed when stable.";
  }
  return "—";
}
