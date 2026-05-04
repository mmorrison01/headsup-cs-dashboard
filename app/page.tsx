"use client";

import { useState } from "react";
import ExecutiveDashboard from "@/components/ExecutiveDashboard";
import CSLeadershipDashboard from "@/components/CSLeadershipDashboard";
import PLGEngagementDashboard from "@/components/PLGEngagementDashboard";
import OnboardingLifecycleDashboard from "@/components/OnboardingLifecycleDashboard";
import { signOut } from "next-auth/react";

type View = "lifecycle" | "executive" | "cs" | "plg";

export default function Home() {
  const [view, setView] = useState<View>("lifecycle");

  async function handleSignOut() {
    await signOut({ callbackUrl: '/auth/sign-in' });
  }

  return (
    <div className="min-h-screen">
      <header className="bg-midnight text-white">
        <div className="max-w-[1440px] mx-auto px-8">
          <div className="flex items-center justify-between py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-sm bg-protocol-blue flex items-center justify-center">
                <span className="font-display text-sm font-bold text-white">H</span>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-pulse-blue font-semibold">
                  Heads Up
                </div>
                <div className="text-[11px] text-white/70 -mt-0.5">CS Operating Dashboard</div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-[11px]">
              <div className="text-pulse-blue uppercase tracking-wider font-medium">
                Draft v0.2
              </div>
              <div className="text-white/60">Mike Morrison · COO</div>
              <button
                onClick={handleSignOut}
                className="text-white/40 hover:text-white/70 transition-colors"
              >
                Sign out
              </button>
              <div className="px-2 py-1 rounded-sm bg-white/10 text-[10px] uppercase tracking-wider">
                Mock Data
              </div>
            </div>
          </div>

          <div className="py-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="font-display text-[36px] font-medium leading-tight tracking-tight">
                  PLG Customer Success
                </div>
                <div className="text-[13px] text-white/60 mt-1 font-light">
                  Operating model v2.0 — proposed dashboard surface for team review
                </div>
              </div>
              <div className="text-right text-[11px] text-white/60">
                <div>Week of April 27, 2026</div>
                <div className="font-mono tabular text-pulse-blue mt-0.5">ISO-2026-W18</div>
              </div>
            </div>

            <nav className="flex gap-1 mt-8 -mb-px">
              <TabButton
                active={view === "lifecycle"}
                onClick={() => setView("lifecycle")}
                label="Onboarding Lifecycle"
                sub="Mon 9am MST · Mike + CSMs + ProdOps + PS"
                accent
              />
              <TabButton
                active={view === "executive"}
                onClick={() => setView("executive")}
                label="Executive"
                sub="Weekly review · Mike, John, Gavin"
              />
              <TabButton
                active={view === "cs"}
                onClick={() => setView("cs")}
                label="CS Leadership"
                sub="Daily workbench · Elaine + team"
              />
              <TabButton
                active={view === "plg"}
                onClick={() => setView("plg")}
                label="PLG Engagement"
                sub="Weekly review · Angela, Elaine, Peter"
              />
            </nav>
          </div>
        </div>
      </header>

      <main className="bg-light-bg pt-8 pb-16">
        <div className="max-w-[1440px] mx-auto px-8">
          {view === "lifecycle" && <OnboardingLifecycleDashboard />}
          {view === "executive" && <ExecutiveDashboard />}
          {view === "cs" && <CSLeadershipDashboard />}
          {view === "plg" && <PLGEngagementDashboard />}
        </div>
      </main>

      <footer className="bg-white border-t border-panel-border">
        <div className="max-w-[1440px] mx-auto px-8 py-6 flex items-center justify-between text-[11px] text-muted-text">
          <div>
            <span className="font-medium text-midnight">Heads Up Health, Inc.</span> · CS Operating Dashboard
          </div>
          <div className="flex items-center gap-6">
            <span>
              Data sources: <span className="font-mono">Salesforce · PostHog · Stripe · Billing module · Pardot</span>
            </span>
            <span className="text-protocol-blue">Draft for team review — not production data</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  sub,
  accent = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left px-5 py-3 rounded-t-sm transition-colors border-b-2 relative ${
        active
          ? "bg-light-bg border-cyan text-midnight"
          : "border-transparent text-white/60 hover:text-white"
      }`}
    >
      {accent && !active && (
        <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
      )}
      <div className={`text-sm font-medium ${active ? "text-midnight" : ""}`}>{label}</div>
      <div className={`text-[10px] mt-0.5 ${active ? "text-muted-text" : "text-white/50"}`}>{sub}</div>
    </button>
  );
}
