"use client";

import { useState, useMemo } from "react";
import ExecutiveDashboard from "@/components/ExecutiveDashboard";
import CSLeadershipDashboard from "@/components/CSLeadershipDashboard";
import PLGEngagementDashboard from "@/components/PLGEngagementDashboard";
import OnboardingLifecycleDashboard from "@/components/OnboardingLifecycleDashboard";
import PSDeliveryDashboard from "@/components/PSDeliveryDashboard";
import { signOut } from "next-auth/react";

type View = "lifecycle" | "executive" | "cs" | "plg" | "ps";

function getWeekLabel(): { weekOf: string; isoWeek: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const weekOf = monday.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  // ISO week number
  const jan4 = new Date(monday.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const weekNum = Math.round((monday.getTime() - startOfWeek1.getTime()) / 604800000) + 1;
  const isoWeek = `ISO-${monday.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
  return { weekOf, isoWeek };
}

export default function Home() {
  const [view, setView] = useState<View>("lifecycle");
  const { weekOf, isoWeek } = useMemo(() => getWeekLabel(), []);

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
              <div className="text-white/60">Mike Morrison · COO</div>
              <button
                onClick={handleSignOut}
                className="text-white/40 hover:text-white/70 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>

          <div className="py-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="font-display text-[36px] font-medium leading-tight tracking-tight">
                  Customer Success
                </div>
              </div>
              <div className="text-right text-[11px] text-white/60">
                <div>Week of {weekOf}</div>
                <div className="font-mono tabular text-pulse-blue mt-0.5">{isoWeek}</div>
              </div>
            </div>

            <nav className="flex gap-1 mt-8 -mb-px">
              <TabButton
                active={view === "lifecycle"}
                onClick={() => setView("lifecycle")}
                label="Onboarding Lifecycle"
                sub="Onboarding Status, SLA and Workbench"
                accent
              />
              <TabButton
                active={view === "ps"}
                onClick={() => setView("ps")}
                label="PS Delivery"
                sub="Projects · capacity · risk"
              />
              <TabButton
                active={view === "executive"}
                onClick={() => setView("executive")}
                label="Executive"
                sub="Weekly review · Mike, Ian, Gavin"
              />
              <TabButton
                active={view === "cs"}
                onClick={() => setView("cs")}
                label="CS Leadership"
                sub="Daily workbench"
              />
              <TabButton
                active={view === "plg"}
                onClick={() => setView("plg")}
                label="PLG Engagement"
                sub="Weekly review"
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
          {view === "ps" && <PSDeliveryDashboard />}
        </div>
      </main>

      <footer className="bg-white border-t border-panel-border">
        <div className="max-w-[1440px] mx-auto px-8 py-6 flex items-center justify-between text-[11px] text-muted-text">
          <div>
            <span className="font-medium text-midnight">HeadsUp Health LLC.</span> · CS Operating Dashboard
          </div>
          <div className="flex items-center gap-6">
            <span>
              Data sources: <span className="font-mono">Salesforce · PostHog · Stripe · Billing module · Pardot</span>
            </span>
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
