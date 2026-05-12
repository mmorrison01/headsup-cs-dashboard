"use client";

import { useState, useEffect, useMemo } from "react";
import { Panel, SectionHeader, formatCurrency } from "./ui";

type Bucket = "B1" | "B2" | "B3" | "B4" | "B5" | "B6" | "B7";

const BUCKET_COLORS: Record<string, string> = {
  B1: "#06B6D4",
  B2: "#94A3B8",
  B3: "#6B9FE4",
  B4: "#F59E0B",
  B5: "#2563EB",
  B6: "#8B5CF6",
  B7: "#10B981",
};

const BUCKET_LABELS: Record<string, string> = {
  B1: "Hand-Raised Migration",
  B2: "Deferred Migration",
  B3: "Pre-Kickoff Active",
  B4: "Post-Kickoff STUCK",
  B5: "Mid-Journey Working",
  B6: "Near-Launch",
  B7: "Launched",
};

const BUCKET_SHORT: Record<string, string> = {
  B1: "Hand-Raised",
  B2: "Deferred",
  B3: "Pre-Kickoff",
  B4: "STUCK",
  B5: "Mid-Journey",
  B6: "Near-Launch",
  B7: "Launched",
};

const MAY_WEEKS = [
  { label: "W1", dates: "May 5–9", focus: "Launch momentum — early movers", target: { lo: 25, hi: 30 } },
  { label: "W2", dates: "May 12–16", focus: "B4/B5 unblock — biggest batch", target: { lo: 38, hi: 43 } },
  { label: "W3", dates: "May 19–23", focus: "Near-launch push — B6 to B7", target: { lo: 43, hi: 49 } },
  { label: "W4", dates: "May 26–30", focus: "Close the month — no accounts left behind", target: { lo: 30, hi: 35 } },
];

interface ApiAccount {
  id: string;
  accountName: string;
  bucket: string;
  arr: number;
  goLiveDate: string | null;
  daysInBucket: number | null;
  customerTemperature: string | null;
  parallel10: boolean;
  csmName: string | null;
  rtDone: boolean;
  tpDone: boolean;
  projectId: string | null;
  projectHealth: string | null;
  solutionsConsultant: string | null;
  servicePackage: string | null;
  projectType: string | null;
  hypercareDri: string | null;
  accountStatus: string | null;
  executiveProgramStatus: string | null;
}

interface Task {
  id: string;
  subject: string;
  status: string;
  lastModified: string;
}

interface CsmRow {
  csm: string;
  B1: number; B2: number; B3: number; B4: number; B5: number; B6: number; B7: number;
  total: number;
}

interface StandupRow {
  csm: string;
  thisWeek: number;
  lastWeek: number;
  weekTarget: string;
  totalMay: number;
  monthTarget: number;
  fromB4: number;
  fromB5: number;
}

interface ApiData {
  updatedAt: string;
  currentWeekNum: number;
  weekTargets: Record<number, string>;
  baseline: Record<string, number>;
  bucketCounts: Record<string, number>;
  totalActive: number;
  csmByBucket: CsmRow[];
  standupMetrics: StandupRow[];
  bothDoneMetric: {
    mayTarget: number;
    baseline: number;
    newlyBothDone: number;
    teamRtOnly: number;
    teamTpOnly: number;
    byCsm: Array<{ csm: string; newlyBothDone: number; both: number; rtOnly: number; tpOnly: number; target: number }>;
  };
  weeklyCompletions: {
    thisWeek: Record<string, number>;
    lastWeek: Record<string, number>;
    mayTotals: Record<string, number>;
  };
  secondaryMetric: {
    bothDoneTotal: number;
    activeTotal: number;
    pct: number;
    goal: number;
  };
  accounts: ApiAccount[];
}

const MONTH_TARGET = 147;

