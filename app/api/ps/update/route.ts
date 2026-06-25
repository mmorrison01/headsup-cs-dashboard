import { NextResponse } from "next/server";
import { isJiraConfigured, transitionPsIssue, updatePsIssueFields } from "@/lib/jira";

export const runtime = "nodejs";

const ISSUE_KEY_RE = /^PS-\d+$/;
const ALLOWED_FIELDS = new Set(["assignee", "dueDate", "estimate", "labels"]);

export async function POST(req: Request) {
  if (!isJiraConfigured()) {
    return NextResponse.json({ error: "Jira not configured" }, { status: 503 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, issueKey } = body;

  if (!issueKey || !ISSUE_KEY_RE.test(issueKey)) {
    return NextResponse.json({ error: "Invalid issueKey" }, { status: 400 });
  }

  try {
    if (type === "transition") {
      const { transitionName } = body;
      if (!transitionName || typeof transitionName !== "string") {
        return NextResponse.json({ error: "transitionName required" }, { status: 400 });
      }
      await transitionPsIssue(issueKey, transitionName);
      return NextResponse.json({ ok: true });
    }

    if (type === "field") {
      const { field, value } = body;
      if (!field || !ALLOWED_FIELDS.has(field)) {
        return NextResponse.json({ error: `field must be one of: ${[...ALLOWED_FIELDS].join(", ")}` }, { status: 400 });
      }

      if (field === "estimate") {
        const hrs = Number(value);
        if (!isFinite(hrs) || hrs < 0) {
          return NextResponse.json({ error: "estimate must be a non-negative number (hours)" }, { status: 400 });
        }
        await updatePsIssueFields(issueKey, { timeoriginalestimate: Math.round(hrs * 3600) });
      } else if (field === "dueDate") {
        const v = value ?? null;
        if (v !== null && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
          return NextResponse.json({ error: "dueDate must be YYYY-MM-DD or null" }, { status: 400 });
        }
        await updatePsIssueFields(issueKey, { duedate: v });
      } else if (field === "assignee") {
        await updatePsIssueFields(issueKey, { assignee: value ?? null });
      } else if (field === "labels") {
        if (!Array.isArray(value) || !value.every(l => typeof l === "string")) {
          return NextResponse.json({ error: "labels must be string[]" }, { status: 400 });
        }
        await updatePsIssueFields(issueKey, { labels: value });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    console.error("PS update error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
