import { NextResponse } from "next/server";
import { getSalesforceConnection, isSalesforceConfigured } from "@/lib/salesforce";

export const runtime = "nodejs";
export const revalidate = 0;

const BUCKET_LABELS: Record<string, string> = {
  "1 - Hand-Raised 2.0 Migration": "B1",
  "2 - Deferred 2.0 Migration": "B2",
  "3 - Pre-Kickoff Active": "B3",
  "4 - Post-Kickoff STUCK": "B4",
  "5 - Mid-Journey Working": "B5",
  "6 - Near-Launch": "B6",
  "7 - Launched": "B7",
};

const SLA_AMBER: Record<string, Record<string, number>> = {
  B1: { pro: 7,  premiere: 7,  enterprise: 7  },
  B2: { pro: 60, premiere: 60, enterprise: 60 },
  B3: { pro: 10, premiere: 10, enterprise: 10 },
  B4: { pro: 7,  premiere: 7,  enterprise: 7  },
  B5: { pro: 21, premiere: 30, enterprise: 40 },
  B6: { pro: 30, premiere: 35, enterprise: 60 },
  B7: { pro: 35, premiere: 40, enterprise: 90 },
};

const SLA_RED: Record<string, Record<string, number>> = {
  B1: { pro: 7,  premiere: 7,  enterprise: 7  },
  B2: { pro: 60, premiere: 60, enterprise: 60 },
  B3: { pro: 12, premiere: 12, enterprise: 12 },
  B4: { pro: 12, premiere: 12, enterprise: 12 },
  B5: { pro: 26, premiere: 35, enterprise: 45 },
  B6: { pro: 35, premiere: 40, enterprise: 65 },
  B7: { pro: 40, premiere: 45, enterprise: 95 },
};

function getTier(pkg: string | null): "pro" | "premiere" | "enterprise" | null {
  if (!pkg) return null;
  const p = pkg.toLowerCase();
  if (p.includes("enterprise")) return "enterprise";
  if (p.includes("premiere") || p.includes("premier")) return "premiere";
  if (p.includes("professional") || p === "pro" || p.includes("essential") || p.includes("trial")) return "pro";
  return null;
}

function computeSLAStatus(bucket: string, days: number, pkg: string | null): "red" | "amber" | "on-track" | null {
  const tier = getTier(pkg);
  if (!tier) return null;
  const amberRow = SLA_AMBER[bucket];
  const redRow = SLA_RED[bucket];
  if (!amberRow || !redRow) return null;
  if (days >= redRow[tier]) return "red";
  if (days >= amberRow[tier]) return "amber";
  return "on-track";
}

function slaToHealth(sla: "red" | "amber" | "on-track"): string {
  if (sla === "red") return "Critical";
  if (sla === "amber") return "At Risk";
  return "On Track";
}

export interface SyncPreview {
  preview: true;
  total: number;
  toUpdate: number;
  breakdown: { toCritical: number; toAtRisk: number; toOnTrack: number; skipped: number };
  changes: Array<{ projectId: string; accountName: string; bucket: string; days: number | null; currentHealth: string | null; targetHealth: string }>;
}

export interface SyncResult {
  applied: true;
  updated: number;
}

// GET — preview what would change
export async function GET() {
  return runSync(false);
}

// POST — apply the updates
export async function POST() {
  return runSync(true);
}

async function runSync(apply: boolean): Promise<NextResponse> {
  if (!isSalesforceConfigured()) {
    return NextResponse.json({ error: "Salesforce not configured" }, { status: 503 });
  }

  try {
    const conn = await getSalesforceConnection();

    const projRecs: any[] = await (conn as any)
      .query(`SELECT Id, Project_Health__c, Service_Package__c, Account__c, Account__r.Name, Account__r.Onboarding_Status__c FROM Project__c WHERE Stage__c IN ('Onboard','Hypercare') AND CSM__c != null AND (Account__r.Account_Status__c IN ('Active','Paused') OR Account__r.Account_Status__c = null) AND (NOT Account__r.Name LIKE '%Amber Test%')`)
      .then((r: any) => r.records ?? []);

    // Days in current bucket from AccountHistory
    const acctIds = [...new Set(projRecs.map((r: any) => r.Account__c as string))];
    const acctDays: Record<string, number> = {};
    for (let i = 0; i < acctIds.length; i += 200) {
      const batch = acctIds.slice(i, i + 200);
      const idsStr = batch.map(id => `'${id}'`).join(",");
      const histRecs: any[] = await (conn as any)
        .query(`SELECT AccountId, CreatedDate FROM AccountHistory WHERE Field = 'Onboarding_Status__c' AND AccountId IN (${idsStr}) ORDER BY CreatedDate DESC`)
        .then((r: any) => r.records ?? []);
      const seen = new Set<string>();
      for (const r of histRecs) {
        if (!seen.has(r.AccountId)) {
          seen.add(r.AccountId);
          acctDays[r.AccountId] = Math.floor((Date.now() - new Date(r.CreatedDate).getTime()) / 86400000);
        }
      }
    }

    const toUpdate: Array<{ projectId: string; accountName: string; bucket: string; days: number | null; currentHealth: string | null; targetHealth: string }> = [];
    let skipped = 0;

    for (const r of projRecs) {
      const bucket = BUCKET_LABELS[r.Account__r.Onboarding_Status__c ?? ""] ?? null;
      if (!bucket) { skipped++; continue; }
      const days = acctDays[r.Account__c] ?? null;
      if (days === null) { skipped++; continue; }
      const sla = computeSLAStatus(bucket, days, r.Service_Package__c);
      if (!sla) { skipped++; continue; }
      const target = slaToHealth(sla);
      if (r.Project_Health__c === target) continue;
      toUpdate.push({
        projectId: r.Id,
        accountName: r.Account__r.Name,
        bucket,
        days,
        currentHealth: r.Project_Health__c ?? null,
        targetHealth: target,
      });
    }

    if (!apply) {
      const breakdown = {
        toCritical: toUpdate.filter(r => r.targetHealth === "Critical").length,
        toAtRisk:   toUpdate.filter(r => r.targetHealth === "At Risk").length,
        toOnTrack:  toUpdate.filter(r => r.targetHealth === "On Track").length,
        skipped,
      };
      return NextResponse.json({ preview: true, total: projRecs.length, toUpdate: toUpdate.length, breakdown, changes: toUpdate } satisfies SyncPreview);
    }

    // Apply in batches of 200
    let updated = 0;
    for (let i = 0; i < toUpdate.length; i += 200) {
      const batch = toUpdate.slice(i, i + 200).map(r => ({ Id: r.projectId, Project_Health__c: r.targetHealth }));
      await (conn as any).sobject("Project__c").update(batch);
      updated += batch.length;
    }

    return NextResponse.json({ applied: true, updated } satisfies SyncResult);
  } catch (err) {
    console.error("sync-health error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
