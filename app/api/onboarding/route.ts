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


// June 1 bucket counts — update once confirmed from SF snapshot
const BASELINE: Record<string, number> = {
  B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0, B7: 0, total: 0,
};

const WEEK_TARGETS: Record<number, string> = { 1: "30-35", 2: "42-48", 3: "48-55", 4: "32-38" };

function getMondayISO(offset = 0): string {
  const d = new Date();
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

function getJuneWeekNumber(): number {
  const now = new Date();
  const sprintStart = new Date(now.getFullYear(), 5, 2); // June 2
  const diffMs = now.getTime() - sprintStart.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  return Math.min(Math.max(diffWeeks + 1, 1), 4);
}


export async function GET() {
  if (!isSalesforceConfigured()) {
    return NextResponse.json({ error: "Salesforce credentials not configured" }, { status: 503 });
  }

  try {
    const conn = await getSalesforceConnection();

    // Active accounts with bucket assignments
    const acctRecs: { Id: string; Onboarding_Status__c: string | null; Total_Deployment_Revenue_Estimate_c__c: number | null; Date_of_Next_Engagement__c: string | null; Service_Package__c: string | null }[] = await (conn as any)
      .query("SELECT Id, Onboarding_Status__c, Total_Deployment_Revenue_Estimate_c__c, Date_of_Next_Engagement__c, Service_Package__c FROM Account WHERE Account_Status__c IN ('Active','Paused') AND (NOT Name LIKE '%Amber Test%')")
      .then((r: any) => r.records ?? []);

    const acctBucket: Record<string, string> = {};
    const acctArr: Record<string, number> = {};
    const acctNextEngagement: Record<string, string | null> = {};
    const acctServicePackageFromAcct: Record<string, string | null> = {};
    for (const r of acctRecs) {
      const raw = r.Onboarding_Status__c ?? "pending";
      acctBucket[r.Id] = BUCKET_LABELS[raw] ?? "pending";
      acctArr[r.Id] = r.Total_Deployment_Revenue_Estimate_c__c ?? 0;
      acctNextEngagement[r.Id] = r.Date_of_Next_Engagement__c ?? null;
      acctServicePackageFromAcct[r.Id] = r.Service_Package__c ?? null;
    }
    const allAcctIds = Object.keys(acctBucket);

    // Active projects (Stage = Onboard / Hypercare / Approved / Completed) drive CSM assignments and detail fields.
    // Completed projects are included so B7/Launched account detail fields render, but excluded from Active Book counts below.
    const projCsm: Record<string, string> = {};
    const projAcct: Record<string, string> = {};
    const projStage: Record<string, string> = {};
    const acctGoLive: Record<string, string | null> = {};
    const acctTemperature: Record<string, string | null> = {};
    const acctParallel10: Record<string, boolean> = {};
    const acctProjectHealth: Record<string, string | null> = {};
    // Seeded from Account.Service_Package__c; Project value fills gaps if Account has none
    const acctServicePackage: Record<string, string | null> = { ...acctServicePackageFromAcct };
    const acctProjectType: Record<string, string | null> = {};
    const acctSolutionsConsultant: Record<string, string | null> = {};
    const acctHypercareDri: Record<string, string | null> = {};
    const acctProjectId: Record<string, string> = {};
    const acctProjectStage: Record<string, string | null> = {};

    const projRecs: any[] = await (conn as any)
      .query(`SELECT Id, CSM__c, CSM__r.Name, Account__c, Stage__c, Customer_Planned_Go_Live_Date__c, Customer_Temperature__c, Parallel_1_0__c, Project_Health__c, Service_Package__c, Project_Type__c, Solutions_Consultant__r.Name, Hypercare_DRI__r.Name FROM Project__c WHERE Stage__c IN ('Needs Review','Onboard','Hypercare','Approved','Completed') AND CSM__c != null AND (Account__r.Account_Status__c IN ('Active','Paused') OR Account__r.Account_Status__c = null) AND (NOT Account__r.Name LIKE '%Amber Test%')`)
      .then((r: any) => r.records ?? []);
    for (const r of projRecs) {
      const acctId = r.Account__c;
      projCsm[r.Id] = r.CSM__c;
      projAcct[r.Id] = acctId;
      acctGoLive[acctId] = r.Customer_Planned_Go_Live_Date__c ?? null;
      acctTemperature[acctId] = r.Customer_Temperature__c ?? null;
      acctParallel10[acctId] = r.Parallel_1_0__c ?? false;
      acctProjectHealth[acctId] = r.Project_Health__c ?? null;
      // Account.Service_Package__c is authoritative; Project.Service_Package__c fills the gap only if Account has nothing
      acctServicePackage[acctId] = acctServicePackageFromAcct[acctId] ?? r.Service_Package__c ?? null;
      acctProjectType[acctId] = r.Project_Type__c ?? null;
      acctSolutionsConsultant[acctId] = r.Solutions_Consultant__r?.Name ?? null;
      acctHypercareDri[acctId] = r.Hypercare_DRI__r?.Name ?? null;
      acctProjectId[acctId] = r.Id;
      acctProjectStage[acctId] = r.Stage__c ?? null;
    }

    // Build dynamic CSM registry from project query results
    const csmIds: Record<string, string> = {};
    for (const r of projRecs) {
      if (r.CSM__c && r.CSM__r?.Name) csmIds[r.CSM__c] = r.CSM__r.Name;
    }
    const csms = [...new Set(Object.values(csmIds))].sort();

    // Onboarding status change dates from AccountHistory (field history tracking)
    const acctStatusChangeDate: Record<string, string | null> = {};
    for (let i = 0; i < allAcctIds.length; i += 200) {
      const batch = allAcctIds.slice(i, i + 200);
      const idsStr = batch.map(id => `'${id}'`).join(",");
      const histRecs: any[] = await (conn as any)
        .query(`SELECT AccountId, CreatedDate FROM AccountHistory WHERE Field = 'Onboarding_Status__c' AND AccountId IN (${idsStr}) ORDER BY CreatedDate DESC`)
        .then((r: any) => r.records ?? []);
      for (const r of histRecs) {
        // First record per account is the most recent (DESC order)
        if (!acctStatusChangeDate[r.AccountId]) {
          acctStatusChangeDate[r.AccountId] = r.CreatedDate;
        }
      }
    }

    // Map account → CSM (last project wins if multiple)
    const acctCsm: Record<string, string> = {};
    for (const [pid, csmId] of Object.entries(projCsm)) {
      acctCsm[projAcct[pid]] = csmId;
    }

    // Backfill CSM from ANY project (regardless of stage) for accounts still missing one.
    // Ensures every active account shows its real SFDC CSM, not "Unassigned".
    const missingCsmAcctIds = allAcctIds.filter(id => !acctCsm[id]);
    if (missingCsmAcctIds.length > 0) {
      for (let i = 0; i < missingCsmAcctIds.length; i += 200) {
        const batch = missingCsmAcctIds.slice(i, i + 200);
        const idsStr = batch.map(id => `'${id}'`).join(",");
        const broadCsmRecs: any[] = await (conn as any)
          .query(`SELECT Account__c, CSM__c, LastModifiedDate FROM Project__c WHERE Account__c IN (${idsStr}) AND CSM__c != null ORDER BY LastModifiedDate DESC`)
          .then((r: any) => r.records ?? []);
        for (const r of broadCsmRecs) {
          if (!acctCsm[r.Account__c]) {
            acctCsm[r.Account__c] = r.CSM__c;
          }
        }
      }
    }

    // Bucket counts — project-based (each project maps to its account's bucket)
    const bucketCounts: Record<string, number> = { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0, B7: 0, pending: 0 };
    const csmBucketCounts: Record<string, Record<string, number>> = {};
    for (const csm of csms) csmBucketCounts[csm] = { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0, B7: 0 };

    for (const [pid, csmId] of Object.entries(projCsm)) {
      const acctId = projAcct[pid];
      const bkey = acctBucket[acctId] ?? "pending";
      bucketCounts[bkey] = (bucketCounts[bkey] ?? 0) + 1;
      const csmName = csmId ? (csmIds[csmId] ?? null) : null;
      if (csmName && csms.includes(csmName) && bkey !== "pending") {
        csmBucketCounts[csmName][bkey] = (csmBucketCounts[csmName][bkey] ?? 0) + 1;
      }
    }

    // All active projects are the metric denominator
    const projCsmEx = { ...projCsm };

    // RT and TP totals (all-time, for completion rate metric)
    const rtRecs: any[] = await (conn as any)
      .query("SELECT WhatId, Status FROM Task WHERE Subject = 'Onboarding - Review Training and Documentation'")
      .then((r: any) => r.records ?? []);
    const tpRecs: any[] = await (conn as any)
      .query("SELECT WhatId, Status FROM Task WHERE Subject = 'Onboarding - Create Internal test patients'")
      .then((r: any) => r.records ?? []);

    const rtDone: Record<string, number> = {};
    const rtTotal: Record<string, number> = {};
    const tpDone: Record<string, number> = {};
    const tpTotal: Record<string, number> = {};

    const projRtDone = new Set<string>();
    const projTpDone = new Set<string>();

    for (const [key, recs, done, total, doneSet] of [
      ["rt", rtRecs, rtDone, rtTotal, projRtDone],
      ["tp", tpRecs, tpDone, tpTotal, projTpDone],
    ] as const) {
      for (const r of recs as any[]) {
        const pid = r.WhatId;
        if (!projCsmEx[pid]) continue;
        const csm = csmIds[projCsmEx[pid]];
        if (!csm || !csms.includes(csm)) continue;
        (total as any)[csm] = ((total as any)[csm] ?? 0) + 1;
        if (r.Status === "Completed") {
          (done as any)[csm] = ((done as any)[csm] ?? 0) + 1;
          (doneSet as Set<string>).add(pid);
        }
      }
      void key;
    }

    // Account-level RT/TP done flags
    const acctRtDone = new Set<string>();
    const acctTpDone = new Set<string>();
    for (const [pid, acctId] of Object.entries(projAcct)) {
      if (projRtDone.has(pid)) acctRtDone.add(acctId);
      if (projTpDone.has(pid)) acctTpDone.add(acctId);
    }

    // Eligible base per CSM: B3-B7 accounts (SLA denominator, excludes B1/B2)
    const ELIGIBLE_BUCKETS = new Set(["B3", "B4", "B5", "B6", "B7"]);
    const csmEligibleCounts: Record<string, number> = {};
    for (const csm of csms) csmEligibleCounts[csm] = 0;
    for (const [pid, csmId] of Object.entries(projCsmEx)) {
      const csm = csmIds[csmId];
      if (!csm || !csms.includes(csm)) continue;
      const bucket = acctBucket[projAcct[pid]] ?? "pending";
      if (ELIGIBLE_BUCKETS.has(bucket)) csmEligibleCounts[csm]++;
    }
    const eligibleBase = csms.reduce((s, c) => s + (csmEligibleCounts[c] ?? 0), 0);

    // Both Done metric — projects with both RT and TP completed
    // Targets are dynamic: 90% of each CSM's eligible (B3-B7) account count
    const bothDoneByCSM: Record<string, number> = {};
    const rtOnlyByCSM: Record<string, number> = {};
    const tpOnlyByCSM: Record<string, number> = {};

    for (const [pid, csmId] of Object.entries(projCsmEx)) {
      const csm = csmIds[csmId];
      if (!csm || !csms.includes(csm)) continue;
      const hasRt = projRtDone.has(pid);
      const hasTp = projTpDone.has(pid);
      if (hasRt && hasTp) bothDoneByCSM[csm] = (bothDoneByCSM[csm] ?? 0) + 1;
      else if (hasRt) rtOnlyByCSM[csm] = (rtOnlyByCSM[csm] ?? 0) + 1;
      else if (hasTp) tpOnlyByCSM[csm] = (tpOnlyByCSM[csm] ?? 0) + 1;
    }

    // RT and TP month-to-date completions (since June 2)
    const monthStart = `${new Date().getFullYear()}-06-02T00:00:00Z`;
    const rtMtdRecs: any[] = await (conn as any)
      .query(`SELECT WhatId FROM Task WHERE Subject = 'Onboarding - Review Training and Documentation' AND Status = 'Completed' AND CompletedDateTime >= ${monthStart}`)
      .then((r: any) => r.records ?? []);
    const tpMtdRecs: any[] = await (conn as any)
      .query(`SELECT WhatId FROM Task WHERE Subject = 'Onboarding - Create Internal test patients' AND Status = 'Completed' AND CompletedDateTime >= ${monthStart}`)
      .then((r: any) => r.records ?? []);

    let rtMtd = 0;
    let tpMtd = 0;
    const seenRtMtd = new Set<string>();
    const seenTpMtd = new Set<string>();
    const rtMtdByCSM: Record<string, number> = {};
    const tpMtdByCSM: Record<string, number> = {};

    for (const r of rtMtdRecs) {
      const pid = r.WhatId;
      if (!projCsmEx[pid] || seenRtMtd.has(pid)) continue;
      seenRtMtd.add(pid);
      const csm = csmIds[projCsmEx[pid]];
      if (!csm || !csms.includes(csm)) continue;
      rtMtd++;
      rtMtdByCSM[csm] = (rtMtdByCSM[csm] ?? 0) + 1;
    }
    for (const r of tpMtdRecs) {
      const pid = r.WhatId;
      if (!projCsmEx[pid] || seenTpMtd.has(pid)) continue;
      seenTpMtd.add(pid);
      const csm = csmIds[projCsmEx[pid]];
      if (!csm || !csms.includes(csm)) continue;
      tpMtd++;
      tpMtdByCSM[csm] = (tpMtdByCSM[csm] ?? 0) + 1;
    }

    // Accounts that newly crossed "both done" in May (both complete, at least one completed since May 4)
    const newlyBothDoneByCSM: Record<string, number> = {};
    for (const [pid, csmId] of Object.entries(projCsmEx)) {
      const csm = csmIds[csmId];
      if (!csm || !csms.includes(csm)) continue;
      if (projRtDone.has(pid) && projTpDone.has(pid) && (seenRtMtd.has(pid) || seenTpMtd.has(pid))) {
        newlyBothDoneByCSM[csm] = (newlyBothDoneByCSM[csm] ?? 0) + 1;
      }
    }

    // Weekly completions — this week and last week
    const weekSince = getMondayISO(0);
    const lastWeekSince = getMondayISO(-1);

    const weekRecs: any[] = await (conn as any)
      .query(`SELECT WhatId FROM Task WHERE Subject IN ('Onboarding - Review Training and Documentation','Onboarding - Create Internal test patients') AND Status = 'Completed' AND CompletedDateTime >= ${weekSince}`)
      .then((r: any) => r.records ?? []);
    const lastWeekRecs: any[] = await (conn as any)
      .query(`SELECT WhatId FROM Task WHERE Subject IN ('Onboarding - Review Training and Documentation','Onboarding - Create Internal test patients') AND Status = 'Completed' AND CompletedDateTime >= ${lastWeekSince} AND CompletedDateTime < ${weekSince}`)
      .then((r: any) => r.records ?? []);

    const weekNew: Record<string, number> = {};
    const lastWeekNew: Record<string, number> = {};
    const seenWeek = new Set<string>();
    const seenLastWeek = new Set<string>();

    // Build sets of projects that had any RT/TP task completed each week
    for (const r of weekRecs) { if (projCsmEx[r.WhatId]) seenWeek.add(r.WhatId); }
    for (const r of lastWeekRecs) { if (projCsmEx[r.WhatId]) seenLastWeek.add(r.WhatId); }

    // Count newly both done: both RT and TP complete, at least one completed that week
    for (const [pid, csmId] of Object.entries(projCsmEx)) {
      const csm = csmIds[csmId];
      if (!csm || !csms.includes(csm)) continue;
      if (projRtDone.has(pid) && projTpDone.has(pid)) {
        if (seenWeek.has(pid)) weekNew[csm] = (weekNew[csm] ?? 0) + 1;
        if (seenLastWeek.has(pid)) lastWeekNew[csm] = (lastWeekNew[csm] ?? 0) + 1;
      }
    }

    // 6-week velocity history for sparkline — team-level both-done-per-week
    // Strategy: for each currently-both-done project, find the week its LAST task was completed;
    // that's when it "became" both-done. Bucket into 6 weekly slots (oldest=0, current=5).
    const sixWeeksAgo = getMondayISO(-5);
    const histRecs: any[] = await (conn as any)
      .query(`SELECT WhatId, CompletedDateTime FROM Task WHERE Subject IN ('Onboarding - Review Training and Documentation','Onboarding - Create Internal test patients') AND Status = 'Completed' AND CompletedDateTime >= ${sixWeeksAgo}`)
      .then((r: any) => r.records ?? []);

    const projLatestCompletion: Record<string, number> = {};
    for (const r of histRecs) {
      const pid = r.WhatId;
      if (!projRtDone.has(pid) || !projTpDone.has(pid) || !projCsmEx[pid]) continue;
      const t = new Date(r.CompletedDateTime).getTime();
      if (!projLatestCompletion[pid] || t > projLatestCompletion[pid]) {
        projLatestCompletion[pid] = t;
      }
    }
    const currentMondayTs = new Date(getMondayISO(0)).getTime();
    const velocityHistory = Array(6).fill(0); // index 0 = 5 weeks ago, index 5 = this week
    for (const ts of Object.values(projLatestCompletion)) {
      const weekOffset = Math.floor((ts - currentMondayTs) / (7 * 86400000));
      const idx = 5 + weekOffset;
      if (idx >= 0 && idx <= 5) velocityHistory[idx]++;
    }

    const bothDoneTotal = csms.reduce((s, c) => s + (bothDoneByCSM[c] ?? 0), 0);

    // Month totals (since June 1)
    const juneStart = `${new Date().getFullYear()}-06-01T00:00:00Z`;
    const juneRecs: any[] = await (conn as any)
      .query(`SELECT WhatId FROM Task WHERE Subject IN ('Onboarding - Review Training and Documentation','Onboarding - Create Internal test patients') AND Status = 'Completed' AND CompletedDateTime >= ${juneStart}`)
      .then((r: any) => r.records ?? []);
    const monthTotals: Record<string, number> = {};
    const seenJune = new Set<string>();
    for (const r of juneRecs as any[]) {
      const pid = r.WhatId;
      if (!projCsmEx[pid] || seenJune.has(pid)) continue;
      seenJune.add(pid);
      const csm = csmIds[projCsmEx[pid]];
      if (!csm || !csms.includes(csm)) continue;
      monthTotals[csm] = (monthTotals[csm] ?? 0) + 1;
    }

    // All active accounts for the workbench
    const acctDetails: any[] = await (conn as any)
      .query("SELECT Id, Name, Onboarding_Status__c, Total_Deployment_Revenue_Estimate_c__c, Account_Status__c, Executive_Program_Status__c FROM Account WHERE Account_Status__c IN ('Active','Paused') AND Onboarding_Status__c != null AND (NOT Name LIKE '%Amber Test%') ORDER BY Name ASC")
      .then((r: any) => r.records ?? []);

    const currentWeekNum = getJuneWeekNumber();
    const totalActive = bucketCounts.B1 + bucketCounts.B2 + bucketCounts.B3 + bucketCounts.B4 + bucketCounts.B5 + bucketCounts.B6 + bucketCounts.B7;

    const bothDonePct = eligibleBase > 0 ? Math.round(100 * bothDoneTotal / eligibleBase) : 0;

    // Dynamic weekly targets — each CSM's share proportional to their eligible book
    const rawWt = WEEK_TARGETS[currentWeekNum] ?? "0-0";
    const [wtLo, wtHi] = rawWt.split("-").map(Number);

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      currentWeekNum,
      weekTargets: WEEK_TARGETS,
      baseline: BASELINE,
      bucketCounts,
      totalActive,
      csmByBucket: csms.map(csm => ({
        csm,
        ...csmBucketCounts[csm],
        total: Object.values(csmBucketCounts[csm]).reduce((a, b) => a + b, 0),
      })),
      eligibleBase,
      csmEligibleCounts,
      standupMetrics: csms.map(csm => {
        // Per-CSM weekly target: proportional share of team weekly target by eligible book size
        const share = eligibleBase > 0 ? (csmEligibleCounts[csm] ?? 0) / eligibleBase : 0;
        const csmWtLo = Math.round(wtLo * share);
        const csmWtHi = Math.round(wtHi * share);
        const csmBothDone = bothDoneByCSM[csm] ?? 0;
        const csmEligible = csmEligibleCounts[csm] ?? 0;
        const csmSlaTarget = Math.round(csmEligible * 0.90);
        return {
          csm,
          thisWeek: weekNew[csm] ?? 0,
          lastWeek: lastWeekNew[csm] ?? 0,
          weekTarget: `${csmWtLo}-${csmWtHi}`,
          totalMonth: monthTotals[csm] ?? 0,
          monthTarget: Math.max(0, csmSlaTarget - csmBothDone),
          fromB4: 0,
          fromB5: 0,
        };
      }),
      bothDoneMetric: {
        slaTarget: Math.round(eligibleBase * 0.90),
        baseline: csms.reduce((s, c) => s + (bothDoneByCSM[c] ?? 0), 0),
        newlyBothDone: csms.reduce((s, c) => s + (newlyBothDoneByCSM[c] ?? 0), 0),
        teamRtOnly: csms.reduce((s, c) => s + (rtOnlyByCSM[c] ?? 0), 0),
        teamTpOnly: csms.reduce((s, c) => s + (tpOnlyByCSM[c] ?? 0), 0),
        byCsm: csms.map(csm => {
          const eligible = csmEligibleCounts[csm] ?? 0;
          return {
            csm,
            newlyBothDone: newlyBothDoneByCSM[csm] ?? 0,
            both: bothDoneByCSM[csm] ?? 0,
            rtOnly: rtOnlyByCSM[csm] ?? 0,
            tpOnly: tpOnlyByCSM[csm] ?? 0,
            eligible,
            target: Math.round(eligible * 0.90),
          };
        }),
      },
      rtMetrics: { done: rtDone, total: rtTotal },
      tpMetrics: { done: tpDone, total: tpTotal },
      weeklyCompletions: { thisWeek: weekNew, lastWeek: lastWeekNew, monthTotals, velocityHistory },
      secondaryMetric: {
        bothDoneTotal,
        activeTotal: totalActive,
        eligibleTotal: eligibleBase,
        pct: bothDonePct,
        goal: 70,
      },
      accounts: acctDetails.map(r => ({
        id: r.Id,
        accountName: r.Name,
        bucket: BUCKET_LABELS[r.Onboarding_Status__c ?? ""] ?? "pending",
        arr: r.Total_Deployment_Revenue_Estimate_c__c ?? 0,
        goLiveDate: acctGoLive[r.Id] ?? null,
        daysInBucket: acctStatusChangeDate[r.Id]
          ? Math.floor((Date.now() - new Date(acctStatusChangeDate[r.Id]!).getTime()) / 86400000)
          : null,
        customerTemperature: acctTemperature[r.Id] ?? null,
        parallel10: acctParallel10[r.Id] ?? false,
        csmName: acctCsm[r.Id] ? (csmIds[acctCsm[r.Id]] ?? null) : null,
        rtDone: acctRtDone.has(r.Id),
        tpDone: acctTpDone.has(r.Id),
        projectId: acctProjectId[r.Id] ?? null,
        projectHealth: acctProjectHealth[r.Id] ?? null,
        solutionsConsultant: acctSolutionsConsultant[r.Id] ?? null,
        servicePackage: acctServicePackage[r.Id] ?? null,
        projectType: acctProjectType[r.Id] ?? null,
        hypercareDri: acctHypercareDri[r.Id] ?? null,
        nextEngagementDate: acctNextEngagement[r.Id] ?? null,
        accountStatus: r.Account_Status__c ?? null,
        executiveProgramStatus: r.Executive_Program_Status__c ?? null,
        stage: acctProjectStage[r.Id] ?? null,
      })),
    });
  } catch (err) {
    console.error("Salesforce API error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
