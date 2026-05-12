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

    // Chatter feed posts on the account (text and content posts only, skip tracked changes)
    const feedRecs: any[] = await (conn as any)
      .query(`SELECT Id, Body, CreatedDate, CreatedBy.Name, Type FROM FeedItem WHERE ParentId = '${accountId}' AND Type IN ('TextPost','ContentPost','LinkPost') ORDER BY CreatedDate DESC LIMIT 30`)
      .then((r: any) => r.records ?? []);

    // Classic Notes on the account
    const noteRecs: any[] = await (conn as any)
      .query(`SELECT Id, Title, Body, CreatedDate, CreatedBy.Name FROM Note WHERE ParentId = '${accountId}' ORDER BY CreatedDate DESC LIMIT 20`)
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
