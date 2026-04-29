"use client";

import { Panel, SectionHeader, formatCurrency } from "./ui";
import {
  interventionPerformance,
  agentIntelligence,
  onboardingFunnel,
  trendData,
} from "@/lib/mockData";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

export default function PLGEngagementDashboard() {
  return (
    <div className="tab-fade-in">
      <SectionHeader
        kicker="PLG Engagement · Weekly review"
        title="Campaign performance & deflection"
        sub="Cross-functional review for Angela (Marketing), Elaine (CS), Peter (PS). What fired, what converted, where we have content gaps."
      />

      {/* Top stats — channel summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {interventionPerformance.map(c => (
          <Panel key={c.channel}>
            <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-text mb-1.5">
              {c.channel}
            </div>
            <div className="font-display text-3xl font-medium tabular text-midnight">
              {c.fired}
            </div>
            <div className="text-[11px] text-muted-text mt-1">interventions fired</div>
            <div className="mt-3 pt-3 border-t border-panel-border flex justify-between items-baseline">
              <div>
                <div className="text-[10px] text-muted-text uppercase tracking-wider">Recovery</div>
                <div className="font-mono tabular text-sm font-medium text-status-green">
                  {c.recoveryRate}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-text uppercase tracking-wider">Engaged</div>
                <div className="font-mono tabular text-sm font-medium text-midnight">
                  {Math.round((c.completed / c.fired) * 100)}%
                </div>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      {/* Onboarding funnel + TTFV trend */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel title="Onboarding Funnel" subtitle="New accounts in trailing 60 days">
          <div className="space-y-2.5">
            {onboardingFunnel.map((stage, i) => {
              const prev = i > 0 ? onboardingFunnel[i - 1] : null;
              const dropoff = prev ? prev.count - stage.count : 0;
              const dropoffPct = prev ? Math.round((dropoff / prev.count) * 100) : 0;
              return (
                <div key={stage.stage}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[12px] text-dark-text">{stage.stage}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-base font-medium tabular text-midnight">
                        {stage.count}
                      </span>
                      <span className="text-[10px] font-mono tabular text-muted-text w-9 text-right">
                        {stage.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="relative h-6 bg-slate-100 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-protocol-blue to-pulse-blue rounded-sm flex items-center"
                      style={{ width: `${stage.pct}%` }}
                    />
                    {dropoff > 0 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono tabular text-status-red font-medium">
                        −{dropoff} ({dropoffPct}%)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-panel-border text-[11px] text-muted-text">
            Largest drop: First integration → First Health Score viewed (−2 accounts, 11%). Investigation: integration setup friction or unclear next step.
          </div>
        </Panel>

        <Panel title="Time-to-First-Value Trend" subtitle="Median days, 12-week trend">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} domain={[6, 16]} />
                <Tooltip
                  contentStyle={{
                    background: "#0B1526",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 11,
                    color: "white",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ttfv"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#2563EB" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 pt-3 border-t border-panel-border grid grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-text">Now</div>
              <div className="font-display text-lg font-medium tabular text-midnight">9d</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-text">12wk ago</div>
              <div className="font-display text-lg font-medium tabular text-muted-text">14d</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-text">Δ</div>
              <div className="font-display text-lg font-medium tabular text-status-green">−5d</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Agent intelligence */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Panel
          title="Agent Intelligence"
          subtitle="Top question categories — what users are asking"
          className="col-span-2"
        >
          <div className="space-y-2">
            {agentIntelligence
              .sort((a, b) => b.count - a.count)
              .map(cat => {
                const max = Math.max(...agentIntelligence.map(c => c.count));
                const escalationRate = (cat.escalated / cat.count) * 100;
                const isHighEscalation = escalationRate > 30;
                return (
                  <div key={cat.category} className="grid grid-cols-12 gap-3 items-center text-[12px]">
                    <div className="col-span-4 text-dark-text">{cat.category}</div>
                    <div className="col-span-5">
                      <div className="h-5 bg-slate-100 rounded-sm overflow-hidden relative">
                        <div
                          className={`h-full rounded-sm ${
                            isHighEscalation ? "bg-status-red" : "bg-protocol-blue"
                          }`}
                          style={{ width: `${(cat.count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="col-span-1 text-right font-mono tabular text-midnight font-medium">
                      {cat.count}
                    </div>
                    <div className="col-span-2 text-right">
                      <span
                        className={`text-[10px] font-mono tabular ${
                          isHighEscalation ? "text-status-red" : "text-muted-text"
                        }`}
                      >
                        {cat.escalated} esc ({escalationRate.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="mt-4 pt-3 border-t border-panel-border text-[11px] text-muted-text">
            <span className="text-status-red font-medium">Cancellation/pricing</span> at 100% escalation — every conversation in this category fires to CSM. Working as designed.
            <br />
            <span className="text-status-red font-medium">Billing/subscription</span> at 29% escalation suggests a documentation gap; Peter to review.
          </div>
        </Panel>

        <Panel title="Documentation Gaps" subtitle="What the agent couldn't fully resolve">
          <div className="space-y-3">
            {[
              { topic: "Withings Cardio Beat sync errors", count: 14, action: "Doc update needed" },
              { topic: "Stelo CGM data delay explanation", count: 9, action: "Add FAQ" },
              { topic: "Multi-location seat allocation", count: 7, action: "Update training" },
              { topic: "Custom protocol templates", count: 5, action: "Feature gap?" },
            ].map(g => (
              <div key={g.topic} className="border-b border-panel-border last:border-0 pb-3 last:pb-0">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] font-medium text-dark-text">{g.topic}</span>
                  <span className="font-mono tabular text-sm text-midnight">{g.count}</span>
                </div>
                <div className="text-[10px] text-protocol-blue mt-0.5 font-medium">
                  → {g.action}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Channel deep-dive */}
      <Panel
        title="Channel Performance Detail"
        subtitle="Engagement → completion → recovery, last 7 days"
      >
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={interventionPerformance}
              margin={{ top: 20, right: 20, bottom: 5, left: -10 }}
            >
              <CartesianGrid strokeDasharray="2 4" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="channel"
                tick={{ fontSize: 11, fill: "#0F172A" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#0B1526",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 11,
                  color: "white",
                }}
                cursor={{ fill: "rgba(37, 99, 235, 0.05)" }}
              />
              <Bar dataKey="fired" fill="#6B9FE4" radius={[2, 2, 0, 0]} />
              <Bar dataKey="completed" fill="#2563EB" radius={[2, 2, 0, 0]} />
              <Bar dataKey="recovered" fill="#10B981" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex justify-center gap-6 text-[11px] text-muted-text">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-pulse-blue"></span> Fired
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-protocol-blue"></span> Engaged
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-status-green"></span> Recovered
          </div>
        </div>
      </Panel>
    </div>
  );
}
