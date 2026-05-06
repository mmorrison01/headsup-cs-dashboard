import { NextResponse } from "next/server";
import { getSalesforceConnection, isSalesforceConfigured } from "@/lib/salesforce";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isSalesforceConfigured()) {
    return NextResponse.json({ error: "Salesforce not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  try {
    const conn = await getSalesforceConnection();

    const projects: any[] = await (conn as any)
      .query(`SELECT Id FROM Project__c WHERE Account__c = '${accountId}' LIMIT 5`)
      .then((r: any) => r.records ?? []);

    if (projects.length === 0) {
      return NextResponse.json({ tasks: [] });
    }

    const projIds = projects.map((p: any) => `'${p.Id}'`).join(",");
    const tasks: any[] = await (conn as any)
      .query(`SELECT Id, Subject, Status, LastModifiedDate FROM Task WHERE WhatId IN (${projIds}) AND Subject LIKE 'Onboarding%' ORDER BY Subject ASC`)
      .then((r: any) => r.records ?? []);

    return NextResponse.json({
      tasks: tasks.map((t: any) => ({
        id: t.Id,
        subject: t.Subject,
        status: t.Status,
        lastModified: t.LastModifiedDate,
      })),
    });
  } catch (err) {
    console.error("Account tasks error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
