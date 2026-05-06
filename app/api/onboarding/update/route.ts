import { NextResponse } from "next/server";
import { getSalesforceConnection, isSalesforceConfigured } from "@/lib/salesforce";

export const runtime = "nodejs";

const BUCKET_TO_SF: Record<string, string> = {
  B1: "1 - Hand-Raised 2.0 Migration",
  B2: "2 - Deferred 2.0 Migration",
  B3: "3 - Pre-Kickoff Active",
  B4: "4 -Post-Kickoff STUCK",
  B5: "5 - Mid-Journey Working",
  B6: "6 - Near-Launch",
  B7: "7 - Launched",
};

const VALID_STATUSES = new Set(["Not Started", "In Progress", "Completed"]);

export async function POST(req: Request) {
  if (!isSalesforceConfigured()) {
    return NextResponse.json({ error: "Salesforce not configured" }, { status: 503 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const conn = await getSalesforceConnection();

    if (body.type === "bucket") {
      const { accountId, bucket } = body;
      const sfValue = BUCKET_TO_SF[bucket];
      if (!accountId || !sfValue) {
        return NextResponse.json({ error: "Invalid bucket update" }, { status: 400 });
      }
      await (conn as any).sobject("Account").update({ Id: accountId, Onboarding_Status__c: sfValue });
      return NextResponse.json({ ok: true });
    }

    if (body.type === "task") {
      const { taskId, status } = body;
      if (!taskId || !VALID_STATUSES.has(status)) {
        return NextResponse.json({ error: "Invalid task update" }, { status: 400 });
      }
      await (conn as any).sobject("Task").update({ Id: taskId, Status: status });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown update type" }, { status: 400 });
  } catch (err) {
    console.error("SF update error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
