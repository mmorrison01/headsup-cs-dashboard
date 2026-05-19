import { NextResponse } from "next/server";
import { isJiraConfigured, searchHhcTicketsByOrganization } from "@/lib/jira";

export const runtime = "nodejs";

function stripSuffixes(name: string): string {
  return name
    .replace(/[,.]/g, "")
    .replace(/\s+(llc|inc|incorporated|ltd|limited|corp|corporation|co|company|pllc|llp|lp|plc)\.?$/i, "")
    .trim();
}

export async function GET(req: Request) {
  if (!isJiraConfigured()) {
    return NextResponse.json({ error: "Jira not configured", tickets: [] }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const accountName = searchParams.get("accountName");
  if (!accountName) {
    return NextResponse.json({ error: "accountName required" }, { status: 400 });
  }

  try {
    // First attempt: exact name match against Organization
    let tickets = await searchHhcTicketsByOrganization(accountName, true, 50);

    // Fallback: try with common suffixes stripped (e.g. "Archeus LLC" -> "Archeus")
    if (tickets.length === 0) {
      const stripped = stripSuffixes(accountName);
      if (stripped && stripped !== accountName) {
        tickets = await searchHhcTicketsByOrganization(stripped, true, 50);
      }
    }

    return NextResponse.json({ tickets, matchedName: accountName });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e), tickets: [] }, { status: 500 });
  }
}
