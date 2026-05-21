import { NextResponse } from "next/server";
import { getSalesforceConnection, isSalesforceConfigured } from "@/lib/salesforce";

export const runtime = "nodejs";

export async function GET() {
  if (!isSalesforceConfigured()) {
    return NextResponse.json({ error: "Salesforce not configured" }, { status: 503 });
  }
  try {
    const conn = await getSalesforceConnection();

    const [projectDesc, acctDesc, userRecs] = await Promise.all([
      (conn as any).sobject("Project__c").describe(),
      (conn as any).sobject("Account").describe(),
      (conn as any)
        .query("SELECT Id, Name FROM User WHERE IsActive = true ORDER BY Name ASC")
        .then((r: any) => r.records ?? []),
    ]);

    const picklistValues = (desc: any, fieldName: string): string[] => {
      const field = desc.fields.find((f: any) => f.name === fieldName);
      return field?.picklistValues?.filter((v: any) => v.active).map((v: any) => v.value) ?? [];
    };

    return NextResponse.json({
      servicePackageValues: picklistValues(projectDesc, "Service_Package__c"),
      projectTypeValues: picklistValues(projectDesc, "Project_Type__c"),
      accountStatusValues: picklistValues(acctDesc, "Account_Status__c"),
      users: userRecs.map((u: any) => ({ id: u.Id, name: u.Name })),
    });
  } catch (err) {
    console.error("Field options error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
