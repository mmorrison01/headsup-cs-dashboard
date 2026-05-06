import { NextResponse } from "next/server";
import { getSalesforceConnection, isSalesforceConfigured } from "@/lib/salesforce";

export const runtime = "nodejs";
export const revalidate = 300; // 5-minute edge cache

const BUCKET_LABELS: Record<string, string> = {
  "1 - Hand-Raised 2.0 Migration": "B1",
  "2 - Deferred 2.0 Migration": "B2",
  "3 - Pre-Kickoff Active": "B3",
  "4 -Post-Kickoff STUCK": "B4",
  "5 - Mid-Journey Working": "B5",
  "6 - Near-Launch": "B6",
  "7 - Launched": "B7",
};

const CSM_IDS: Record<string, string> = {
  "005V500000D3ycrIAB": "Elaine Peters",
  "005Hu00000Ptvs9IAB": "Jillian Ramos",
  "005V500000GsbRBIAZ": "Varsha Yaddala",
};

const CSMS = ["Elaine Peters", "Jillian Ramos", "Varsha Yaddala"];

const BASELINE: Record<string, number> = {
  B1: 22, B2: 67, B3: 55, B4: 49, B5: 103, B6: 22, B7: 38, total: 361,
};

const WEEK_TARGETS: Record<number, string> = { 1: "5-8", 2: "12-15", 3: "10-12", 4: "8-10" };

