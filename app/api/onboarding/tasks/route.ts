import { NextResponse } from "next/server";
import { getSalesforceConnection, isSalesforceConfigured } from "@/lib/salesforce";

export const runtime = "nodejs";

const VALID_STATUSES = ["New", "In Progress", "Completed", "Waiting on Someone Else", "Deferred"];

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

    const projRecs: any[] = await (conn as any)
      .query(`SELECT Id FROM Project__c WHERE Account__c = '${accountId}' AND Stage__c IN ('Onboard','Hypercare','Approved') LIMIT 1`)
      .then((r: any) => r.records ?? []);
    const projectId = projRecs[0]?.Id ?? null;

    if (!projectId) {
      return NextResponse.json({ tasks: [] });
    }

    const taskRecs: any[] = await (conn as any)
      .query(`SELECT Id, Subject, Status, Owner.Name, ActivityDate, IsClosed FROM Task WHERE WhatId = '${projectId}' AND Subject LIKE 'Onboarding%' ORDER BY CreatedDate ASC LIMIT 50`)
      .then((r: any) => r.records ?? []);

    const tasks = taskRecs.map((r: any) => ({
      id: r.Id,
      subject: r.Subject ?? "",
      status: r.Status ?? "New",
      assignedTo: (r.Owner as any)?.Name ?? "Unknown",
      dueDate: r.ActivityDate ?? null,
      isClosed: r.IsClosed ?? false,
    }));

    return NextResponse.json({ tasks });
  } catch (err) {
    console.error("Tasks fetch error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isSalesforceConfigured()) {
    return NextResponse.json({ error: "Salesforce not configured" }, { status: 503 });
  }

  try {
    const { taskId, status } = await req.json();
    if (!taskId || !status) {
      return NextResponse.json({ error: "taskId and status required" }, { status: 400 });
    }
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const conn = await getSalesforceConnection();
    await (conn as any).sobject("Task").update({ Id: taskId, Status: status });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Task update error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
