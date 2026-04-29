"use client";

import { useState } from "react";
import {
  Panel,
  StatusPill,
  TierDot,
  MiniBar,
  SectionHeader,
  formatCurrency,
} from "./ui";
import { accounts, type Account } from "@/lib/mockData";
import { AlertCircle, Clock, ArrowUpRight, Bell } from "lucide-react";

type ViewMode = "queue" | "all" | "silent" | "integrations" | "overrides";

export default function CSLeadershipDashboard() {
  const [view, setView] = useState<ViewMode>("queue");
  const [selectedAcct, setSelectedAcct] = useState<Account | null>(accounts[3]);

  const queueAccounts = accounts.filter(
    a => a.tier === "Red" || a.hardTriggers.length > 0
  );
  const silentAccounts = accounts.filter(a => a.daysSinceLogin >= 7);
  const integrationIssues = accounts.filter(a => a.integrationsStale > 0);
  const overrideAccounts = accounts.filter(a => a.hasOverride);

  const filtered = (() => {
    switch (view) {
      case "queue": return queueAccounts;
      case "all": return accounts;
      case "silent": return silentAccounts;
      case "integrations": return integrationIssues;
      case "overrides": return overrideAccounts;
    }
  })();

  return (
    <div className="tab-fade-in">
      <SectionHeader
        kicker="CS Operations · Daily workbench"
        title="Account workbench"
        sub="Today's queue, drilldowns, and live signals. Refreshes nightly at 2am MT; hard-trigger events arrive in real time."
      />

      {/* Top action strip */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <button
          onClick={() => setView("queue")}
          className={`text-left p-4 rounded-sm border transition-all ${
            view === "queue"
              ? "bg-midnight text-white border-midnight"
              : "bg-panel-bg border-panel-border hover:border-protocol-blue"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className={`text-[10px] font-medium uppercase tracking-[0.12em] ${view === "queue" ? "text-pulse-blue" : "text-muted-text"}`}>
                Today's Queue
              </div>
              <div className="font-display text-3xl font-medium tabular mt-1">
                {queueAccounts.length}
              </div>
            </div>
            <Bell size={14} className={view === "queue" ? "text-pulse-blue" : "text-muted-text"} />
          </div>
          <div className={`text-[11px] mt-1 ${view === "queue" ? "text-pulse-blue" : "text-muted-text"}`}>
            Reds + hard triggers
          </div>
        </button>

        <FilterCard
          label="All Accounts"
          value={accounts.length}
          active={view === "all"}
          onClick={() => setView("all")}
          sub="Sortable list"
        />
        <FilterCard
          label="Silent"
          value={silentAccounts.length}
          active={view === "silent"}
          onClick={() => setView("silent")}
          sub="No login 7+ days"
        />
        <FilterCard
          label="Integration Issues"
          value={integrationIssues.length}
          active={view === "integrations"}
          onClick={() => setView("integrations")}
          sub="Stale or broken syncs"
        />
        <FilterCard
          label="Overrides"
          value={overrideAccounts.length}
          active={view === "overrides"}
          onClick={() => setView("overrides")}
          sub="CSM ≠ computed"
        />
      </div>

      {/* Account list + detail panel */}
      <div className="grid grid-cols-12 gap-4">
        {/* Account list */}
        <div className="col-span-7">
          <Panel title={listTitle(view)} subtitle={`${filtered.length} accounts`} noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-subtle border-b border-panel-border">
                  <tr className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium">
                    <th className="text-left px-4 py-2.5 font-medium">Account</th>
                    <th className="text-center px-2 py-2.5 font-medium">Tier</th>
                    <th className="text-right px-2 py-2.5 font-medium">Score</th>
                    <th className="text-right px-2 py-2.5 font-medium">WAP Δ</th>
                    <th className="text-right px-2 py-2.5 font-medium">Last login</th>
                    <th className="text-right px-2 py-2.5 font-medium">ARR</th>
                    <th className="text-center px-2 py-2.5 font-medium">Flags</th>
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
                        <div className="font-medium text-midnight">{a.name}</div>
                        <div className="text-[11px] text-muted-text mt-0.5">
                          {a.segment} · {a.vertical}
                        </div>
                      </td>
                      <td className="text-center px-2">
                        <TierDot tier={a.tier} />
                      </td>
                      <td className="text-right px-2 font-mono tabular text-midnight font-medium">
                        {a.computedScore}
                      </td>
                      <td className="text-right px-2 font-mono tabular">
                        <span className={a.wapDeltaPct < -20 ? "text-status-red" : a.wapDeltaPct < 0 ? "text-status-yellow" : "text-status-green"}>
                          {a.wapDeltaPct > 0 ? "+" : ""}{a.wapDeltaPct}%
                        </span>
                      </td>
                      <td className="text-right px-2 font-mono tabular text-muted-text">
                        {a.daysSinceLogin === 0 ? "today" : `${a.daysSinceLogin}d`}
                      </td>
                      <td className="text-right px-2 font-mono tabular text-midnight">
                        {formatCurrency(a.arr, true)}
                      </td>
                      <td className="text-center px-2">
                        <div className="flex justify-center gap-1">
                          {a.hardTriggers.length > 0 && (
                            <span title={a.hardTriggers.join(", ")}>
                              <AlertCircle size={13} className="text-status-red" />
                            </span>
                          )}
                          {a.hasOverride && (
                            <span title={`Override: ${a.overrideReason}`}>
                              <ArrowUpRight size={13} className="text-protocol-blue" />
                            </span>
                          )}
                          {a.championLastConfirmed > 60 && (
                            <span title="Champion confirmation overdue">
                              <Clock size={13} className="text-status-yellow" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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

function FilterCard({
  label,
  value,
  active,
  onClick,
  sub,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-sm border transition-all ${
        active
          ? "bg-navy-core text-white border-navy-core"
          : "bg-panel-bg border-panel-border hover:border-protocol-blue"
      }`}
    >
      <div className={`text-[10px] font-medium uppercase tracking-[0.12em] ${active ? "text-pulse-blue" : "text-muted-text"}`}>
        {label}
      </div>
      <div className="font-display text-3xl font-medium tabular mt-1">
        {value}
      </div>
      <div className={`text-[11px] mt-1 ${active ? "text-pulse-blue" : "text-muted-text"}`}>
        {sub}
      </div>
    </button>
  );
}

function listTitle(view: ViewMode): string {
  switch (view) {
    case "queue": return "Today's Queue — accounts requiring CSM action";
    case "all": return "All Accounts";
    case "silent": return "Silent Accounts — no practitioner login in 7+ days";
    case "integrations": return "Accounts with Integration Issues";
    case "overrides": return "CSM Overrides — status differs from computed tier";
  }
}

function AccountDetail({ account }: { account: Account }) {
  const a = account;
  return (
    <Panel title={a.name} subtitle={`${a.id} · ${a.csmOwner}`} noPadding>
      <div className="px-5 py-4 space-y-4">
        {/* Status row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusPill tier={a.tier} />
            <span className="text-[11px] text-muted-text">computed</span>
            {a.hasOverride && (
              <>
                <span className="text-muted-text">→</span>
                <StatusPill tier={a.csmStatus} />
                <span className="text-[11px] text-muted-text">CSM-set</span>
              </>
            )}
          </div>
          <div className="text-right">
            <div className="font-display text-3xl font-medium tabular text-midnight">
              {a.computedScore}
            </div>
            <div className="text-[10px] uppercase tracking-[0.1em] text-muted-text">
              health score
            </div>
          </div>
        </div>

        {a.hasOverride && (
          <div className="bg-light-bg border-l-2 border-protocol-blue px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.1em] text-protocol-blue font-medium">
              Override active
            </div>
            <div className="text-xs text-dark-text mt-0.5">{a.overrideReason}</div>
            <div className="text-[10px] text-muted-text mt-1">Re-justify in 12 days</div>
          </div>
        )}

        {a.hardTriggers.length > 0 && (
          <div className="bg-rose-50 border-l-2 border-status-red px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.1em] text-status-red font-medium">
              Hard escalation triggers
            </div>
            {a.hardTriggers.map((t, i) => (
              <div key={i} className="text-xs text-dark-text mt-1">
                · {t}
              </div>
            ))}
          </div>
        )}

        {/* Score components */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium mb-2.5">
            Score components
          </div>
          <div className="space-y-1.5 text-[11px]">
            <ComponentRow label="Practitioner engagement (35%)" value={a.components.engagement} />
            <ComponentRow label="Recency (20%)" value={a.components.recency} />
            <ComponentRow label="Integration health (20%)" value={a.components.integrations} />
            <ComponentRow label="Seat utilization (15%)" value={a.components.seats} />
            <ComponentRow label="Activation (10%)" value={a.components.activation} />
          </div>
        </div>

        {/* Key metrics grid */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-panel-border">
          <DetailMetric label="WAP" value={`${a.wapCurrent}`} sub={`vs ${a.wapTrailing} trail`} />
          <DetailMetric
            label="WAP Δ"
            value={`${a.wapDeltaPct > 0 ? "+" : ""}${a.wapDeltaPct}%`}
            valueColor={a.wapDeltaPct < -20 ? "text-status-red" : a.wapDeltaPct < 0 ? "text-status-yellow" : "text-status-green"}
            sub="vs 4-wk avg"
          />
          <DetailMetric label="Days dark" value={`${a.daysSinceLogin}d`} sub="since last login" />
          <DetailMetric
            label="Seats active"
            value={`${a.seatsActive}/${a.seatsPurchased}`}
            sub={`${Math.round((a.seatsActive / a.seatsPurchased) * 100)}% utilization`}
          />
          <DetailMetric
            label="Integrations"
            value={`${a.integrationsSyncing} live`}
            sub={a.integrationsStale > 0 ? `${a.integrationsStale} stale` : "all healthy"}
            valueColor={a.integrationsStale > 0 ? "text-status-yellow" : undefined}
          />
          <DetailMetric label="ARR" value={formatCurrency(a.arr, true)} sub="annual" />
          <DetailMetric label="AI cost" value={formatCurrency(a.aiCost30d)} sub="trailing 30d" />
          <DetailMetric
            label="Cost/WAP"
            value={formatCurrency(Math.round(a.costPerWap))}
            sub={a.costPerWap > 100 ? "above book avg" : "within range"}
            valueColor={a.costPerWap > 100 ? "text-status-yellow" : undefined}
          />
        </div>

        <div className="pt-3 border-t border-panel-border">
          <div className="text-[10px] uppercase tracking-[0.1em] text-muted-text font-medium mb-2">
            Suggested action
          </div>
          <div className="text-xs text-dark-text">
            {suggestedAction(a)}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function ComponentRow({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "#10B981" : value >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-text">{label}</span>
      <MiniBar value={value} color={color} width={70} />
    </div>
  );
}

function DetailMetric({
  label,
  value,
  sub,
  valueColor = "text-midnight",
}: {
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.1em] text-muted-text mb-1">
        {label}
      </div>
      <div className={`font-display text-lg font-medium tabular ${valueColor}`}>
        {value}
      </div>
      <div className="text-[10px] text-muted-text mt-0.5">{sub}</div>
    </div>
  );
}

function suggestedAction(a: Account): string {
  if (a.hardTriggers.length > 0) {
    return "Hard trigger fired — direct CSM outreach required today. Pull renewal context, schedule call within 48 hours.";
  }
  if (a.tier === "Red") {
    return `Score in critical range. Pause automation; manual outreach. Components driving Red: ${dominantComponent(a)}.`;
  }
  if (a.tier === "Yellow") {
    return `Score is recoverable. Pardot re-engagement queued; Appcues will surface relevant checklist next login. Monitor for 14 days; escalate if no recovery.`;
  }
  if (a.seatsActive / a.seatsPurchased > 0.85) {
    return `Expansion signal: seat utilization above 85%. Worth conversation on tier upgrade or seat expansion at next touch.`;
  }
  return "No action required. Account is healthy.";
}

function dominantComponent(a: Account): string {
  const sorted = Object.entries(a.components).sort(([, v1], [, v2]) => v1 - v2);
  return sorted.slice(0, 2).map(([k]) => k).join(", ");
}
