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
  stage: string | null;
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
  totalMonth: number;
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
  eligibleBase: number;
  csmEligibleCounts: Record<string, number>;
  bothDoneMetric: {
    slaTarget: number;
    baseline: number;
    newlyBothDone: number;
    teamRtOnly: number;
    teamTpOnly: number;
    byCsm: Array<{ csm: string; newlyBothDone: number; both: number; rtOnly: number; tpOnly: number; eligible: number; target: number }>;
  };
  weeklyCompletions: {
    thisWeek: Record<string, number>;
    lastWeek: Record<string, number>;
    monthTotals: Record<string, number>;
  };
  secondaryMetric: {
    bothDoneTotal: number;
    activeTotal: number;
    eligibleTotal: number;
    pct: number;
    goal: number;
  };
  accounts: ApiAccount[];
}

// SLA target is dynamic (90% of eligible base), computed from live data in slaData memo

export default function OnboardingLifecycleDashboard() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<string>("all");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [selectedCsm, setSelectedCsm] = useState<string>("all");
  const [selectedSearch, setSelectedSearch] = useState<string>("");
  const [taskFilter, setTaskFilter] = useState<"all" | "both-done" | "one-away" | "needs-rt" | "needs-tp" | "neither-done">("all");
  const [hypercareOnly, setHypercareOnly] = useState<boolean>(false);
  const [selectedSc, setSelectedSc] = useState<string>("all");
  const [selectedCustomerHealth, setSelectedCustomerHealth] = useState<string>("all");
  const [selectedProjectHealth, setSelectedProjectHealth] = useState<string>("all");
  const [selectedProjectType, setSelectedProjectType] = useState<string>("all");
  const [selectedExecStatus, setSelectedExecStatus] = useState<string>("all");
  const [sortKey, setSortKey] = useState<"accountName" | "bucket" | "arr" | "goLiveDate" | "daysInBucket" | "customerTemperature">("accountName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }
  const [selectedAcct, setSelectedAcct] = useState<ApiAccount | null>(null);
  const [localAccounts, setLocalAccounts] = useState<ApiAccount[]>([]);

  async function fetchData(manual = false) {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch("/api/onboarding", { cache: "no-store" });
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
      setRefreshing(false);
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

  const availableScs = useMemo(() => {
    const set = new Set<string>();
    localAccounts.forEach(a => { if (a.solutionsConsultant) set.add(a.solutionsConsultant); });
    return Array.from(set).sort();
  }, [localAccounts]);

  const availableCustomerHealth = useMemo(() => {
    const set = new Set<string>();
    localAccounts.forEach(a => { if (a.customerTemperature) set.add(a.customerTemperature); });
    return Array.from(set).sort();
  }, [localAccounts]);

  const availableProjectHealth = useMemo(() => {
    const set = new Set<string>();
    localAccounts.forEach(a => { if (a.projectHealth) set.add(a.projectHealth); });
    return Array.from(set).sort();
  }, [localAccounts]);

  const availableProjectTypes = useMemo(() => {
    const set = new Set<string>();
    localAccounts.forEach(a => { if (a.projectType) set.add(a.projectType); });
    return Array.from(set).sort();
  }, [localAccounts]);

  const availableExecStatuses = useMemo(() => {
    const set = new Set<string>();
    localAccounts.forEach(a => { if (a.executiveProgramStatus) set.add(a.executiveProgramStatus); });
    return Array.from(set).sort();
  }, [localAccounts]);

  const hypercareCount = useMemo(() => {
    return localAccounts.filter(a => !!a.hypercareDri).length;
  }, [localAccounts]);

  const slaData = useMemo(() => {
    const ELIGIBLE = new Set(["B3", "B4", "B5", "B6", "B7"]);
    const eligible = localAccounts.filter(a => ELIGIBLE.has(a.bucket));
    const eligibleCount = eligible.length;
    const bothDone = eligible.filter(a => a.rtDone && a.tpDone).length;
    const slaTarget = Math.round(eligibleCount * 0.90);
    const gap = Math.max(0, slaTarget - bothDone);
    const eligiblePct = eligibleCount > 0 ? Math.round(100 * bothDone / eligibleCount) : 0;

    // Per-bucket breakdown
    const bucketKeys = ["B3", "B4", "B5", "B6", "B7"];
    const byBucket = bucketKeys.map(bk => {
      const accts = localAccounts.filter(a => a.bucket === bk);
      const bd = accts.filter(a => a.rtDone && a.tpDone).length;
      const oa = accts.filter(a => (a.rtDone ? 1 : 0) + (a.tpDone ? 1 : 0) === 1).length;
      return {
        bucket: bk,
        total: accts.length,
        bothDone: bd,
        oneAway: oa,
        pct: accts.length > 0 ? Math.round(100 * bd / accts.length) : 0,
      };
    });

    // Per-CSM breakdown
    const csms = ["Elaine Peters", "Jillian Ramos", "Varsha Yaddala"];
    const byCsm = csms.map(csm => {
      const accts = eligible.filter(a => a.csmName === csm);
      const bd = accts.filter(a => a.rtDone && a.tpDone).length;
      const target = Math.round(accts.length * 0.90);
      return {
        csm,
        eligible: accts.length,
        bothDone: bd,
        pct: accts.length > 0 ? Math.round(100 * bd / accts.length) : 0,
        gap: Math.max(0, target - bd),
        target,
      };
    });

    // One-away accounts (exactly one of RT/TP done) in B3-B6, sorted B6 first
    const oneAway = localAccounts
      .filter(a => ELIGIBLE.has(a.bucket) && a.bucket !== "B7")
      .filter(a => (a.rtDone ? 1 : 0) + (a.tpDone ? 1 : 0) === 1)
      .sort((a, b) => {
        const order = ["B6", "B5", "B4", "B3"];
        return order.indexOf(a.bucket) - order.indexOf(b.bucket);
      });

    return { eligibleCount, bothDone, slaTarget, gap, eligiblePct, byBucket, byCsm, oneAway };
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
  const totalMonth = Object.values(data.weeklyCompletions.monthTotals).reduce((s, v) => s + v, 0);

  const filtered = localAccounts.filter(a => {
    const bucketMatch = selectedBucket === "all" || a.bucket === selectedBucket;
    const stageMatch = selectedStage === "all" || a.stage === selectedStage;
    const csmMatch = selectedCsm === "all" || a.csmName === selectedCsm;
    const searchMatch = !selectedSearch || a.accountName.toLowerCase().includes(selectedSearch.toLowerCase());
    const taskMatch =
      taskFilter === "all" ||
      (taskFilter === "both-done" && a.rtDone && a.tpDone) ||
      (taskFilter === "one-away" && (a.rtDone ? 1 : 0) + (a.tpDone ? 1 : 0) === 1) ||
      (taskFilter === "needs-rt" && !a.rtDone && a.tpDone) ||
      (taskFilter === "needs-tp" && a.rtDone && !a.tpDone) ||
      (taskFilter === "neither-done" && !a.rtDone && !a.tpDone);
    const hypercareMatch = !hypercareOnly || !!a.hypercareDri;
    const scMatch = selectedSc === "all" || a.solutionsConsultant === selectedSc;
    const customerHealthMatch = selectedCustomerHealth === "all" || a.customerTemperature === selectedCustomerHealth;
    const projectHealthMatch = selectedProjectHealth === "all" || a.projectHealth === selectedProjectHealth;
    const projectTypeMatch = selectedProjectType === "all" || a.projectType === selectedProjectType;
    const execStatusMatch = selectedExecStatus === "all" || a.executiveProgramStatus === selectedExecStatus;
    return bucketMatch && stageMatch && csmMatch && searchMatch && taskMatch
      && hypercareMatch && scMatch && customerHealthMatch
      && projectHealthMatch && projectTypeMatch && execStatusMatch;
  });

  const tempRank: Record<string, number> = { Red: 0, Yellow: 1, Green: 2 };
  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    let av: string | number | null = null;
    let bv: string | number | null = null;
    if (sortKey === "accountName") {
      av = a.accountName?.toLowerCase() ?? null;
      bv = b.accountName?.toLowerCase() ?? null;
    } else if (sortKey === "bucket") {
      av = a.bucket ?? null;
      bv = b.bucket ?? null;
    } else if (sortKey === "arr") {
      av = a.arr ?? null;
      bv = b.arr ?? null;
    } else if (sortKey === "goLiveDate") {
      av = a.goLiveDate ? new Date(a.goLiveDate).getTime() : null;
      bv = b.goLiveDate ? new Date(b.goLiveDate).getTime() : null;
    } else if (sortKey === "daysInBucket") {
      av = a.daysInBucket;
      bv = b.daysInBucket;
    } else if (sortKey === "customerTemperature") {
      av = a.customerTemperature != null ? tempRank[a.customerTemperature] ?? 99 : null;
      bv = b.customerTemperature != null ? tempRank[b.customerTemperature] ?? 99 : null;
    }
    // Push nulls/undefined to bottom regardless of direction
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });

  const updatedLabel = new Date(data.updatedAt).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });

  return (
    <div className="tab-fade-in">
      <div className="flex items-start justify-between mb-6">
        <SectionHeader
          kicker="Onboarding Lifecycle · Operation GoLive · June 2026"
          title="Active Onboarding — Live View"
          sub={`Active Projects across 7 buckets. Live Salesforce data, auto-refreshes every 5 minutes.`}
        />
        <div className="text-[11px] text-muted-text mt-1 flex-shrink-0 text-right">
          <span>Updated {updatedLabel}</span>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="ml-3 text-protocol-blue hover:underline disabled:opacity-50 disabled:cursor-wait"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
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

        <Panel className="!border-rose-300 !bg-rose-50">
          <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-rose-500 mb-1.5">
            Gap to 90% SLA
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-medium tabular text-rose-600">{slaData.gap}</span>
            <span className="text-sm text-rose-400">accounts</span>
          </div>
          <div className="mt-2 h-1.5 bg-rose-100 rounded-sm overflow-hidden">
            <div
              className="h-full bg-rose-400 rounded-sm"
              style={{ width: `${Math.min(100, (slaData.bothDone / slaData.slaTarget) * 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-rose-500 mt-1.5">
            {slaData.bothDone}/{slaData.slaTarget} · {slaData.eligiblePct}% eligible ({slaData.eligibleCount} B3–B7)
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
            SLA compliance (eligible)
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-medium tabular text-midnight">{slaData.eligiblePct}%</span>
            <span className="text-sm text-muted-text">/ 90% target</span>
          </div>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-sm overflow-hidden">
            <div
              className="h-full bg-protocol-blue rounded-sm"
              style={{ width: `${Math.min(100, (slaData.eligiblePct / 70) * 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-muted-text mt-1.5">
            {slaData.bothDone}/{slaData.eligibleCount} B3–B7 · B1/B2 excluded
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
            <div className="col-span-1 text-right">Last week</div>
            <div className="col-span-1 text-right">Progress in June</div>
            <div className="col-span-2 text-right">SLA target</div>
            <div className="col-span-2 text-right">SLA met</div>
            <div className="col-span-1 text-right">SLA gap</div>
          </div>

          {(() => {
            const csmTargetMap = Object.fromEntries(
              data.bothDoneMetric.byCsm.map(c => [c.csm, c.target])
            );
            const csmBothDoneMap = Object.fromEntries(
              data.bothDoneMetric.byCsm.map(c => [c.csm, c.both])
            );
            return data.standupMetrics.map(m => {
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
                  <div className="col-span-1 text-right font-mono tabular text-sm text-muted-text">{m.lastWeek}</div>
                  <div className="col-span-1 text-right font-mono tabular text-sm text-midnight">{m.totalMonth}</div>
                  <div className="col-span-2 text-right font-mono tabular text-sm text-muted-text">{csmTargetMap[m.csm] ?? "--"}</div>
                  <div className="col-span-2 text-right font-mono tabular text-sm text-midnight font-medium">{csmBothDoneMap[m.csm] ?? "--"}</div>
                  <div className="col-span-1 text-right font-mono tabular text-sm text-rose-500 font-medium">{m.monthTarget}</div>
                </div>
              );
            });
          })()}

          <div className="grid grid-cols-12 gap-3 pt-3 mt-2 border-t-2 border-midnight items-center">
            <div className="col-span-3 text-[11px] uppercase tracking-wider font-semibold text-midnight">Team total</div>
            <div className="col-span-2 text-right font-display text-2xl font-medium tabular text-midnight">{totalNet}</div>
            <div className="col-span-1 text-right font-mono tabular text-sm text-muted-text">{totalNetLast}</div>
            <div className="col-span-1 text-right font-mono tabular text-sm text-midnight font-semibold">{totalMonth}</div>
            <div className="col-span-2 text-right font-mono tabular text-sm text-muted-text">{data.bothDoneMetric.slaTarget}</div>
            <div className="col-span-2 text-right font-mono tabular text-sm text-midnight font-semibold">{data.bothDoneMetric.baseline}</div>
            <div className="col-span-1 text-right font-mono tabular text-sm text-rose-500 font-semibold">{slaData.gap}</div>
          </div>
        </div>

      </Panel>

      {/* Bucket distribution + Subtask velocity */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Panel
          title="Bucket Distribution"
          subtitle="Current vs. June 1 baseline"
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
            <span className="font-medium text-midnight">bl</span> = June 1 baseline. Movement out of B4/B5 into B6/B7 is the operation&apos;s primary signal.
          </div>
        </Panel>

        <Panel title="Both Done" subtitle={`Goal: ${data.bothDoneMetric.slaTarget} (90% of ${data.secondaryMetric.eligibleTotal} eligible B3–B7) by June 30`}>
          <div className="space-y-4">
            {/* Team cumulative progress toward SLA target */}
            <div>
              <div className="flex items-baseline justify-between text-[11px] mb-1">
                <span className="font-semibold text-midnight">
                  <span className="text-[18px] font-bold">{data.bothDoneMetric.baseline}</span>
                  <span className="text-muted-text ml-1">/ {data.bothDoneMetric.slaTarget} · +{data.bothDoneMetric.newlyBothDone} in June</span>
                </span>
                <span className="text-muted-text">{Math.round((data.bothDoneMetric.baseline / data.bothDoneMetric.slaTarget) * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-sm overflow-hidden">
                <div className="h-full bg-protocol-blue rounded-sm transition-all" style={{ width: `${Math.min(100, (data.bothDoneMetric.baseline / data.bothDoneMetric.slaTarget) * 100)}%` }} />
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
                const csmPct = row.eligible > 0 ? Math.round(100 * row.both / row.eligible) : 0;
                const barPct = Math.min(100, (row.both / Math.max(1, row.target)) * 100);
                const atSla = csmPct >= 70;
                return (
                  <div key={row.csm}>
                    <div className="flex items-baseline justify-between text-[10px] mb-0.5">
                      <span className="font-medium text-midnight">{row.csm.split(" ")[0]}</span>
                      <span className="text-muted-text font-mono tabular flex items-center gap-2">
                        <span className={`font-semibold ${atSla ? "text-status-green" : "text-rose-500"}`}>
                          {csmPct}%
                        </span>
                        <span>{row.both}/{row.target}</span>
                        {row.rtOnly > 0 && <span className="text-amber-600">{row.rtOnly} RT</span>}
                        {row.tpOnly > 0 && <span className="text-blue-600">{row.tpOnly} TP</span>}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                      <div
                        className={`h-full rounded-sm ${atSla ? "bg-status-green/70" : "bg-protocol-blue/70"}`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>

      {/* SLA by Bucket */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel title="SLA by Bucket" subtitle="Both-done rate per bucket · B2 excluded from SLA">
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 pb-1.5 border-b border-panel-border text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium">
              <div className="col-span-3">Bucket</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-2 text-right">Done</div>
              <div className="col-span-2 text-right">1-away</div>
              <div className="col-span-3 text-right">Rate</div>
            </div>
            {slaData.byBucket.map(row => {
              const atSla = row.pct >= 70;
              return (
                <div key={row.bucket} className="grid grid-cols-12 gap-2 items-center py-1.5 border-b border-panel-border last:border-0">
                  <div className="col-span-3 flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-sm flex-shrink-0"
                      style={{ background: BUCKET_COLORS[row.bucket] }}
                    />
                    <span className="text-[11px] font-medium text-midnight">{row.bucket}</span>
                  </div>
                  <div className="col-span-2 text-right font-mono tabular text-sm text-muted-text">{row.total}</div>
                  <div className="col-span-2 text-right font-mono tabular text-sm text-midnight">{row.bothDone}</div>
                  <div className="col-span-2 text-right font-mono tabular text-sm text-amber-600">{row.oneAway}</div>
                  <div className="col-span-3 text-right">
                    <span className={`text-sm font-semibold font-mono tabular ${atSla ? "text-status-green" : "text-rose-500"}`}>
                      {row.pct}%
                    </span>
                    {!atSla && row.total > 0 && (
                      <span className="text-[10px] text-muted-text ml-1">
                        gap {Math.max(0, Math.round(row.total * 0.90) - row.bothDone)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="grid grid-cols-12 gap-2 pt-2 border-t-2 border-midnight items-center">
              <div className="col-span-3 text-[11px] uppercase tracking-wider font-semibold text-midnight">Eligible</div>
              <div className="col-span-2 text-right font-mono tabular text-sm font-semibold text-midnight">{slaData.eligibleCount}</div>
              <div className="col-span-2 text-right font-mono tabular text-sm font-semibold text-midnight">{slaData.bothDone}</div>
              <div className="col-span-2 text-right font-mono tabular text-sm font-semibold text-amber-600">
                {slaData.byBucket.reduce((s, r) => s + r.oneAway, 0)}
              </div>
              <div className="col-span-3 text-right">
                <span className={`text-sm font-bold font-mono tabular ${slaData.eligiblePct >= 70 ? "text-status-green" : "text-rose-500"}`}>
                  {slaData.eligiblePct}%
                </span>
              </div>
            </div>
          </div>
        </Panel>

        {/* Single Task Away */}
        <Panel title="Single Task Away" subtitle="Exactly one of RT or TP done · highest-ROI completions · B6 first">
          {slaData.oneAway.length === 0 ? (
            <div className="text-sm text-muted-text py-4 text-center">No one-away accounts — nice!</div>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {slaData.oneAway.map(a => (
                <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-panel-border last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-sm flex-shrink-0"
                      style={{ background: BUCKET_COLORS[a.bucket] }}
                    />
                    <span className="text-[12px] text-midnight truncate">{a.accountName}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-[10px] font-mono text-muted-text">{a.csmName?.split(" ")[0]}</span>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${a.rtDone ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-slate-50 text-muted-text border border-panel-border"}`}
                    >
                      RT {a.rtDone ? "✓" : "–"}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${a.tpDone ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-slate-50 text-muted-text border border-panel-border"}`}
                    >
                      TP {a.tpDone ? "✓" : "–"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 pt-2.5 border-t border-panel-border text-[11px] text-muted-text">
            {slaData.oneAway.length} accounts · complete one task = +1 to SLA count
          </div>
        </Panel>
      </div>

      {/* Account workbench */}
      <SectionHeader
        kicker="Account Workbench"
        title="Active onboarding accounts"
        sub="Combine filters — bucket, CSM, Hypercare, SC, health, type, exec status. Click an account to view details and update status. Changes write directly to Salesforce."
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

      {/* Stage filters */}
      <div className="flex flex-wrap gap-2 mb-2">
        <FilterChip label="All" count={localAccounts.length} active={selectedStage === "all"} onClick={() => setSelectedStage("all")} />
        {(["Onboard", "Hypercare", "Approved", "Completed"] as const).map(s => (
          <FilterChip
            key={s}
            label={s}
            count={localAccounts.filter(a => a.stage === s).length}
            active={selectedStage === s}
            onClick={() => setSelectedStage(s)}
            color="#0EA5E9"
          />
        ))}
      </div>

      {/* CSM filters */}
      {availableCsms.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
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

      {/* Hypercare toggle */}
      {hypercareCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 items-center">
          <span className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium w-32 flex-shrink-0">Hypercare</span>
          <FilterChip
            label="Hypercare only"
            count={hypercareCount}
            active={hypercareOnly}
            onClick={() => setHypercareOnly(!hypercareOnly)}
            color="#8B5CF6"
          />
        </div>
      )}

      {/* Solutions Consultant filters */}
      {availableScs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 items-center">
          <span className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium w-32 flex-shrink-0">Solutions Consultant</span>
          <FilterChip label="All SCs" count={0} active={selectedSc === "all"} onClick={() => setSelectedSc("all")} showCount={false} color="#0EA5E9" />
          {availableScs.map(sc => (
            <FilterChip
              key={sc}
              label={sc}
              count={localAccounts.filter(a => a.solutionsConsultant === sc).length}
              active={selectedSc === sc}
              onClick={() => setSelectedSc(sc)}
              color="#0EA5E9"
            />
          ))}
        </div>
      )}

      {/* Customer Health filters */}
      {availableCustomerHealth.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 items-center">
          <span className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium w-32 flex-shrink-0">Customer Health</span>
          <FilterChip label="All" count={0} active={selectedCustomerHealth === "all"} onClick={() => setSelectedCustomerHealth("all")} showCount={false} color="#475569" />
          {availableCustomerHealth.map(h => (
            <FilterChip
              key={h}
              label={h}
              count={localAccounts.filter(a => a.customerTemperature === h).length}
              active={selectedCustomerHealth === h}
              onClick={() => setSelectedCustomerHealth(h)}
              color={h === "Green" ? "#10B981" : h === "Yellow" ? "#F59E0B" : h === "Red" ? "#EF4444" : "#475569"}
            />
          ))}
        </div>
      )}

      {/* Project Health filters */}
      {availableProjectHealth.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 items-center">
          <span className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium w-32 flex-shrink-0">Project Health</span>
          <FilterChip label="All" count={0} active={selectedProjectHealth === "all"} onClick={() => setSelectedProjectHealth("all")} showCount={false} color="#475569" />
          {availableProjectHealth.map(h => (
            <FilterChip
              key={h}
              label={h}
              count={localAccounts.filter(a => a.projectHealth === h).length}
              active={selectedProjectHealth === h}
              onClick={() => setSelectedProjectHealth(h)}
              color={h === "Green" || h === "On Track" ? "#10B981" : h === "Yellow" || h === "At Risk" ? "#F59E0B" : h === "Red" || h === "Off Track" ? "#EF4444" : "#475569"}
            />
          ))}
        </div>
      )}

      {/* Project Type filters */}
      {availableProjectTypes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 items-center">
          <span className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium w-32 flex-shrink-0">Project Type</span>
          <FilterChip label="All" count={0} active={selectedProjectType === "all"} onClick={() => setSelectedProjectType("all")} showCount={false} color="#475569" />
          {availableProjectTypes.map(t => (
            <FilterChip
              key={t}
              label={t}
              count={localAccounts.filter(a => a.projectType === t).length}
              active={selectedProjectType === t}
              onClick={() => setSelectedProjectType(t)}
              color="#475569"
            />
          ))}
        </div>
      )}

      {/* Executive Program Status filters */}
      {availableExecStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 items-center">
          <span className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium w-32 flex-shrink-0">Exec Program Status</span>
          <FilterChip label="All" count={0} active={selectedExecStatus === "all"} onClick={() => setSelectedExecStatus("all")} showCount={false} color="#475569" />
          {availableExecStatuses.map(s => (
            <FilterChip
              key={s}
              label={s}
              count={localAccounts.filter(a => a.executiveProgramStatus === s).length}
              active={selectedExecStatus === s}
              onClick={() => setSelectedExecStatus(s)}
              color={s === "On Track" ? "#10B981" : s === "At Risk" ? "#F59E0B" : s === "Needs Attention" ? "#EF4444" : "#475569"}
            />
          ))}
        </div>
      )}

      {/* SLA Focus */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <span className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium w-32 flex-shrink-0">SLA Focus</span>
        {([
          { v: "all" as const, label: "All", color: "#475569", count: localAccounts.length, showCount: false },
          { v: "both-done" as const, label: "✓ Both done", color: "#10B981", count: localAccounts.filter(a => a.rtDone && a.tpDone).length, showCount: true },
          { v: "one-away" as const, label: "One away", color: "#F59E0B", count: localAccounts.filter(a => (a.rtDone ? 1 : 0) + (a.tpDone ? 1 : 0) === 1).length, showCount: true },
          { v: "needs-rt" as const, label: "Needs RT", color: "#06B6D4", count: localAccounts.filter(a => !a.rtDone && a.tpDone).length, showCount: true },
          { v: "needs-tp" as const, label: "Needs TP", color: "#2563EB", count: localAccounts.filter(a => a.rtDone && !a.tpDone).length, showCount: true },
          { v: "neither-done" as const, label: "Neither done", color: "#EF4444", count: localAccounts.filter(a => !a.rtDone && !a.tpDone).length, showCount: true },
        ]).map(({ v, label, color, count, showCount }) => (
          <FilterChip
            key={v}
            label={label}
            count={count}
            active={taskFilter === v}
            onClick={() => setTaskFilter(v)}
            color={color}
            showCount={showCount}
          />
        ))}
      </div>

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
            <div className="overflow-auto max-h-[calc(100vh-220px)]">
              <table className="w-full text-sm">
                <thead className="bg-subtle border-b border-panel-border sticky top-0 z-10">
                  <tr className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium">
                    <SortableTh align="left" extraClass="px-4" sortKey="accountName" activeKey={sortKey} dir={sortDir} onToggle={toggleSort}>Account</SortableTh>
                    <SortableTh align="center" sortKey="bucket" activeKey={sortKey} dir={sortDir} onToggle={toggleSort}>Bucket</SortableTh>
                    <SortableTh align="right" sortKey="arr" activeKey={sortKey} dir={sortDir} onToggle={toggleSort}>ARR</SortableTh>
                    <SortableTh align="right" sortKey="goLiveDate" activeKey={sortKey} dir={sortDir} onToggle={toggleSort}>Go-Live</SortableTh>
                    <SortableTh align="right" sortKey="daysInBucket" activeKey={sortKey} dir={sortDir} onToggle={toggleSort}>Days</SortableTh>
                    <SortableTh align="left" sortKey="customerTemperature" activeKey={sortKey} dir={sortDir} onToggle={toggleSort}>Temp</SortableTh>
                    <th className="px-2 py-2.5 text-center font-medium text-[10px] uppercase tracking-[0.1em] text-muted-text">RT</th>
                    <th className="px-2 py-2.5 text-center font-medium text-[10px] uppercase tracking-[0.1em] text-muted-text">TP</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(a => (
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
                      <td className="text-center px-1">
                        <span className={`text-[11px] font-semibold ${a.rtDone ? "text-status-green" : "text-muted-text/40"}`}>
                          {a.rtDone ? "✓" : "–"}
                        </span>
                      </td>
                      <td className="text-center px-1">
                        <span className={`text-[11px] font-semibold ${a.tpDone ? "text-status-green" : "text-muted-text/40"}`}>
                          {a.tpDone ? "✓" : "–"}
                        </span>
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

function SortableTh({
  children, sortKey, activeKey, dir, onToggle, align = "left", extraClass = "",
}: {
  children: React.ReactNode;
  sortKey: "accountName" | "bucket" | "arr" | "goLiveDate" | "daysInBucket" | "customerTemperature";
  activeKey: string;
  dir: "asc" | "desc";
  onToggle: (k: "accountName" | "bucket" | "arr" | "goLiveDate" | "daysInBucket" | "customerTemperature") => void;
  align?: "left" | "right" | "center";
  extraClass?: string;
}) {
  const active = activeKey === sortKey;
  const alignClass = align === "right" ? "text-right justify-end" : align === "center" ? "text-center justify-center" : "text-left justify-start";
  return (
    <th
      onClick={() => onToggle(sortKey)}
      className={`${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"} ${extraClass || "px-2"} py-2.5 font-medium cursor-pointer select-none hover:text-midnight transition-colors ${active ? "text-midnight" : ""}`}
    >
      <span className={`inline-flex items-center gap-1 ${alignClass}`}>
        {children}
        <span className={`text-[8px] leading-none ${active ? "opacity-100" : "opacity-30"}`}>
          {active ? (dir === "asc" ? "▲" : "▼") : "▲"}
        </span>
      </span>
    </th>
  );
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
  const [tasks, setTasks] = useState<{ id: string; subject: string; status: string; assignedTo: string; dueDate: string | null; isClosed: boolean }[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskSaving, setTaskSaving] = useState<Set<string>>(new Set());
  const [feed, setFeed] = useState<{ id: string; type: "chatter" | "note"; author: string; date: string; title: string | null; body: string }[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [jiraTickets, setJiraTickets] = useState<Array<{ key: string; summary: string; status: string; statusCategory: string; requestType: string | null; created: string; url: string }>>([]);
  const [loadingJira, setLoadingJira] = useState(false);
  const [jiraError, setJiraError] = useState<string | null>(null);
  const [fieldOptions, setFieldOptions] = useState<{
    servicePackageValues: string[];
    projectTypeValues: string[];
    accountStatusValues: string[];
    users: { id: string; name: string }[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/onboarding/field-options")
      .then(r => r.json())
      .then(setFieldOptions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setTasks([]);
    setLoadingTasks(true);
    fetch(`/api/onboarding/tasks?accountId=${a.id}`)
      .then(r => r.json())
      .then(d => setTasks(d.tasks ?? []))
      .catch(() => {})
      .finally(() => setLoadingTasks(false));

    setFeed([]);
    setLoadingFeed(true);
    fetch(`/api/onboarding/notes?accountId=${a.id}`)
      .then(r => r.json())
      .then(d => setFeed(d.feed ?? []))
      .catch(() => {})
      .finally(() => setLoadingFeed(false));
  }, [a.id]);

  useEffect(() => {
    setJiraTickets([]);
    setJiraError(null);
    setLoadingJira(true);
    fetch(`/api/onboarding/jira-tickets?accountName=${encodeURIComponent(a.accountName)}`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) {
          setJiraError(d.error ?? `${r.status}`);
          setJiraTickets([]);
        } else {
          setJiraTickets(d.tickets ?? []);
        }
      })
      .catch(e => setJiraError(String(e)))
      .finally(() => setLoadingJira(false));
  }, [a.id, a.accountName]);

  type TaskRow = { id: string; subject: string; status: string; assignedTo: string; dueDate: string | null; isClosed: boolean };

  async function handleTaskStatus(taskId: string, newStatus: string) {
    const prev = tasks.find((t: TaskRow) => t.id === taskId)?.status;
    setTasks((ts: TaskRow[]) => ts.map((t: TaskRow) => t.id === taskId
      ? { ...t, status: newStatus, isClosed: newStatus === "Completed" }
      : t
    ));
    setTaskSaving((s: Set<string>) => new Set(s).add(taskId));
    try {
      const res = await fetch("/api/onboarding/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: newStatus }),
      });
      if (!res.ok && prev) {
        setTasks((ts: TaskRow[]) => ts.map((t: TaskRow) => t.id === taskId
          ? { ...t, status: prev, isClosed: prev === "Completed" }
          : t
        ));
      }
    } catch {
      if (prev) {
        setTasks((ts: TaskRow[]) => ts.map((t: TaskRow) => t.id === taskId
          ? { ...t, status: prev, isClosed: prev === "Completed" }
          : t
        ));
      }
    } finally {
      setTaskSaving((s: Set<string>) => { const n = new Set(s); n.delete(taskId); return n; });
    }
  }

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

  type ProjectField = "Customer_Temperature__c" | "Project_Health__c" | "Service_Package__c" | "Project_Type__c" | "Solutions_Consultant__c" | "Hypercare_DRI__c" | "Customer_Planned_Go_Live_Date__c";
  const PROJECT_FIELD_LOCAL_KEY: Record<ProjectField, keyof ApiAccount> = {
    "Customer_Temperature__c": "customerTemperature",
    "Project_Health__c": "projectHealth",
    "Service_Package__c": "servicePackage",
    "Project_Type__c": "projectType",
    "Solutions_Consultant__c": "solutionsConsultant",
    "Hypercare_DRI__c": "hypercareDri",
    "Customer_Planned_Go_Live_Date__c": "goLiveDate",
  };

  async function handleProjectField(field: ProjectField, sfValue: string, displayValue?: string) {
    if (!a.projectId) return;
    const localKey = PROJECT_FIELD_LOCAL_KEY[field];
    const prev = a[localKey];
    onFieldChange(a.id, localKey, displayValue ?? sfValue ?? null);
    setFieldSaving(s => new Set(s).add(field));
    try {
      const res = await fetch("/api/onboarding/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "projectField", projectId: a.projectId, field, value: sfValue }),
      });
      if (!res.ok) onFieldChange(a.id, localKey, prev as string | null);
    } catch {
      onFieldChange(a.id, localKey, prev as string | null);
    } finally {
      setFieldSaving(s => { const n = new Set(s); n.delete(field); return n; });
    }
  }

  type AccountFieldKey = "Executive_Program_Status__c" | "Account_Status__c";
  const ACCOUNT_FIELD_LOCAL_KEY: Record<AccountFieldKey, keyof ApiAccount> = {
    "Executive_Program_Status__c": "executiveProgramStatus",
    "Account_Status__c": "accountStatus",
  };

  async function handleAccountField(field: AccountFieldKey, value: string) {
    const localKey = ACCOUNT_FIELD_LOCAL_KEY[field];
    const prev = a[localKey];
    onFieldChange(a.id, localKey, value || null);
    setFieldSaving(s => new Set(s).add(field));
    try {
      const res = await fetch("/api/onboarding/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "accountField", accountId: a.id, field, value }),
      });
      if (!res.ok) onFieldChange(a.id, localKey, prev as string | null);
    } catch {
      onFieldChange(a.id, localKey, prev as string | null);
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
              value={a.bucket === "pending" ? "" : a.bucket}
              onChange={e => handleBucketSelect(e.target.value)}
              disabled={savingBucket}
              className="w-full text-[12px] border border-panel-border rounded-sm px-2 py-1.5 bg-white text-dark-text focus:outline-none focus:border-protocol-blue disabled:opacity-50 disabled:cursor-wait"
            >
              {a.bucket === "pending" && <option value="" disabled>— unrecognized SF value —</option>}
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
            <input
              type="date"
              value={a.goLiveDate ? a.goLiveDate.substring(0, 10) : ""}
              onChange={e => handleProjectField("Customer_Planned_Go_Live_Date__c", e.target.value)}
              disabled={fieldSaving.has("Customer_Planned_Go_Live_Date__c") || !a.projectId}
              className="font-display text-sm font-medium tabular text-midnight mt-0.5 border border-panel-border rounded-sm px-1 py-0.5 bg-white focus:outline-none focus:border-protocol-blue disabled:opacity-50 disabled:cursor-wait w-full"
            />
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
            {/* Solutions Consultant — User lookup on Project__c */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-text mb-1">Solutions Consultant</div>
              <select
                value={fieldOptions?.users.find(u => u.name === a.solutionsConsultant)?.id ?? ""}
                onChange={e => {
                  const user = fieldOptions?.users.find(u => u.id === e.target.value);
                  handleProjectField("Solutions_Consultant__c", e.target.value, user?.name ?? "");
                }}
                disabled={fieldSaving.has("Solutions_Consultant__c") || !a.projectId || !fieldOptions}
                className="w-full text-[12px] border border-panel-border rounded-sm px-2 py-1 bg-white text-dark-text focus:outline-none focus:border-protocol-blue disabled:opacity-50 disabled:cursor-wait"
              >
                <option value="">— Select —</option>
                {fieldOptions?.users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            {/* Hypercare DRI — User lookup on Project__c */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-text mb-1">Hypercare DRI</div>
              <select
                value={fieldOptions?.users.find(u => u.name === a.hypercareDri)?.id ?? ""}
                onChange={e => {
                  const user = fieldOptions?.users.find(u => u.id === e.target.value);
                  handleProjectField("Hypercare_DRI__c", e.target.value, user?.name ?? "");
                }}
                disabled={fieldSaving.has("Hypercare_DRI__c") || !a.projectId || !fieldOptions}
                className="w-full text-[12px] border border-panel-border rounded-sm px-2 py-1 bg-white text-dark-text focus:outline-none focus:border-protocol-blue disabled:opacity-50 disabled:cursor-wait"
              >
                <option value="">— Select —</option>
                {fieldOptions?.users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            {/* Service Package — picklist on Project__c */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-text mb-1">Service Package</div>
              <select
                value={a.servicePackage ?? ""}
                onChange={e => handleProjectField("Service_Package__c", e.target.value)}
                disabled={fieldSaving.has("Service_Package__c") || !a.projectId || !fieldOptions}
                className="w-full text-[12px] border border-panel-border rounded-sm px-2 py-1 bg-white text-dark-text focus:outline-none focus:border-protocol-blue disabled:opacity-50 disabled:cursor-wait"
              >
                <option value="">— Select —</option>
                {fieldOptions?.servicePackageValues.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            {/* Project Type — picklist on Project__c */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-text mb-1">Project Type</div>
              <select
                value={a.projectType ?? ""}
                onChange={e => handleProjectField("Project_Type__c", e.target.value)}
                disabled={fieldSaving.has("Project_Type__c") || !a.projectId || !fieldOptions}
                className="w-full text-[12px] border border-panel-border rounded-sm px-2 py-1 bg-white text-dark-text focus:outline-none focus:border-protocol-blue disabled:opacity-50 disabled:cursor-wait"
              >
                <option value="">— Select —</option>
                {fieldOptions?.projectTypeValues.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            {/* Account Status — picklist on Account */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-text mb-1">Account Status</div>
              <select
                value={a.accountStatus ?? ""}
                onChange={e => handleAccountField("Account_Status__c", e.target.value)}
                disabled={fieldSaving.has("Account_Status__c") || !fieldOptions}
                className="w-full text-[12px] border border-panel-border rounded-sm px-2 py-1 bg-white text-dark-text focus:outline-none focus:border-protocol-blue disabled:opacity-50 disabled:cursor-wait"
              >
                <option value="">— Select —</option>
                {fieldOptions?.accountStatusValues.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            {/* Exec Program Status — picklist on Account (existing) */}
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

        {/* Project Tasks */}
        <div className="pt-3 border-t border-panel-border">
          <div className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium mb-2.5">Project Tasks</div>
          {loadingTasks ? (
            <div className="text-[11px] text-muted-text py-2">Loading tasks…</div>
          ) : tasks.length === 0 ? (
            <div className="text-[11px] text-muted-text py-2">No tasks found.</div>
          ) : (
            <div className="space-y-1">
              {tasks.filter((t: { isClosed: boolean }) => !t.isClosed).length > 0 && (
                <>
                  <div className="text-[9px] uppercase tracking-wider text-muted-text font-medium mb-1.5">
                    Open ({tasks.filter((t: { isClosed: boolean }) => !t.isClosed).length})
                  </div>
                  {tasks.filter((t: { isClosed: boolean }) => !t.isClosed).map((task: { id: string; subject: string; status: string; assignedTo: string; isClosed: boolean }) => (
                    <div key={task.id} className="flex items-start gap-2 py-1.5 border-b border-panel-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-dark-text leading-snug">
                          {task.subject.replace(/^Onboarding\s*[-–]\s*/i, "")}
                        </div>
                        <div className="text-[10px] text-muted-text mt-0.5">{task.assignedTo}</div>
                      </div>
                      <select
                        value={task.status}
                        onChange={e => handleTaskStatus(task.id, (e.target as HTMLSelectElement).value)}
                        disabled={taskSaving.has(task.id)}
                        className="text-[10px] border border-panel-border rounded-sm px-1.5 py-1 bg-white text-dark-text focus:outline-none focus:border-protocol-blue disabled:opacity-50 disabled:cursor-wait flex-shrink-0"
                      >
                        <option value="New">New</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Waiting on Someone Else">Waiting</option>
                        <option value="Deferred">Deferred</option>
                      </select>
                    </div>
                  ))}
                </>
              )}
              {tasks.filter((t: { isClosed: boolean }) => t.isClosed).length > 0 && (
                <>
                  <div className="text-[9px] uppercase tracking-wider text-muted-text font-medium mb-1.5 mt-3">
                    Completed ({tasks.filter((t: { isClosed: boolean }) => t.isClosed).length})
                  </div>
                  {tasks.filter((t: { isClosed: boolean }) => t.isClosed).map((task: { id: string; subject: string; status: string; assignedTo: string; isClosed: boolean }) => (
                    <div key={task.id} className="flex items-start gap-2 py-1.5 border-b border-panel-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-muted-text line-through leading-snug">
                          {task.subject.replace(/^Onboarding\s*[-–]\s*/i, "")}
                        </div>
                        <div className="text-[10px] text-muted-text mt-0.5">{task.assignedTo}</div>
                      </div>
                      <select
                        value={task.status}
                        onChange={e => handleTaskStatus(task.id, (e.target as HTMLSelectElement).value)}
                        disabled={taskSaving.has(task.id)}
                        className="text-[10px] border border-panel-border rounded-sm px-1.5 py-1 bg-white text-muted-text focus:outline-none focus:border-protocol-blue disabled:opacity-50 disabled:cursor-wait flex-shrink-0"
                      >
                        <option value="New">New</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Waiting on Someone Else">Waiting</option>
                        <option value="Deferred">Deferred</option>
                      </select>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
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

        {/* Associated Jira Tickets (HHC project) */}
        <div className="mt-4 border-t border-panel-border pt-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium">
              Jira Tickets · HHC {jiraTickets.length > 0 && <span className="text-muted-text/70">({jiraTickets.length} open)</span>}
            </div>
          </div>
          {loadingJira ? (
            <div className="text-[11px] text-muted-text py-2">Loading…</div>
          ) : jiraError ? (
            <div className="text-[11px] text-status-yellow py-2">Unable to load Jira tickets. {jiraError}</div>
          ) : jiraTickets.length === 0 ? (
            <div className="text-[11px] text-muted-text py-2">No open HHC tickets found for this account.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-[9px] uppercase tracking-wider text-muted-text font-medium border-b border-panel-border">
                    <th className="text-left py-1.5 pr-2 font-medium">Type</th>
                    <th className="text-left py-1.5 pr-2 font-medium">Key</th>
                    <th className="text-left py-1.5 pr-2 font-medium">Summary</th>
                    <th className="text-left py-1.5 pr-2 font-medium">Status</th>
                    <th className="text-right py-1.5 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {jiraTickets.map(t => (
                    <tr key={t.key} className="border-b border-panel-border/50 last:border-0">
                      <td className="py-1.5 pr-2 text-muted-text whitespace-nowrap">{t.requestType ?? "—"}</td>
                      <td className="py-1.5 pr-2 whitespace-nowrap">
                        <a
                          href={t.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-protocol-blue hover:underline font-mono"
                        >
                          {t.key}
                        </a>
                      </td>
                      <td className="py-1.5 pr-2 text-dark-text">{t.summary}</td>
                      <td className="py-1.5 pr-2 whitespace-nowrap">
                        <span className={`inline-block px-1.5 py-0.5 rounded-sm text-[10px] font-medium ${
                          t.statusCategory === "Done" ? "bg-emerald-50 text-status-green"
                            : t.statusCategory === "In Progress" ? "bg-amber-50 text-status-yellow"
                            : "bg-slate-100 text-muted-text"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-1.5 text-right text-muted-text whitespace-nowrap">
                        {new Date(t.created).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