function getMondayISO(offset = 0): string {
  const d = new Date();
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

function getMayWeekNumber(): number {
  const now = new Date();
  const mayStart = new Date(now.getFullYear(), 4, 4); // May 4
  const diffMs = now.getTime() - mayStart.getTime();
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
    const acctRecs: { Id: string; Onboarding_Status__c: string | null; Total_Deployment_Revenue_Estimate_c__c: number | null }[] = await (conn as any)
      .query("SELECT Id, Onboarding_Status__c, Total_Deployment_Revenue_Estimate_c__c FROM Account WHERE Account_Status__c IN ('Active','Paused') AND Type = 'Customer' AND (NOT Name LIKE '%Amber Test%')")
      .then((r: any) => r.records ?? []);

    const acctBucket: Record<string, string> = {};
    const acctArr: Record<string, number> = {};
    for (const r of acctRecs) {
      const raw = r.Onboarding_Status__c ?? "pending";
      acctBucket[r.Id] = BUCKET_LABELS[raw] ?? "pending";
      acctArr[r.Id] = r.Total_Deployment_Revenue_Estimate_c__c ?? 0;
    }
    const allAcctIds = Object.keys(acctBucket);

    // Projects for CSM assignments and account detail fields (batch in chunks of 200)
    const projCsm: Record<string, string> = {};
    const projAcct: Record<string, string> = {};
    // account-level detail fields sourced from the project
    const acctGoLive: Record<string, string | null> = {};
    const acctTemperature: Record<string, string | null> = {};
    const acctStageChangeDate: Record<string, string | null> = {};
    const acctParallel10: Record<string, boolean> = {};

    for (let i = 0; i < allAcctIds.length; i += 200) {
      const batch = allAcctIds.slice(i, i + 200);
      const idsStr = batch.map(id => `'${id}'`).join(",");
      const recs: any[] = await (conn as any)
        .query(`SELECT Id, CSM__c, Account__c, Stage__c, Customer_Planned_Go_Live_Date__c, Customer_Temperature__c, Stage_Change_Date__c, Parallel_1_0__c FROM Project__c WHERE Account__c IN (${idsStr}) AND CSM__c != null`)
        .then((r: any) => r.records ?? []);
      for (const r of recs) {
        const acctId = r.Account__c;
        projCsm[r.Id] = r.CSM__c;
        projAcct[r.Id] = acctId;

        // Last project wins per account
        acctGoLive[acctId] = r.Customer_Planned_Go_Live_Date__c ?? null;
        acctTemperature[acctId] = r.Customer_Temperature__c ?? null;
        acctStageChangeDate[acctId] = r.Stage_Change_Date__c ?? null;
        acctParallel10[acctId] = r.Parallel_1_0__c ?? false;
      }
    }

    // Map account → CSM (last project wins if multiple)
    const acctCsm: Record<string, string> = {};
    for (const [pid, csmId] of Object.entries(projCsm)) {
      acctCsm[projAcct[pid]] = csmId;
    }

    // Bucket counts
    const bucketCounts: Record<string, number> = { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0, B7: 0, pending: 0 };
    const csmBucketCounts: Record<string, Record<string, number>> = {};
    for (const csm of CSMS) csmBucketCounts[csm] = { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0, B7: 0 };

    for (const [acctId, bkey] of Object.entries(acctBucket)) {
      bucketCounts[bkey] = (bucketCounts[bkey] ?? 0) + 1;
      const csmId = acctCsm[acctId];
      const csmName = csmId ? (CSM_IDS[csmId] ?? null) : null;
      if (csmName && CSMS.includes(csmName) && bkey !== "pending") {
        csmBucketCounts[csmName][bkey] = (csmBucketCounts[csmName][bkey] ?? 0) + 1;
      }
    }

    // B2 exclusion set for metrics
    const b2AcctIds = new Set(
      Object.entries(acctBucket)
        .filter(([, b]) => b === "B2")
        .map(([id]) => id)
    );
    const projCsmEx: Record<string, string> = {};
    for (const [pid, csmId] of Object.entries(projCsm)) {
      if (!b2AcctIds.has(projAcct[pid])) projCsmEx[pid] = csmId;
    }

    // RT and TP totals
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

    for (const [key, recs, done, total] of [
      ["rt", rtRecs, rtDone, rtTotal],
      ["tp", tpRecs, tpDone, tpTotal],
    ] as const) {
      for (const r of recs as any[]) {
        const pid = r.WhatId;
        if (!projCsmEx[pid]) continue;
        const csm = CSM_IDS[projCsmEx[pid]];
        if (!csm || !CSMS.includes(csm)) continue;
        (total as any)[csm] = ((total as any)[csm] ?? 0) + 1;
        if (r.Status === "Completed") (done as any)[csm] = ((done as any)[csm] ?? 0) + 1;
      }
      void key;
    }

    // Weekly completions — this week and last week
    const weekSince = getMondayISO(0);
    const lastWeekSince = getMondayISO(-1);

    const weekRecs: any[] = await (conn as any)
      .query(`SELECT WhatId FROM Task WHERE Subject IN ('Onboarding - Review Training and Documentation','Onboarding - Create Internal test patients') AND Status = 'Completed' AND LastModifiedDate >= ${weekSince}`)
      .then((r: any) => r.records ?? []);
    const lastWeekRecs: any[] = await (conn as any)
      .query(`SELECT WhatId FROM Task WHERE Subject IN ('Onboarding - Review Training and Documentation','Onboarding - Create Internal test patients') AND Status = 'Completed' AND LastModifiedDate >= ${lastWeekSince} AND LastModifiedDate < ${weekSince}`)
      .then((r: any) => r.records ?? []);

    const weekNew: Record<string, number> = {};
    const lastWeekNew: Record<string, number> = {};
    const seenWeek = new Set<string>();
    const seenLastWeek = new Set<string>();

    for (const [recs, out, seen] of [
      [weekRecs, weekNew, seenWeek],
      [lastWeekRecs, lastWeekNew, seenLastWeek],
    ] as const) {
      for (const r of recs as any[]) {
        const pid = r.WhatId;
        if (!projCsmEx[pid] || (seen as Set<string>).has(pid)) continue;
        (seen as Set<string>).add(pid);
        const csm = CSM_IDS[projCsmEx[pid]];
        if (!csm || !CSMS.includes(csm)) continue;
        (out as Record<string, number>)[csm] = ((out as Record<string, number>)[csm] ?? 0) + 1;
      }
    }

    // Secondary metric: >2 completed onboarding tasks per project
    const allTaskRecs: any[] = await (conn as any)
      .query("SELECT WhatId, Status FROM Task WHERE Subject LIKE 'Onboarding%'")
      .then((r: any) => r.records ?? []);
    const doneByProj: Record<string, number> = {};
    for (const r of allTaskRecs) {
      if (r.Status === "Completed") doneByProj[r.WhatId] = (doneByProj[r.WhatId] ?? 0) + 1;
    }
    const secDone: Record<string, number> = {};
    const secTotal: Record<string, number> = {};
    for (const [pid, csmId] of Object.entries(projCsmEx)) {
      const csm = CSM_IDS[csmId];
      if (!csm || !CSMS.includes(csm)) continue;
      secTotal[csm] = (secTotal[csm] ?? 0) + 1;
      if ((doneByProj[pid] ?? 0) > 2) secDone[csm] = (secDone[csm] ?? 0) + 1;
    }

    // May totals (since May 1)
    const mayStart = `${new Date().getFullYear()}-05-01T00:00:00Z`;
    const mayRecs: any[] = await (conn as any)
      .query(`SELECT WhatId FROM Task WHERE Subject IN ('Onboarding - Review Training and Documentation','Onboarding - Create Internal test patients') AND Status = 'Completed' AND LastModifiedDate >= ${mayStart}`)
      .then((r: any) => r.records ?? []);
    const mayTotals: Record<string, number> = {};
    const seenMay = new Set<string>();
    for (const r of mayRecs as any[]) {
      const pid = r.WhatId;
      if (!projCsmEx[pid] || seenMay.has(pid)) continue;
      seenMay.add(pid);
      const csm = CSM_IDS[projCsmEx[pid]];
      if (!csm || !CSMS.includes(csm)) continue;
      mayTotals[csm] = (mayTotals[csm] ?? 0) + 1;
    }

    // All active accounts for the workbench
    const acctDetails: any[] = await (conn as any)
      .query("SELECT Id, Name, Onboarding_Status__c, Total_Deployment_Revenue_Estimate_c__c FROM Account WHERE Account_Status__c IN ('Active','Paused') AND Type = 'Customer' AND Onboarding_Status__c != null AND (NOT Name LIKE '%Amber Test%') ORDER BY Name ASC")
      .then((r: any) => r.records ?? []);

    const currentWeekNum = getMayWeekNumber();
    const totalActive = bucketCounts.B1 + bucketCounts.B2 + bucketCounts.B3 + bucketCounts.B4 + bucketCounts.B5 + bucketCounts.B6 + bucketCounts.B7;

    const teamSecDone = CSMS.reduce((s, c) => s + (secDone[c] ?? 0), 0);
    const teamSecTotal = CSMS.reduce((s, c) => s + (secTotal[c] ?? 0), 0);

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      currentWeekNum,
      weekTargets: WEEK_TARGETS,
      baseline: BASELINE,
      bucketCounts,
      totalActive,
      csmByBucket: CSMS.map(csm => ({
        csm,
        ...csmBucketCounts[csm],
        total: Object.values(csmBucketCounts[csm]).reduce((a, b) => a + b, 0),
      })),
      standupMetrics: CSMS.map(csm => ({
        csm,
        thisWeek: weekNew[csm] ?? 0,
        lastWeek: lastWeekNew[csm] ?? 0,
        weekTarget: WEEK_TARGETS[currentWeekNum] ?? "--",
        totalMay: mayTotals[csm] ?? 0,
        monthTarget: csm === "Elaine Peters" ? 45 : csm === "Jillian Ramos" ? 40 : 35,
        fromB4: 0,
        fromB5: 0,
      })),
      subtaskVelocity: [
        { task: "Review Training", baseline: 133, current: CSMS.reduce((s, c) => s + (rtDone[c] ?? 0), 0), target: 200 },
        { task: "Test Patients", baseline: 111, current: CSMS.reduce((s, c) => s + (tpDone[c] ?? 0), 0), target: 165 },
      ],
      rtMetrics: { done: rtDone, total: rtTotal },
      tpMetrics: { done: tpDone, total: tpTotal },
      weeklyCompletions: { thisWeek: weekNew, lastWeek: lastWeekNew, mayTotals },
      secondaryMetric: {
        done: secDone,
        total: secTotal,
        teamDone: teamSecDone,
        teamTotal: teamSecTotal,
        teamPct: teamSecTotal > 0 ? Math.round(100 * teamSecDone / teamSecTotal) : 0,
      },
      accounts: acctDetails.map(r => ({
        id: r.Id,
        accountName: r.Name,
        bucket: BUCKET_LABELS[r.Onboarding_Status__c ?? ""] ?? "pending",
        arr: r.Total_Deployment_Revenue_Estimate_c__c ?? 0,
        goLiveDate: acctGoLive[r.Id] ?? null,
        daysInBucket: acctStageChangeDate[r.Id]
          ? Math.floor((Date.now() - new Date(acctStageChangeDate[r.Id]!).getTime()) / 86400000)
          : null,
        customerTemperature: acctTemperature[r.Id] ?? null,
        parallel10: acctParallel10[r.Id] ?? false,
        csmName: acctCsm[r.Id] ? (CSM_IDS[acctCsm[r.Id]] ?? null) : null,
      })),
    });
  } catch (err) {
    console.error("Salesforce API error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
