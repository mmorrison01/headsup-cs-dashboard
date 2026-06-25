"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Panel } from "./ui";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PsEpic {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  url: string;
}

interface PsIssue {
  key: string;
  summary: string;
  issueType: "Story" | "Task";
  status: string;
  statusCategory: string;
  assignee: string | null;
  assigneeAccountId: string | null;
  dueDate: string | null;
  originalEstimateHours: number | null;
  timeSpentHours: number | null;
  priority: string | null;
  epicKey: string | null;
  epicSummary: string | null;
  blocked: boolean;
  labels: string[];
  lastUpdated: string;
  url: string;
}

interface WeekBucket {
  weekOf: string;
  label: string;
  totalHours: number;
  byAssignee: Record<string, number>;
  issueKeys: string[];
}

interface PsApiData {
  updatedAt: string;
  epics: PsEpic[];
  issues: PsIssue[];
  assignees: string[];
  summary: { total: number; overdue: number; blocked: number; done: number; inProgress: number };
  weeklyCapacity: WeekBucket[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
}

function daysUntil(isoDate: string): number {
  return Math.floor((new Date(isoDate + "T12:00:00Z").getTime() - Date.now()) / 86400000);
}

function fmtHrs(h: number | null): string {
  if (h == null) return "—";
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`;
}

function capacityColor(hrs: number): string {
  if (hrs === 0) return "bg-transparent text-muted-text";
  if (hrs <= 20) return "bg-emerald-50 text-emerald-700";
  if (hrs <= 35) return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function statusBadgeClass(cat: string): string {
  if (cat === "Done") return "bg-emerald-100 text-emerald-700";
  if (cat === "In Progress") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600";
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PSDeliveryDashboard() {
  const [data, setData] = useState<PsApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [filterEpic, setFilterEpic] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterWeek, setFilterWeek] = useState("all");
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);
  const [searchText, setSearchText] = useState("");

  // Internal view tabs
  const [psView, setPsView] = useState<"overview" | "workbench">("workbench");

  // Inline edit state
  const [saving, setSaving] = useState<string | null>(null); // issueKey being saved

  async function fetchData(manual = false) {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch("/api/ps", { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `API returned ${res.status}`);
      }
      const json: PsApiData = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  const today = todayISO();

  // ── Derived: per-epic rollups ──────────────────────────────────────────────

  const epicRollups = useMemo(() => {
    if (!data) return [];
    return data.epics.map(epic => {
      const issues = data.issues.filter(i => i.epicKey === epic.key);
      const open = issues.filter(i => i.statusCategory !== "Done");
      const overdue = open.filter(i => i.dueDate && i.dueDate < today);
      const blocked = open.filter(i => i.blocked);
      const done = issues.filter(i => i.statusCategory === "Done");
      const hrsRemaining = open.reduce((s, i) => s + (i.originalEstimateHours ?? 0), 0);
      const nextDue = open
        .filter(i => i.dueDate)
        .sort((a, b) => (a.dueDate! > b.dueDate! ? 1 : -1))[0]?.dueDate ?? null;
      return { epic, open: open.length, overdue: overdue.length, blocked: blocked.length, done: done.length, hrsRemaining, nextDue };
    }).sort((a, b) => b.overdue - a.overdue || b.blocked - a.blocked || a.epic.summary.localeCompare(b.epic.summary));
  }, [data, today]);

  // ── Derived: filtered issues ───────────────────────────────────────────────

  const filteredIssues = useMemo(() => {
    if (!data) return [];
    return data.issues
      .filter(i => {
        if (filterEpic !== "all" && i.epicKey !== filterEpic) return false;
        if (filterAssignee !== "all" && i.assignee !== filterAssignee) return false;
        if (filterStatus !== "all" && i.statusCategory !== filterStatus) return false;
        if (filterWeek !== "all") {
          const bucket = data.weeklyCapacity.find(b => b.weekOf === filterWeek);
          if (!bucket || !bucket.issueKeys.includes(i.key)) return false;
        }
        if (showBlockedOnly && !i.blocked) return false;
        if (searchText) {
          const q = searchText.toLowerCase();
          if (!i.summary.toLowerCase().includes(q) && !i.key.toLowerCase().includes(q) &&
              !(i.epicSummary ?? "").toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Blocked first, then overdue, then by due date
        if (a.blocked !== b.blocked) return a.blocked ? -1 : 1;
        const aOver = a.dueDate && a.dueDate < today && a.statusCategory !== "Done";
        const bOver = b.dueDate && b.dueDate < today && b.statusCategory !== "Done";
        if (aOver !== bOver) return aOver ? -1 : 1;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
  }, [data, filterEpic, filterAssignee, filterStatus, filterWeek, showBlockedOnly, searchText, today]);

  // ── Derived: risk surface ──────────────────────────────────────────────────

  const riskSurface = useMemo(() => {
    if (!data) return { blocked: [], overdue: [], aging: [] };
    const open = data.issues.filter(i => i.statusCategory !== "Done");
    const blocked = open.filter(i => i.blocked);
    const overdue = open.filter(i => i.dueDate && i.dueDate < today)
      .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
    const aging = open.filter(i => !i.blocked && daysAgo(i.lastUpdated) >= 7)
      .sort((a, b) => daysAgo(b.lastUpdated) - daysAgo(a.lastUpdated));
    return { blocked, overdue, aging };
  }, [data, today]);

  // ── Update helpers ─────────────────────────────────────────────────────────

  const updateIssue = useCallback(async (issueKey: string, body: object) => {
    setSaving(issueKey);
    try {
      const res = await fetch("/api/ps/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueKey, ...body }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Update failed ${res.status}`);
      }
      await fetchData();
    } catch (e) {
      alert(`Update failed: ${e}`);
    } finally {
      setSaving(null);
    }
  }, []);

  const toggleBlocked = useCallback((issue: PsIssue) => {
    const newLabels = issue.blocked
      ? issue.labels.filter(l => l.toLowerCase() !== "blocked")
      : [...issue.labels, "Blocked"];
    updateIssue(issue.key, { type: "field", field: "labels", value: newLabels });
  }, [updateIssue]);

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-text text-[13px]">
        Loading PS project data…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-rose-600 text-[13px]">{error ?? "Unable to load PS data."}</p>
        <button onClick={() => fetchData(true)} className="text-[11px] text-protocol-blue hover:underline">
          Retry
        </button>
      </div>
    );
  }

  const { summary, weeklyCapacity, assignees, epics } = data;
  const thisWeekIdx = weeklyCapacity.findIndex(b => {
    const d = new Date(today);
    const dow = d.getDay();
    const mon = new Date(d);
    mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    return b.weekOf === mon.toISOString().slice(0, 10);
  });
  const thisWeek = weeklyCapacity[thisWeekIdx === -1 ? 2 : thisWeekIdx];
  const thisWeekTotalHrs = thisWeek?.totalHours ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-text font-semibold mb-0.5">
            Professional Services · Nicoya Jira PS
          </div>
          <h2 className="text-[22px] font-display font-medium text-midnight leading-tight">
            PS Delivery Workbench
          </h2>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="text-[11px] text-protocol-blue hover:underline disabled:opacity-40"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* ── Summary KPIs ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <Panel className="!bg-gradient-to-br from-midnight to-[#1a2744] text-white border-0">
          <div className="px-1 py-1">
            <div className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-2">Open Issues</div>
            <div className="text-4xl font-display font-medium text-white">{summary.total}</div>
            <div className="text-[11px] text-white/50 mt-1">
              {summary.inProgress} in progress · {summary.done} done
            </div>
          </div>
        </Panel>

        <Panel className={summary.overdue > 0 ? "border-rose-300" : ""}>
          <div className="px-1 py-1">
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-text mb-2">Overdue</div>
            <div className={`text-4xl font-display font-medium ${summary.overdue > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {summary.overdue}
            </div>
            <div className="text-[11px] text-muted-text mt-1">past due date · not done</div>
          </div>
        </Panel>

        <Panel className={summary.blocked > 0 ? "border-rose-300" : ""}>
          <div className="px-1 py-1">
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-text mb-2">Blocked</div>
            <div className={`text-4xl font-display font-medium ${summary.blocked > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {summary.blocked}
            </div>
            <div className="text-[11px] text-muted-text mt-1">need unblocking</div>
          </div>
        </Panel>

        <Panel>
          <div className="px-1 py-1">
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-text mb-2">This Week Load</div>
            <div className="text-4xl font-display font-medium text-midnight">{fmtHrs(thisWeekTotalHrs)}</div>
            <div className="text-[11px] text-muted-text mt-1">
              across {Object.keys(thisWeek?.byAssignee ?? {}).length} assignees
            </div>
          </div>
        </Panel>
      </div>

      {/* ── Internal Tab Strip ────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-panel-border -mb-2">
        {(["workbench", "overview"] as const).map(v => (
          <button
            key={v}
            onClick={() => setPsView(v)}
            className={`px-4 py-2 text-[12px] font-medium border-b-2 transition-colors -mb-px ${
              psView === v
                ? "border-protocol-blue text-midnight"
                : "border-transparent text-muted-text hover:text-midnight"
            }`}
          >
            {v === "workbench" ? "Work Items" : "Portfolio & Capacity"}
          </button>
        ))}
      </div>

      {/* ── Capacity Calendar ──────────────────────────────────────────────── */}
      {psView === "overview" && <Panel title="Capacity Calendar" subtitle="Estimated hours due per assignee each week · green < 20h · amber 20–35h · red > 35h · click to filter Work Items">
        <div className="overflow-x-auto">
          <table className="text-[11px] w-full min-w-[700px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.1em] text-muted-text">
                <th className="text-left pb-2 pr-4 font-medium w-32">Assignee</th>
                {weeklyCapacity.map(b => {
                  const isPast = b.weekOf < today.slice(0, 8) + "01";
                  const isCurrent = thisWeek?.weekOf === b.weekOf;
                  return (
                    <th
                      key={b.weekOf}
                      onClick={() => setFilterWeek(filterWeek === b.weekOf ? "all" : b.weekOf)}
                      className={`pb-2 px-2 text-center font-medium cursor-pointer transition-colors hover:text-midnight ${isCurrent ? "text-protocol-blue" : isPast ? "opacity-40" : ""} ${filterWeek === b.weekOf ? "underline" : ""}`}
                    >
                      {b.label}
                      {isCurrent && <div className="text-[9px] text-protocol-blue">this wk</div>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Items due row */}
              <tr className="border-t border-panel-border">
                <td className="py-2 pr-4 text-muted-text text-[10px] font-medium uppercase tracking-[0.08em]">Items Due</td>
                {weeklyCapacity.map(b => {
                  const count = b.issueKeys.length;
                  const isPast = b.weekOf < today.slice(0, 7) + "-01";
                  return (
                    <td
                      key={b.weekOf}
                      onClick={() => setFilterWeek(filterWeek === b.weekOf ? "all" : b.weekOf)}
                      className={`py-2 px-2 text-center tabular-nums cursor-pointer transition-colors hover:bg-subtle rounded-sm ${isPast ? "opacity-40" : ""} ${count > 0 ? "font-semibold text-midnight" : "text-muted-text"}`}
                    >
                      {count > 0 ? count : "—"}
                    </td>
                  );
                })}
              </tr>
              {/* Team total row */}
              <tr className="border-t border-panel-border font-semibold">
                <td className="py-2 pr-4 text-midnight">Team Total</td>
                {weeklyCapacity.map(b => {
                  const isPast = b.weekOf < today.slice(0, 7) + "-01";
                  return (
                    <td key={b.weekOf} className={`py-2 px-2 text-center tabular-nums rounded-sm ${capacityColor(b.totalHours)} ${isPast ? "opacity-40" : ""}`}>
                      {b.totalHours > 0 ? fmtHrs(b.totalHours) : "—"}
                    </td>
                  );
                })}
              </tr>
              {/* Per-assignee rows */}
              {assignees.map(person => (
                <tr key={person} className="border-t border-panel-border/50">
                  <td
                    className="py-2 pr-4 text-midnight cursor-pointer hover:text-protocol-blue truncate max-w-[120px]"
                    title={person}
                    onClick={() => setFilterAssignee(filterAssignee === person ? "all" : person)}
                  >
                    {person.split(" ")[0]}
                  </td>
                  {weeklyCapacity.map(b => {
                    const hrs = b.byAssignee[person] ?? 0;
                    const isPast = b.weekOf < today.slice(0, 7) + "-01";
                    return (
                      <td
                        key={b.weekOf}
                        onClick={() => { setFilterAssignee(person); setFilterWeek(filterWeek === b.weekOf ? "all" : b.weekOf); }}
                        className={`py-2 px-2 text-center tabular-nums rounded-sm cursor-pointer ${capacityColor(hrs)} ${isPast ? "opacity-40" : ""}`}
                      >
                        {hrs > 0 ? fmtHrs(hrs) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {assignees.length === 0 && (
                <tr><td colSpan={9} className="py-4 text-center text-muted-text">No assignees with due dates in this window</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-text">
          <span>Click week or person cell to filter Work Items tab</span>
          {(filterAssignee !== "all" || filterWeek !== "all") && (
            <button onClick={() => { setFilterAssignee("all"); setFilterWeek("all"); }} className="text-protocol-blue hover:underline">
              Clear filters
            </button>
          )}
        </div>
      </Panel>}

      {/* ── Customer Portfolio ─────────────────────────────────────────────── */}
      {psView === "overview" && <Panel title="Customer Portfolio" subtitle="One row per Epic · click row to jump to Work Items" noPadding>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-panel-border text-[10px] uppercase tracking-[0.1em] text-muted-text">
              <th className="px-5 py-2 text-left font-medium">Customer</th>
              <th className="px-4 py-2 text-right font-medium">Open</th>
              <th className="px-4 py-2 text-right font-medium">Overdue</th>
              <th className="px-4 py-2 text-right font-medium">Blocked</th>
              <th className="px-4 py-2 text-right font-medium">Done</th>
              <th className="px-4 py-2 text-right font-medium">Hrs Remaining</th>
              <th className="px-5 py-2 text-left font-medium">Next Due</th>
            </tr>
          </thead>
          <tbody>
            {epicRollups.map(row => {
              const isActive = filterEpic === row.epic.key;
              return (
                <tr
                  key={row.epic.key}
                  onClick={() => { setFilterEpic(isActive ? "all" : row.epic.key); if (!isActive) setPsView("workbench"); }}
                  className={`border-b border-panel-border cursor-pointer transition-colors ${isActive ? "bg-pulse-blue/5" : "hover:bg-subtle"}`}
                >
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      {(row.overdue > 0 || row.blocked > 0) && (
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-rose-500" />
                      )}
                      <a
                        href={row.epic.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="font-medium text-midnight hover:text-protocol-blue"
                      >
                        {row.epic.summary}
                      </a>
                      <span className="text-[10px] text-muted-text font-mono">{row.epic.key}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.open}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${row.overdue > 0 ? "text-rose-600" : "text-muted-text"}`}>
                    {row.overdue || "—"}
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${row.blocked > 0 ? "text-rose-600" : "text-muted-text"}`}>
                    {row.blocked || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">{row.done || "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-text">{fmtHrs(row.hrsRemaining || null)}</td>
                  <td className="px-5 py-2.5 text-muted-text font-mono text-[11px]">
                    {row.nextDue
                      ? <span className={row.nextDue < today ? "text-rose-600 font-medium" : ""}>{row.nextDue}</span>
                      : "—"}
                  </td>
                </tr>
              );
            })}
            {epicRollups.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-text text-[12px]">No epics found in PS project</td></tr>
            )}
          </tbody>
        </table>
      </Panel>}

      {/* ── Work Item Workbench ────────────────────────────────────────────── */}
      {psView === "workbench" && <Panel
        title="Work Item Workbench"
        subtitle="All PS stories and tasks · inline status, due date, and blocked edits"
        noPadding
        action={
          <div className="flex items-center gap-3">
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search…"
              className="text-[11px] border border-panel-border rounded-sm px-2 py-1 w-40 outline-none focus:border-protocol-blue"
            />
            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-[11px] border border-panel-border rounded-sm px-2 py-1 outline-none focus:border-protocol-blue bg-white"
            >
              <option value="all">All statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
            {/* Blocked toggle */}
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showBlockedOnly}
                onChange={e => setShowBlockedOnly(e.target.checked)}
                className="accent-rose-500"
              />
              Blocked only
            </label>
            {/* Active filter pills */}
            {filterEpic !== "all" && (
              <span className="flex items-center gap-1 bg-pulse-blue/10 text-protocol-blue text-[10px] rounded-full px-2 py-0.5">
                {epics.find(e => e.key === filterEpic)?.summary ?? filterEpic}
                <button onClick={() => setFilterEpic("all")} className="hover:text-rose-600 ml-0.5">×</button>
              </span>
            )}
            {filterAssignee !== "all" && (
              <span className="flex items-center gap-1 bg-pulse-blue/10 text-protocol-blue text-[10px] rounded-full px-2 py-0.5">
                {filterAssignee.split(" ")[0]}
                <button onClick={() => setFilterAssignee("all")} className="hover:text-rose-600 ml-0.5">×</button>
              </span>
            )}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-panel-bg z-10">
              <tr className="border-b border-panel-border text-[10px] uppercase tracking-[0.1em] text-muted-text">
                <th className="px-4 py-2 text-left font-medium">Key</th>
                <th className="px-3 py-2 text-left font-medium">Customer</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-left font-medium">Summary</th>
                <th className="px-3 py-2 text-left font-medium w-32">Status</th>
                <th className="px-3 py-2 text-center font-medium">Due</th>
                <th className="px-3 py-2 text-right font-medium">Est</th>
                <th className="px-3 py-2 text-left font-medium">Assignee</th>
                <th className="px-3 py-2 text-center font-medium">Blocked</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.map(issue => {
                const isOverdue = issue.statusCategory !== "Done" && issue.dueDate && issue.dueDate < today;
                const isSavingThis = saving === issue.key;
                return (
                  <tr
                    key={issue.key}
                    className={`border-b border-panel-border/60 hover:bg-subtle transition-colors ${issue.blocked ? "bg-rose-50/50" : isOverdue ? "bg-rose-50/30" : ""} ${isSavingThis ? "opacity-50" : ""}`}
                  >
                    {/* Key */}
                    <td className="px-4 py-2 whitespace-nowrap">
                      <a href={issue.url} target="_blank" rel="noreferrer" className="font-mono text-protocol-blue hover:underline">
                        {issue.key}
                      </a>
                    </td>
                    {/* Customer */}
                    <td className="px-3 py-2 text-muted-text max-w-[110px] truncate" title={issue.epicSummary ?? ""}>
                      {issue.epicSummary ?? "—"}
                    </td>
                    {/* Type */}
                    <td className="px-3 py-2">
                      <span className={`text-[10px] rounded px-1.5 py-0.5 font-medium ${issue.issueType === "Story" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"}`}>
                        {issue.issueType}
                      </span>
                    </td>
                    {/* Summary */}
                    <td className="px-4 py-2 max-w-[280px]">
                      <span className="line-clamp-2" title={issue.summary}>{issue.summary}</span>
                    </td>
                    {/* Status — inline dropdown */}
                    <td className="px-3 py-2">
                      <select
                        value={issue.status}
                        disabled={isSavingThis}
                        onChange={e => updateIssue(issue.key, { type: "transition", transitionName: e.target.value })}
                        className={`text-[10px] rounded px-1.5 py-0.5 font-medium border-0 cursor-pointer outline-none ${statusBadgeClass(issue.statusCategory)} w-full`}
                      >
                        <option value={issue.status}>{issue.status}</option>
                        {["To Do", "In Progress", "Done", "Blocked"].filter(s => s !== issue.status).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    {/* Due date — inline date input */}
                    <td className="px-3 py-2 text-center">
                      <input
                        type="date"
                        value={issue.dueDate ?? ""}
                        disabled={isSavingThis}
                        onChange={e => updateIssue(issue.key, { type: "field", field: "dueDate", value: e.target.value || null })}
                        className={`text-[10px] font-mono border-0 outline-none bg-transparent cursor-pointer ${isOverdue ? "text-rose-600 font-medium" : "text-muted-text"}`}
                      />
                    </td>
                    {/* Estimate */}
                    <td className="px-3 py-2 text-right tabular-nums text-muted-text">
                      {fmtHrs(issue.originalEstimateHours)}
                    </td>
                    {/* Assignee */}
                    <td className="px-3 py-2 text-muted-text truncate max-w-[100px]" title={issue.assignee ?? ""}>
                      {issue.assignee?.split(" ")[0] ?? "—"}
                    </td>
                    {/* Blocked toggle */}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => toggleBlocked(issue)}
                        disabled={isSavingThis}
                        title={issue.blocked ? "Mark unblocked" : "Mark blocked"}
                        className={`w-4 h-4 rounded-full border-2 transition-colors ${issue.blocked ? "bg-rose-500 border-rose-500 hover:bg-rose-400" : "border-slate-300 hover:border-rose-400"}`}
                      />
                    </td>
                  </tr>
                );
              })}
              {filteredIssues.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-text">No issues match filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-panel-border text-[10px] text-muted-text">
          {filteredIssues.length} issue{filteredIssues.length !== 1 ? "s" : ""}
          {filteredIssues.length !== data.issues.length && ` (filtered from ${data.issues.length})`}
          {saving && " · Saving…"}
        </div>
      </Panel>}

      {/* ── Risk Surface ───────────────────────────────────────────────────── */}
      {psView === "workbench" && <div className="grid grid-cols-3 gap-4">
        <RiskColumn
          title="Blocked"
          color="rose"
          issues={riskSurface.blocked}
          today={today}
          emptyMsg="No blocked issues"
          renderMeta={i => i.assignee?.split(" ")[0] ?? "Unassigned"}
        />
        <RiskColumn
          title="Overdue"
          color="rose"
          issues={riskSurface.overdue}
          today={today}
          emptyMsg="Nothing overdue"
          renderMeta={i => i.dueDate ? `${Math.abs(daysUntil(i.dueDate))}d overdue` : "No due date"}
        />
        <RiskColumn
          title="Aging (7d+ no activity)"
          color="slate"
          issues={riskSurface.aging}
          today={today}
          emptyMsg="No aging issues"
          renderMeta={i => `${daysAgo(i.lastUpdated)}d since update`}
        />
      </div>}

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="text-[10px] text-muted-text text-right pb-4">
        Data from Nicoya Jira · PS project · updated {data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : "—"}
      </div>
    </div>
  );
}

// ── Risk Column ───────────────────────────────────────────────────────────────

function RiskColumn({
  title,
  color,
  issues,
  today,
  emptyMsg,
  renderMeta,
}: {
  title: string;
  color: "amber" | "rose" | "slate";
  issues: PsIssue[];
  today: string;
  emptyMsg: string;
  renderMeta: (i: PsIssue) => string;
}) {
  const dotColors = { amber: "bg-amber-400", rose: "bg-rose-500", slate: "bg-slate-400" };
  const textColors = { amber: "text-amber-700", rose: "text-rose-700", slate: "text-slate-600" };
  const borderColors = { amber: "border-amber-200", rose: "border-rose-200", slate: "border-slate-200" };

  return (
    <Panel
      title={title}
      subtitle={`${issues.length} issue${issues.length !== 1 ? "s" : ""}`}
      className={issues.length > 0 ? `border-l-2 ${borderColors[color]}` : ""}
    >
      {issues.length === 0 ? (
        <div className="text-[12px] text-emerald-600 font-medium py-2">{emptyMsg} ✓</div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {issues.map(issue => (
            <div key={issue.key} className="flex items-start gap-2">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${dotColors[color]}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <a href={issue.url} target="_blank" rel="noreferrer" className={`font-mono text-[10px] ${textColors[color]} hover:underline`}>
                    {issue.key}
                  </a>
                  <span className="text-[10px] text-muted-text">{issue.epicSummary ?? "—"}</span>
                </div>
                <div className="text-[11px] text-midnight truncate" title={issue.summary}>{issue.summary}</div>
                <div className={`text-[10px] ${textColors[color]}`}>{renderMeta(issue)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
