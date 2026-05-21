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
const VALID_TEMPERATURES = new Set(["Watch", "Healthy", "Critical"]);
const VALID_PROJECT_HEALTH = new Set(["On Track", "At Risk", "Critical", "Blocked"]);
const VALID_EXEC_STATUS = new Set(["On Track", "At Risk", "Needs Attention", "Churned"]);
const VALID_STAGES = new Set(["Needs Review", "Onboard", "Hypercare", "Approved", "Completed"]);

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

    if (body.type === "projectField") {
      const { projectId, field, value } = body;
      if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
      if (field === "Customer_Temperature__c" && value && !VALID_TEMPERATURES.has(value))
        return NextResponse.json({ error: "Invalid temperature value" }, { status: 400 });
      if (field === "Project_Health__c" && value && !VALID_PROJECT_HEALTH.has(value))
        return NextResponse.json({ error: "Invalid project health value" }, { status: 400 });
      if (field === "Stage__c" && value && !VALID_STAGES.has(value))
        return NextResponse.json({ error: "Invalid stage value" }, { status: 400 });
      if (!["Customer_Temperature__c", "Project_Health__c", "Stage__c",
            "Service_Package__c", "Project_Type__c",
            "Solutions_Consultant__c", "Hypercare_DRI__c"].includes(field))
        return NextResponse.json({ error: "Field not allowed" }, { status: 400 });
      await (conn as any).sobject("Project__c").update({ Id: projectId, [field]: value || null });
      return NextResponse.json({ ok: true });
    }

    if (body.type === "accountField") {
      const { accountId, field, value } = body;
      if (!accountId) return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
      if (field === "Executive_Program_Status__c" && value && !VALID_EXEC_STATUS.has(value))
        return NextResponse.json({ error: "Invalid executive program status" }, { status: 400 });
      if (!["Executive_Program_Status__c", "Account_Status__c"].includes(field))
        return NextResponse.json({ error: "Field not allowed" }, { status: 400 });
      await (conn as any).sobject("Account").update({ Id: accountId, [field]: value || null });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown update type" }, { status: 400 });
  } catch (err) {
    console.error("SF update error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
