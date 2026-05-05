"use client";

import {
  Panel,
  Stat,
  StatusPill,
  Sparkline,
  SectionHeader,
  formatCurrency,
} from "./ui";
import {
  bookSummary,
  trendData,
  verticalBreakdown,
  interventionPerformance,
  accounts,
} from "@/lib/mockData";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, Cell, AreaChart, Area, CartesianGrid } from "recharts";
import { TrendingUp, AlertTriangle, Users, DollarSign } from "lucide-react";

export default function ExecutiveDashboard() {
  const arrTotal = bookSummary.totalArr;
  const arrAtRisk = bookSummary.arrByTier.Red + bookSummary.arrByTier.Yellow;
  const arrAtRiskPct = (arrAtRisk / arrTotal) * 100;
  const wapDelta = ((bookSummary.totalWap - bookSummary.totalWapPrior) / bookSummary.totalWapPrior) * 100;

  return (
    <div className="tab-fade-in">
      <div className="mb-6 rounded-md border-2 border-red-600 bg-red-50 px-5 py-4 text-center">
        <span className="font-bold text-red-600 text-sm uppercase tracking-wide">Draft — Not Yet Implemented</span>
        <p className="text-red-500 text-xs mt-1">This dashboard is a placeholder. Data shown is mock/sample only.</p>
      </div>
      <SectionHeader
        kicker="Executive Review · Week of April 27, 2026"
        title="Book health at a glance"
        sub="Reviewed Mondays. Values reflect the prior completed ISO week. Source: PostHog group analytics + Stripe + billing module via SFDC bridge."
      />

      {/* Top-line KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Panel className="!bg-gradient-to-br from-midnight to-navy-core text-white border-0">
          <div className="px-1">
            <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-pulse-blue mb-1.5">
              Total Book ARR
            </div>
            <div className="font-display text-4xl font-medium tabular">
              {formatCurrency(arrTotal, true)}
            </div>
            <div className="text-[11px] text-pulse-blue mt-1.5">
              Across {bookSummary.totalAccounts} active accounts
            </div>
          </div>
        </Panel>
        <Panel>
          <Stat
            label="ARR at risk"
            value={`${arrAtRiskPct.toFixed(0)}%`}
            delta={3}
            deltaLabel="% pts WoW"
            size="md"
          />
          <div className="text-[11px] text-muted-text mt-2">
            {formatCurrency(arrAtRisk, true)} in Yellow + Red
          </div>
        </Panel>
        <Panel>
          <Stat
            label="Weekly Active Practitioners"
            value={bookSummary.totalWap}
            delta={Math.round(wapDelta)}
            deltaLabel="% WoW"
          />
          <div className="text-[11px] text-muted-text mt-2">
            vs. {bookSummary.totalWapPrior} prior 4-wk avg
          </div>
        </Panel>
        <Panel>
          <Stat
            label="AI cost (trailing 30d)"
            value={formatCurrency(bookSummary.totalAiCost, true)}
            delta={8}
            deltaLabel="% MoM"
          />
          <div className="text-[11px] text-muted-text mt-2">
            Avg {formatCurrency(Math.round(bookSummary.totalAiCost / bookSummary.totalAccounts))} per tenant
          </div>
        </Panel>
      </div>

      {/* Tier distribution + trend */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Panel title="Tier Distribution" subtitle="Computed health, current week">
          <TierDistribution />
        </Panel>
        <Panel title="12-Week Trend" subtitle="Account count by tier" className="col-span-2">
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0B1526",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 11,
                    color: "white",
                  }}
                  labelStyle={{ color: "#6B9FE4" }}
                />
                <Area type="monotone" dataKey="green" stackId="1" fill="#10B981" stroke="#10B981" fillOpacity={0.85} />
                <Area type="monotone" dataKey="yellow" stackId="1" fill="#F59E0B" stroke="#F59E0B" fillOpacity={0.85} />
                <Area type="monotone" dataKey="red" stackId="1" fill="#EF4444" stroke="#EF4444" fillOpacity={0.85} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Risk concentration + Activation + Vertical */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Panel title="Risk Concentration" subtitle="Reds and hard escalations">
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-text">Net new Reds this week</span>
              <span className="font-display text-2xl font-medium tabular text-status-red">
                +{bookSummary.newRedsThisWeek}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-text">Hard triggers fired</span>
              <span className="font-display text-2xl font-medium tabular text-midnight">
                {bookSummary.hardTriggersThisWeek}
              </span>
            </div>
            <div className="flex items-baseline justify-between border-t border-panel-border pt-3">
              <span className="text-xs text-muted-text">ARR exposure on Red</span>
              <span className="font-display text-2xl font-medium tabular text-midnight">
                {formatCurrency(bookSummary.arrByTier.Red, true)}
              </span>
            </div>
          </div>
        </Panel>

        <Panel title="Activation" subtitle="New accounts hitting first value">
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-text">Activated this week</span>
              <span className="font-display text-2xl font-medium tabular text-status-green">
                +{bookSummary.newActivationsThisWeek}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-text">Median TTFV</span>
              <div className="text-right">
                <span className="font-display text-2xl font-medium tabular text-midnight">
                  {bookSummary.medianTtfvDays}d
                </span>
                <span className="text-[11px] text-status-green ml-2">
                  ▼ {bookSummary.medianTtfvDaysPrior - bookSummary.medianTtfvDays}d
                </span>
              </div>
            </div>
            <div className="border-t border-panel-border pt-3">
              <div className="text-[11px] text-muted-text mb-1">TTFV trend (12 weeks)</div>
              <Sparkline
                data={trendData.map(d => d.ttfv)}
                color="#10B981"
                width={240}
                height={28}
              />
            </div>
          </div>
        </Panel>

        <Panel title="WAP by Vertical" subtitle="Where engagement lives">
          <div className="space-y-2.5">
            {verticalBreakdown.map(v => {
              const max = Math.max(...verticalBreakdown.map(x => x.wap));
              const pct = (v.wap / max) * 100;
              return (
                <div key={v.vertical}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[11px] text-dark-text">{v.vertical}</span>
                    <span className="text-[11px] font-mono tabular text-midnight font-medium">
                      {v.wap}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-protocol-blue rounded-sm"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Automation health */}
      <div className="grid grid-cols-2 gap-4">
        <Panel title="Automation Health" subtitle="Interventions fired this week, by channel">
          <div className="space-y-3">
            {interventionPerformance.map(c => (
              <div key={c.channel} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3 text-sm font-medium text-dark-text">
                  {c.channel}
                </div>
                <div className="col-span-2 text-right">
                  <div className="font-mono tabular text-sm text-midnight">{c.fired}</div>
                  <div className="text-[10px] text-muted-text">fired</div>
                </div>
                <div className="col-span-2 text-right">
                  <div className="font-mono tabular text-sm text-midnight">{c.completed}</div>
                  <div className="text-[10px] text-muted-text">engaged</div>
                </div>
                <div className="col-span-2 text-right">
                  <div className="font-mono tabular text-sm text-status-green">{c.recovered}</div>
                  <div className="text-[10px] text-muted-text">recovered</div>
                </div>
                <div className="col-span-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-protocol-blue rounded-sm"
                        style={{ width: `${c.recoveryRate * 2.5}%` }}
                      ></div>
                    </div>
                    <span className="text-[11px] font-mono tabular text-midnight w-9 text-right">
                      {c.recoveryRate}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-panel-border text-[11px] text-muted-text">
            Recovery = score climbed at least one tier within 14 days of intervention. Counterfactual hold-out testing planned for Q3.
          </div>
        </Panel>

        <Panel title="Expansion Signals" subtitle="Accounts firing tier-ceiling triggers">
          <div className="space-y-3">
            {accounts
              .filter(a => a.seatsActive / a.seatsPurchased > 0.85 && a.tier === "Green")
              .slice(0, 5)
              .map(a => (
                <div key={a.id} className="flex items-center justify-between border-b border-panel-border last:border-0 pb-3 last:pb-0">
                  <div>
                    <div className="text-sm font-medium text-midnight">{a.name}</div>
                    <div className="text-[11px] text-muted-text mt-0.5">
                      {a.seatsActive}/{a.seatsPurchased} seats · {a.vertical}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg font-medium tabular text-midnight">
                      {formatCurrency(a.arr, true)}
                    </div>
                    <div className="text-[10px] text-muted-text">current ARR</div>
                  </div>
                </div>
              ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function TierDistribution() {
  const tiers: Array<{ name: "Green" | "Yellow" | "Red"; color: string }> = [
    { name: "Green", color: "#10B981" },
    { name: "Yellow", color: "#F59E0B" },
    { name: "Red", color: "#EF4444" },
  ];
  const total = bookSummary.totalAccounts;

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-3 rounded-sm overflow-hidden mb-4">
        {tiers.map(t => {
          const count = bookSummary.byTier[t.name];
          const pct = (count / total) * 100;
          return (
            <div
              key={t.name}
              style={{ width: `${pct}%`, background: t.color }}
              title={`${t.name}: ${count}`}
            />
          );
        })}
      </div>
      {/* Legend with values */}
      <div className="space-y-2.5">
        {tiers.map(t => {
          const count = bookSummary.byTier[t.name];
          const arr = bookSummary.arrByTier[t.name];
          return (
            <div key={t.name} className="flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: t.color }}></span>
                <span className="text-[11px] text-dark-text font-medium">{t.name}</span>
              </div>
              <div className="text-right">
                <span className="font-display text-base font-medium tabular text-midnight">
                  {count}
                </span>
                <span className="text-[10px] text-muted-text ml-2 tabular">
                  {formatCurrency(arr, true)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