export default function OnboardingLifecycleDashboard() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<string>("all");
  const [selectedCsm, setSelectedCsm] = useState<string>("all");
  const [selectedSearch, setSelectedSearch] = useState<string>("");
  const [taskFilter, setTaskFilter] = useState<"all" | "needs-rt" | "needs-tp">("all");
  const [selectedAcct, setSelectedAcct] = useState<ApiAccount | null>(null);
  const [localAccounts, setLocalAccounts] = useState<ApiAccount[]>([]);

  async function fetchData() {
    try {
      const res = await fetch("/api/onboarding");
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json: ApiData = await res.json();
      setData(json);
      setLocalAccounts(json.accounts);
      setError(null);
      setSelectedAcct(prev => {
        if (prev) {
          const fresh = json.accounts.find(a => a.id === prev.id);
          return fresh ?? prev;
        }
        return json.accounts[0] ?? null;
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleBucketChange(accountId: string, newBucket: string) {
    setLocalAccounts(prev => prev.map(a => a.id === accountId ? { ...a, bucket: newBucket } : a));
    setSelectedAcct(prev => prev?.id === accountId ? { ...prev, bucket: newBucket } : prev);
  }

  function handleFieldChange(accountId: string, field: keyof ApiAccount, value: string | null) {
    setLocalAccounts(prev => prev.map(a => a.id === accountId ? { ...a, [field]: value } : a));
    setSelectedAcct(prev => prev?.id === accountId ? { ...prev, [field]: value } : prev);
  }

  const availableCsms = useMemo(() => {
    const set = new Set<string>();
    localAccounts.forEach(a => { if (a.csmName) set.add(a.csmName); });
    return Array.from(set).sort();
  }, [localAccounts]);

  if (loading) {
    return (
      <div className="tab-fade-in flex items-center justify-center py-32">
        <div className="text-center">
          <div className="font-display text-2xl font-medium text-midnight mb-2">Loading…</div>
          <div className="text-sm text-muted-text">Pulling live data from Salesforce</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="tab-fade-in py-8">
        <div className="bg-rose-50 border border-rose-200 rounded-sm px-4 py-3 text-sm text-status-red">
          Unable to load Salesforce data. {error}
        </div>
      </div>
    );
  }

  const totalNet = Object.values(data.weeklyCompletions.thisWeek).reduce((s, v) => s + v, 0);
  const totalNetLast = Object.values(data.weeklyCompletions.lastWeek).reduce((s, v) => s + v, 0);
  const totalMay = Object.values(data.weeklyCompletions.mayTotals).reduce((s, v) => s + v, 0);
  const currentWeekIndex = Math.max(0, data.currentWeekNum - 1);

  const filtered = localAccounts.filter(a => {
    const bucketMatch = selectedBucket === "all" || a.bucket === selectedBucket;
    const csmMatch = selectedCsm === "all" || a.csmName === selectedCsm;
    const searchMatch = !selectedSearch || a.accountName.toLowerCase().includes(selectedSearch.toLowerCase());
    const taskMatch = taskFilter === "all" || (taskFilter === "needs-rt" && !a.rtDone && a.tpDone) || (taskFilter === "needs-tp" && a.rtDone && !a.tpDone);
    return bucketMatch && csmMatch && searchMatch && taskMatch;
  });

  const updatedLabel = new Date(data.updatedAt).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });

  return (
    <div className="tab-fade-in">
      <div className="flex items-start justify-between mb-6">
        <SectionHeader
          kicker="Onboarding Lifecycle · Operation GoLive · May 2026"
          title="Active Onboarding — Live View"
          sub={`Active Projects across 7 buckets. Live Salesforce data, auto-refreshes every 5 minutes.`}
        />
        <div className="text-[11px] text-muted-text mt-1 flex-shrink-0 text-right">
          <span>Updated {updatedLabel}</span>
          <button onClick={fetchData} className="ml-3 text-protocol-blue hover:underline">
            Refresh
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Panel className="!bg-gradient-to-br from-midnight to-navy-core text-white border-0">
          <div className="px-1">
            <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-pulse-blue mb-1.5">
              Both done this week
            </div>
            <div className="font-display text-4xl font-medium tabular">{totalNet}</div>
            <div className="text-[11px] text-pulse-blue mt-1.5">
              vs. {totalNetLast} last wk · target W{data.currentWeekNum}: {data.weekTargets[data.currentWeekNum] ?? "--"}
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-text mb-1.5">
            May progress
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-medium tabular text-midnight">{totalMay}</span>
            <span className="text-sm text-muted-text">/ {MONTH_TARGET}</span>
          </div>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-sm overflow-hidden">
            <div
              className="h-full bg-protocol-blue rounded-sm"
              style={{ width: `${Math.min(100, (totalMay / MONTH_TARGET) * 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-muted-text mt-1.5">
            {Math.round((totalMay / MONTH_TARGET) * 100)}% of month target
          </div>
        </Panel>

        <Panel>
          <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-text mb-1.5">
            Active book
          </div>
          <div className="font-display text-4xl font-medium tabular text-midnight">{data.secondaryMetric.activeTotal}</div>
          <div className="text-[11px] text-muted-text mt-2">
            Stage: Onboard · Hypercare · Approved
          </div>
        </Panel>

        <Panel>
          <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-text mb-1.5">
            Both done rate (14d)
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-medium tabular text-midnight">{data.secondaryMetric.pct}%</span>
            <span className="text-sm text-muted-text">/ {data.secondaryMetric.goal}%</span>
          </div>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-sm overflow-hidden">
            <div
              className="h-full bg-protocol-blue rounded-sm"
              style={{ width: `${Math.min(100, (data.secondaryMetric.pct / data.secondaryMetric.goal) * 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-muted-text mt-1.5">
            {data.secondaryMetric.bothDoneTotal}/{data.secondaryMetric.activeTotal} active accounts both done
          </div>
        </Panel>
      </div>

      {/* Standup metric */}
      <Panel
        title="The Standup Metric"
        subtitle="Accounts newly both done (RT + TP complete) this week, per CSM."
        className="mb-6"
      >
        <div className="space-y-1">
          <div className="grid grid-cols-12 gap-3 pb-2 border-b border-panel-border text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium">
            <div className="col-span-3">CSM</div>
            <div className="col-span-2 text-right">This week</div>
            <div className="col-span-2 text-right">Last week</div>
            <div className="col-span-2 text-right">Target</div>
            <div className="col-span-2 text-right">May total</div>
            <div className="col-span-1 text-right">Mo. target</div>
          </div>

          {data.standupMetrics.map(m => {
            const targetLo = parseInt((m.weekTarget ?? "0").split("-")[0]) || 0;
            const onTarget = m.thisWeek >= targetLo;
            const close = m.thisWeek >= targetLo - 2;
            const color = onTarget ? "text-status-green" : close ? "text-status-yellow" : "text-status-red";
            const dot = onTarget ? "bg-status-green" : close ? "bg-status-yellow" : "bg-status-red";
            return (
              <div key={m.csm} className="grid grid-cols-12 gap-3 py-3 items-center border-b border-panel-border last:border-0">
                <div className="col-span-3 flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="text-sm font-medium text-midnight">{m.csm}</span>
                </div>
                <div className={`col-span-2 text-right font-display text-2xl font-medium tabular ${color}`}>{m.thisWeek}</div>
                <div className="col-span-2 text-right font-mono tabular text-base text-muted-text">{m.lastWeek}</div>
                <div className="col-span-2 text-right font-mono tabular text-sm text-muted-text">{m.weekTarget}</div>
                <div className="col-span-2 text-right font-mono tabular text-sm text-midnight">{m.totalMay}</div>
                <div className="col-span-1 text-right font-mono tabular text-sm text-muted-text">{m.monthTarget}</div>
              </div>
            );
          })}

          <div className="grid grid-cols-12 gap-3 pt-3 mt-2 border-t-2 border-midnight items-center">
            <div className="col-span-3 text-[11px] uppercase tracking-wider font-semibold text-midnight">Team total</div>
            <div className="col-span-2 text-right font-display text-2xl font-medium tabular text-midnight">{totalNet}</div>
            <div className="col-span-2 text-right font-mono tabular text-base text-muted-text">{totalNetLast}</div>
            <div className="col-span-2 text-right font-mono tabular text-sm text-muted-text">{data.weekTargets[data.currentWeekNum] ?? "--"}</div>
            <div className="col-span-2 text-right font-mono tabular text-sm text-midnight font-semibold">{totalMay}</div>
            <div className="col-span-1 text-right font-mono tabular text-sm text-muted-text">{MONTH_TARGET}</div>
          </div>
        </div>

        {/* May calendar */}
        <div className="mt-5 pt-4 border-t border-panel-border">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-text font-medium mb-2.5">
            May Execution Calendar
          </div>
          <div className="grid grid-cols-4 gap-2">
            {MAY_WEEKS.map((w, i) => (
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
                  Target: {w.target.lo}–{w.target.hi} team
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Bucket distribution + Subtask velocity */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Panel
          title="Bucket Distribution"
          subtitle="Current vs. May 1 baseline"
          className="col-span-2"
        >
          <div className="space-y-2.5">
            {(["B1", "B2", "B3", "B4", "B5", "B6", "B7"] as Bucket[]).map(b => {
              const current = data.bucketCounts[b] ?? 0;
              const baseline = data.baseline[b] ?? 0;
              const max = Math.max(1, ...(["B1","B2","B3","B4","B5","B6","B7"] as Bucket[]).map(x => data.bucketCounts[x] ?? 0));
              const pct = (current / max) * 100;
              const delta = current - baseline;
              return (
                <div key={b}>
                  <div className="flex items-baseline justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-midnight w-6">{b}</span>
                      <span className="text-[12px] text-dark-text">{BUCKET_LABELS[b]}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-base font-medium tabular text-midnight w-7 text-right">{current}</span>
                      <span className="text-[10px] font-mono tabular w-16 text-right text-muted-text">bl: {baseline}</span>
                      <span className={`text-[10px] font-mono tabular w-12 text-right ${
                        delta > 0 ? "text-status-green" : delta < 0 ? "text-status-red" : "text-muted-text"
                      }`}>
                        {delta > 0 ? "+" : ""}{delta}
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
            <span className="font-medium text-midnight">bl</span> = May 1 baseline. Movement out of B4/B5 into B6/B7 is the operation&apos;s primary signal.
          </div>
        </Panel>

        <Panel title="Both Done" subtitle={`Goal: ${data.bothDoneMetric.mayTarget} total (70% of ${data.secondaryMetric.activeTotal} active) by May 30`}>
          <div className="space-y-4">
            {/* Team cumulative progress toward 255 */}
            <div>
              <div className="flex items-baseline justify-between text-[11px] mb-1">
                <span className="font-semibold text-midnight">
                  <span className="text-[18px] font-bold">{data.bothDoneMetric.baseline}</span>
                  <span className="text-muted-text ml-1">/ {data.bothDoneMetric.mayTarget} · +{data.bothDoneMetric.newlyBothDone} in May</span>
                </span>
                <span className="text-muted-text">{Math.round((data.bothDoneMetric.baseline / data.bothDoneMetric.mayTarget) * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-sm overflow-hidden">
                <div className="h-full bg-protocol-blue rounded-sm transition-all" style={{ width: `${Math.min(100, (data.bothDoneMetric.baseline / data.bothDoneMetric.mayTarget) * 100)}%` }} />
              </div>
            </div>
            {/* Quick wins — clickable to filter the accounts table below */}
            <div className="flex gap-3 text-[10px]">
              <button
                onClick={() => setTaskFilter(taskFilter === "needs-rt" ? "all" : "needs-rt")}
                className={`border rounded px-2 py-0.5 font-medium transition-colors cursor-pointer ${taskFilter === "needs-rt" ? "bg-amber-200 text-amber-900 border-amber-400" : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"}`}
              >
                {data.bothDoneMetric.teamRtOnly} need RT only
              </button>
              <button
                onClick={() => setTaskFilter(taskFilter === "needs-tp" ? "all" : "needs-tp")}
                className={`border rounded px-2 py-0.5 font-medium transition-colors cursor-pointer ${taskFilter === "needs-tp" ? "bg-blue-200 text-blue-900 border-blue-400" : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"}`}
              >
                {data.bothDoneMetric.teamTpOnly} need TP only
              </button>
            </div>
            {/* Per-CSM rows */}
            <div className="space-y-2.5">
              {data.bothDoneMetric.byCsm.map(row => {
                const pct = Math.min(100, (row.both / Math.max(1, row.target)) * 100);
                return (
                  <div key={row.csm}>
                    <div className="flex items-baseline justify-between text-[10px] mb-0.5">
                      <span className="font-medium text-midnight">{row.csm.split(" ")[0]}</span>
                      <span className="text-muted-text font-mono tabular">
                        {row.both}/{row.target}
                        {row.rtOnly > 0 && <span className="ml-1.5 text-amber-600">{row.rtOnly} need RT</span>}
                        {row.tpOnly > 0 && <span className="ml-1.5 text-blue-600">{row.tpOnly} need TP</span>}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                      <div className="h-full bg-protocol-blue/70 rounded-sm" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>

      {/* CSM × Bucket grid */}
      <div className="mb-6">
        <Panel title="CSM × Bucket" subtitle="Live ownership across the active book" noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-subtle border-b border-panel-border">
                <tr className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium">
                  <th className="text-left px-4 py-2.5 font-medium">CSM</th>
                  {(["B1", "B2", "B3", "B4", "B5", "B6", "B7"] as Bucket[]).map(b => (
                    <th key={b} className="text-center px-2 py-2.5 font-medium">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-mono text-[11px]">{b}</span>
                        <span className="text-[9px] normal-case tracking-normal text-muted-text/70 font-normal">
                          {BUCKET_SHORT[b].split(" ")[0]}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="text-right px-4 py-2.5 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.csmByBucket.map(row => (
                  <tr key={row.csm} className="border-b border-panel-border last:border-0">
                    <td className="px-4 py-3 text-sm font-medium text-midnight">{row.csm}</td>
                    {(["B1", "B2", "B3", "B4", "B5", "B6", "B7"] as Bucket[]).map(b => {
                      const v = row[b];
                      return (
                        <td key={b} className="text-center px-2 py-3">
                          <span className={`inline-flex items-center justify-center w-8 h-7 rounded-sm font-mono tabular text-sm ${
                            v === 0 ? "text-muted-text/50" : v >= 30 ? "bg-protocol-blue/10 text-protocol-blue font-semibold" : "text-midnight"
                          }`}>
                            {v}
                          </span>
                        </td>
                      );
                    })}
                    <td className="text-right px-4 py-3 font-display tabular text-base font-medium text-midnight">{row.total}</td>
                  </tr>
                ))}
                <tr className="bg-light-bg border-t-2 border-midnight">
                  <td className="px-4 py-3 text-[11px] uppercase tracking-wider font-semibold text-midnight">Team total</td>
                  {(["B1", "B2", "B3", "B4", "B5", "B6", "B7"] as Bucket[]).map(b => (
                    <td key={b} className="text-center px-2 py-3 font-mono tabular text-sm font-semibold text-midnight">
                      {data.csmByBucket.reduce((s, r) => s + (r[b] ?? 0), 0)}
                    </td>
                  ))}
                  <td className="text-right px-4 py-3 font-display text-lg font-semibold tabular text-midnight">
                    {data.totalActive}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Account workbench */}
      <SectionHeader
        kicker="Account Workbench"
        title="Active onboarding accounts"
        sub="Filter by bucket or CSM. Click an account to view details and update status. Changes write directly to Salesforce."
      />

      {/* Bucket filters */}
      <div className="flex flex-wrap gap-2 mb-2">
        <FilterChip label="All buckets" count={localAccounts.filter(a => selectedCsm === "all" || a.csmName === selectedCsm).length} active={selectedBucket === "all"} onClick={() => setSelectedBucket("all")} />
        {(["B1", "B2", "B3", "B4", "B5", "B6", "B7"] as Bucket[]).map(b => (
          <FilterChip
            key={b}
            label={`${b} ${BUCKET_SHORT[b]}`}
            count={localAccounts.filter(a => a.bucket === b && (selectedCsm === "all" || a.csmName === selectedCsm)).length}
            active={selectedBucket === b}
            onClick={() => setSelectedBucket(b)}
            color={BUCKET_COLORS[b]}
          />
        ))}
      </div>

      {/* CSM filters */}
      {availableCsms.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <FilterChip label="All CSMs" count={0} active={selectedCsm === "all"} onClick={() => setSelectedCsm("all")} showCount={false} color="#475569" />
          {availableCsms.map(csm => (
            <FilterChip
              key={csm}
              label={csm}
              count={localAccounts.filter(a => a.csmName === csm && (selectedBucket === "all" || a.bucket === selectedBucket)).length}
              active={selectedCsm === csm}
              onClick={() => setSelectedCsm(csm)}
              color="#475569"
            />
          ))}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search accounts…"
          value={selectedSearch}
          onChange={e => setSelectedSearch(e.target.value)}
          className="w-full max-w-xs text-[12px] border border-panel-border rounded-sm px-3 py-1.5 bg-white text-dark-text placeholder:text-muted-text/60 focus:outline-none focus:border-protocol-blue"
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7">
          <Panel
            title={selectedBucket === "all" ? "All accounts" : `${selectedBucket} — ${BUCKET_LABELS[selectedBucket] ?? ""}`}
            subtitle={`${filtered.length} accounts`}
            noPadding
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-subtle border-b border-panel-border">
                  <tr className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium">
                    <th className="text-left px-4 py-2.5 font-medium">Account</th>
                    <th className="text-center px-2 py-2.5 font-medium">Bucket</th>
                    <th className="text-right px-2 py-2.5 font-medium">ARR</th>
                    <th className="text-right px-2 py-2.5 font-medium">Go-Live</th>
                    <th className="text-right px-2 py-2.5 font-medium">Days</th>
                    <th className="text-left px-2 py-2.5 font-medium">Temp</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedAcct(a)}
                      className={`cursor-pointer transition-colors border-b border-panel-border last:border-0 ${
                        selectedAcct?.id === a.id ? "bg-light-bg" : "hover:bg-subtle"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-midnight">{a.accountName}</div>
                        <div className="text-[10px] text-muted-text mt-0.5">
                          {a.csmName ?? "Unassigned"}
                          {a.parallel10 && <span className="ml-2 text-protocol-blue">· Parallel 1.0</span>}
                        </div>
                      </td>
                      <td className="text-center px-2">
                        <span
                          className="inline-block px-1.5 py-0.5 rounded-sm font-mono text-[10px] font-semibold"
                          style={{
                            background: `${BUCKET_COLORS[a.bucket] ?? "#94A3B8"}20`,
                            color: BUCKET_COLORS[a.bucket] ?? "#94A3B8",
                          }}
                        >
                          {a.bucket}
                        </span>
                      </td>
                      <td className="text-right px-2 font-mono tabular text-[11px] text-midnight">
                        {a.arr > 0 ? formatCurrency(a.arr, true) : "—"}
                      </td>
                      <td className="text-right px-2 font-mono tabular text-[11px] text-muted-text">
                        {a.goLiveDate
                          ? new Date(a.goLiveDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : "—"}
                      </td>
                      <td className="text-right px-2 font-mono tabular text-[11px]">
                        {a.daysInBucket !== null ? (
                          <span className={
                            a.daysInBucket > 30 ? "text-status-red"
                              : a.daysInBucket > 14 ? "text-status-yellow"
                              : "text-muted-text"
                          }>
                            {a.daysInBucket}d
                          </span>
                        ) : "—"}
                      </td>
                      <td className="text-left px-2 text-[11px]">
                        <TempBadge temp={a.customerTemperature} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="col-span-5">
          {selectedAcct && (
            <AccountDetail
              account={selectedAcct}
              onBucketChange={handleBucketChange}
              onFieldChange={handleFieldChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TempBadge({ temp }: { temp: string | null }) {
  if (!temp) return <span className="text-muted-text">—</span>;
  const cls = temp === "Green" ? "text-status-green" : temp === "Red" ? "text-status-red" : temp === "Yellow" ? "text-status-yellow" : "text-muted-text";
  return <span className={cls}>{temp}</span>;
}

function FilterChip({
  label, count, active, onClick, color = "#2563EB", showCount = true,
}: {
  label: string; count: number; active: boolean; onClick: () => void; color?: string; showCount?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border text-[11px] font-medium transition-all ${
        active ? "text-white border-transparent shadow-sm" : "bg-white text-dark-text border-panel-border hover:border-protocol-blue"
      }`}
      style={active ? { background: color } : undefined}
    >
      <span>{label}</span>
      {showCount && (
        <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-mono tabular ${
          active ? "bg-white/20" : "bg-slate-100 text-muted-text"
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

function AccountDetail({
  account: a,
  onBucketChange,
  onFieldChange,
}: {
  account: ApiAccount;
  onBucketChange: (accountId: string, newBucket: string) => void;
  onFieldChange: (accountId: string, field: keyof ApiAccount, value: string | null) => void;
}) {
  const [savingBucket, setSavingBucket] = useState(false);
  const [fieldSaving, setFieldSaving] = useState<Set<string>>(new Set());
  const [feed, setFeed] = useState<{ id: string; type: "chatter" | "note"; author: string; date: string; title: string | null; body: string }[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  useEffect(() => {
    setFeed([]);
    setLoadingFeed(true);
    fetch(`/api/onboarding/notes?accountId=${a.id}`)
      .then(r => r.json())
      .then(d => setFeed(d.feed ?? []))
      .catch(() => {})
      .finally(() => setLoadingFeed(false));
  }, [a.id]);

  async function handleBucketSelect(newBucket: string) {
    if (newBucket === a.bucket) return;
    setSavingBucket(true);
    onBucketChange(a.id, newBucket);
    try {
      await fetch("/api/onboarding/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "bucket", accountId: a.id, bucket: newBucket }),
      });
    } finally {
      setSavingBucket(false);
    }
  }

  async function handleProjectField(field: "Customer_Temperature__c" | "Project_Health__c", value: string) {
    if (!a.projectId) return;
    const localKey = field === "Customer_Temperature__c" ? "customerTemperature" : "projectHealth";
    const prev = a[localKey as keyof ApiAccount];
    onFieldChange(a.id, localKey as keyof ApiAccount, value || null);
    setFieldSaving(s => new Set(s).add(field));
    try {
      const res = await fetch("/api/onboarding/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "projectField", projectId: a.projectId, field, value }),
      });
      if (!res.ok) onFieldChange(a.id, localKey as keyof ApiAccount, prev as string | null);
    } catch {
      onFieldChange(a.id, localKey as keyof ApiAccount, prev as string | null);
    } finally {
      setFieldSaving(s => { const n = new Set(s); n.delete(field); return n; });
    }
  }

  async function handleAccountField(field: "Executive_Program_Status__c", value: string) {
    const localKey = "executiveProgramStatus";
    const prev = a.executiveProgramStatus;
    onFieldChange(a.id, localKey, value || null);
    setFieldSaving(s => new Set(s).add(field));
    try {
      const res = await fetch("/api/onboarding/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "accountField", accountId: a.id, field, value }),
      });
      if (!res.ok) onFieldChange(a.id, localKey, prev);
    } catch {
      onFieldChange(a.id, localKey, prev);
    } finally {
      setFieldSaving(s => { const n = new Set(s); n.delete(field); return n; });
    }
  }

  const execStatusColor = (v: string | null) =>
    v === "On Track" ? "text-status-green" : v === "At Risk" ? "text-status-yellow" : v === "Needs Attention" ? "text-status-red" : v === "Churned" ? "text-status-red" : "text-muted-text";

  const healthColor = (v: string | null) =>
    v === "On Track" ? "text-status-green" : v === "At Risk" ? "text-status-yellow" : (v === "Critical" || v === "Blocked") ? "text-status-red" : "text-muted-text";

  return (
    <Panel
      title={a.accountName}
      subtitle={a.csmName ?? "CSM unassigned"}
      noPadding
    >
      <div className="px-5 py-4 space-y-4">
        {/* Suggested action — top of card */}
        <div className="p-3 rounded-sm bg-light-bg border border-panel-border">
          <div className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium mb-1.5">
            Suggested action
          </div>
          <div className="text-xs text-dark-text leading-relaxed">{SUGGESTED_ACTIONS[a.bucket] ?? "—"}</div>
        </div>

        {/* Bucket selector + ARR */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-text mb-1">Bucket</div>
            <select
              value={a.bucket}
              onChange={e => handleBucketSelect(e.target.value)}
              disabled={savingBucket}
              className="w-full text-[12px] border border-panel-border rounded-sm px-2 py-1.5 bg-white text-dark-text focus:outline-none focus:border-protocol-blue disabled:opacity-50 disabled:cursor-wait"
            >
              {(["B1", "B2", "B3", "B4", "B5", "B6", "B7"] as Bucket[]).map(b => (
                <option key={b} value={b}>{b} — {BUCKET_LABELS[b]}</option>
              ))}
            </select>
            {savingBucket && (
              <div className="text-[10px] text-protocol-blue mt-1">Saving to Salesforce…</div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-display text-xl font-medium tabular text-midnight">{formatCurrency(a.arr, true)}</div>
            <div className="text-[10px] text-muted-text uppercase tracking-wider">ARR</div>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-text">Go-live target</div>
            <div className="font-display text-base font-medium tabular text-midnight mt-0.5">
              {a.goLiveDate
                ? new Date(a.goLiveDate).toLocaleDateString("en-US", { month: "long", day: "numeric" })
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-text">Days in bucket</div>
            <div className={`font-display text-base font-medium tabular mt-0.5 ${
              (a.daysInBucket ?? 0) > 30 ? "text-status-red"
                : (a.daysInBucket ?? 0) > 14 ? "text-status-yellow"
                : "text-midnight"
            }`}>
              {a.daysInBucket !== null ? `${a.daysInBucket}d` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-text mb-1">Customer health</div>
            <select
              value={a.customerTemperature ?? ""}
              onChange={e => handleProjectField("Customer_Temperature__c", e.target.value)}
              disabled={fieldSaving.has("Customer_Temperature__c") || !a.projectId}
              className="w-full text-[12px] border border-panel-border rounded-sm px-2 py-1 bg-white text-dark-text focus:outline-none focus:border-protocol-blue disabled:opacity-50 disabled:cursor-wait"
            >
              <option value="">— Select —</option>
              <option value="Healthy">Healthy</option>
              <option value="Watch">Watch</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-text mb-1">Project health</div>
            <select
              value={a.projectHealth ?? ""}
              onChange={e => handleProjectField("Project_Health__c", e.target.value)}
              disabled={fieldSaving.has("Project_Health__c") || !a.projectId}
              className="w-full text-[12px] border border-panel-border rounded-sm px-2 py-1 bg-white text-dark-text focus:outline-none focus:border-protocol-blue disabled:opacity-50 disabled:cursor-wait"
            >
              <option value="">— Select —</option>
              <option value="On Track">On Track</option>
              <option value="At Risk">At Risk</option>
              <option value="Critical">Critical</option>
              <option value="Blocked">Blocked</option>
            </select>
          </div>
        </div>

        {/* Project & account details */}
        <div className="pt-3 border-t border-panel-border">
          <div className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium mb-2.5">Account Details</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-text">Solutions Consultant</div>
              <div className="text-[12px] font-medium text-dark-text mt-0.5">{a.solutionsConsultant ?? "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-text">Hypercare DRI</div>
              <div className="text-[12px] font-medium text-dark-text mt-0.5">{a.hypercareDri ?? "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-text">Service Package</div>
              <div className="text-[12px] font-medium text-dark-text mt-0.5">{a.servicePackage ?? "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-text">Project Type</div>
              <div className="text-[12px] font-medium text-dark-text mt-0.5">{a.projectType ?? "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-text">Account Status</div>
              <div className="text-[12px] font-medium text-dark-text mt-0.5">{a.accountStatus ?? "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-text mb-1">Exec Program Status</div>
              <select
                value={a.executiveProgramStatus ?? ""}
                onChange={e => handleAccountField("Executive_Program_Status__c", e.target.value)}
                disabled={fieldSaving.has("Executive_Program_Status__c")}
                className={`w-full text-[12px] border border-panel-border rounded-sm px-2 py-1 bg-white focus:outline-none focus:border-protocol-blue disabled:opacity-50 disabled:cursor-wait ${execStatusColor(a.executiveProgramStatus)}`}
              >
                <option value="">— Select —</option>
                <option value="On Track">Green - Healthy</option>
                <option value="At Risk">Yellow - At Risk</option>
                <option value="Needs Attention">Red - Critical</option>
                <option value="Churned">Churned Account</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notes & Chatter */}
        <div className="mt-4 border-t border-panel-border pt-4">
          <div className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium mb-2.5">Notes &amp; Chatter</div>
          {loadingFeed ? (
            <div className="text-[11px] text-muted-text py-2">Loading…</div>
          ) : feed.length === 0 ? (
            <div className="text-[11px] text-muted-text py-2">No notes or chatter found.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {feed.map((item: { id: string; type: "chatter" | "note"; author: string; date: string; title: string | null; body: string }) => (
                <div key={item.id} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-sm ${item.type === "chatter" ? "bg-blue-50 text-protocol-blue" : "bg-gray-100 text-muted-text"}`}>
                      {item.type === "chatter" ? "Chatter" : "Note"}
                    </span>
                    <span className="text-[11px] font-medium text-dark-text">{item.author}</span>
                    <span className="text-[10px] text-muted-text ml-auto">{new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  {item.title && (
                    <div className="text-[11px] font-semibold text-dark-text">{item.title}</div>
                  )}
                  <div className="text-[11px] text-dark-text leading-snug whitespace-pre-wrap">{item.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Panel>
  );
}

const SUGGESTED_ACTIONS: Record<string, string> = {
  B1: "Hand-raised migration. Schedule 30-min re-launch session this week. Locked agenda: parity message + demo patients walk-through + lock champion + go-live date + 14-day check-in.",
  B2: "Deferred 1.0 customer. Pardot drip only. No direct CSM touch this month.",
  B3: "Pre-kickoff. Book 30-min kickoff this week. Locked agenda: champion concept + live walkthrough + Help Center + go-live date + 14-day check-in.",
  B4: "Post-kickoff STUCK. Book 30-min STUCK working session this week. Single deliverable: get team enrolled live in the call. Don't touch devices or labs.",
  B5: "Mid-journey unblock. 15-min targeted call. Demo patients are seeded — point them to existing demo patients. Solve the one blocking subtask in the call.",
  B6: "Near-launch — highest leverage CSM time of the month. Coordinate Patient Pilot, complete Internal Pilot, prep launch. A successful launch is worth 10 fresh kickoffs.",
  B7: "Launched. Hand off to standard CS motion. Mark Project Completed when stable.",
};
