import { NextResponse } from "next/server";
import { getSalesforceConnection, isSalesforceConfigured } from "@/lib/salesforce";

export const runtime = "nodejs";

function stripHtml(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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

    // Look up the linked project so we can pull chatter from it too
    const projRecs: any[] = await (conn as any)
      .query(`SELECT Id FROM Project__c WHERE Account__c = '${accountId}' AND Stage__c IN ('Onboard','Hypercare','Approved') LIMIT 1`)
      .then((r: any) => r.records ?? []);
    const projectId = projRecs[0]?.Id ?? null;

    // Build parent ID list: always include account, add project if found
    const parentIds = [accountId, ...(projectId ? [projectId] : [])];
    const inClause = parentIds.map(id => `'${id}'`).join(",");

    // Chatter feed posts on account and/or project
    const feedRecs: any[] = await (conn as any)
      .query(`SELECT Id, Body, CreatedDate, CreatedBy.Name, Type FROM FeedItem WHERE ParentId IN (${inClause}) AND Type IN ('TextPost','ContentPost','LinkPost') ORDER BY CreatedDate DESC LIMIT 40`)
      .then((r: any) => r.records ?? []);

    // Classic Notes on account and/or project
    const noteRecs: any[] = await (conn as any)
      .query(`SELECT Id, Title, Body, CreatedDate, CreatedBy.Name FROM Note WHERE ParentId IN (${inClause}) ORDER BY CreatedDate DESC LIMIT 20`)
      .then((r: any) => r.records ?? []);

    const feed = [
      ...feedRecs.map((r: any) => ({
        id: r.Id,
        type: "chatter" as const,
        author: r.CreatedBy?.Name ?? "Unknown",
        date: r.CreatedDate,
        title: null,
        body: stripHtml(r.Body),
      })),
      ...noteRecs.map((r: any) => ({
        id: r.Id,
        type: "note" as const,
        author: r.CreatedBy?.Name ?? "Unknown",
        date: r.CreatedDate,
        title: r.Title ?? null,
        body: r.Body ?? "",
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ feed });
  } catch (err) {
    console.error("Notes/Chatter error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
