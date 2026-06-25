import { NextResponse } from "next/server";
import { isJiraConfigured, fetchPsEpics, fetchPsIssues } from "@/lib/jira";

export const runtime = "nodejs";
export const revalidate = 0;

function getMondayISO(offsetWeeks = 0): string {
  const d = new Date();
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function weekLabel(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export async function GET() {
  if (!isJiraConfigured()) {
    return NextResponse.json({ error: "Jira not configured" }, { status: 503 });
  }

  try {
    console.log("[PS] Jira configured — email present:", !!process.env.JIRA_USER_EMAIL, "token present:", !!process.env.JIRA_API_TOKEN);
    const [epics, issues] = await Promise.all([fetchPsEpics(), fetchPsIssues()]);

    const today = getMondayISO(0).slice(0, 10);
    const todayDate = new Date(today);

    // 8-week rolling window: 2 past + current + 5 future
    const weekBuckets = Array.from({ length: 8 }, (_, i) => {
      const weekOf = getMondayISO(i - 2);
      return {
        weekOf,
        label: weekLabel(weekOf),
        totalHours: 0,
        byAssignee: {} as Record<string, number>,
        issueKeys: [] as string[],
      };
    });

    const weekStarts = weekBuckets.map(b => b.weekOf);

    for (const issue of issues) {
      if (!issue.dueDate || issue.statusCategory === "Done") continue;
      // Find which bucket this issue's due date falls in (week of the due date's Monday)
      const dueD = new Date(issue.dueDate + "T12:00:00Z");
      const dueDow = dueD.getUTCDay();
      const dueMonday = new Date(dueD);
      dueMonday.setUTCDate(dueD.getUTCDate() - (dueDow === 0 ? 6 : dueDow - 1));
      const dueMondayStr = dueMonday.toISOString().slice(0, 10);

      const idx = weekStarts.indexOf(dueMondayStr);
      if (idx === -1) continue;

      const hrs = issue.originalEstimateHours ?? 0;
      weekBuckets[idx].totalHours += hrs;
      weekBuckets[idx].issueKeys.push(issue.key);
      if (issue.assignee) {
        weekBuckets[idx].byAssignee[issue.assignee] =
          (weekBuckets[idx].byAssignee[issue.assignee] ?? 0) + hrs;
      }
    }

    const openIssues = issues.filter(i => i.statusCategory !== "Done");
    const overdueCount = openIssues.filter(i => i.dueDate && i.dueDate < today).length;
    const blockedCount = openIssues.filter(i => i.blocked).length;
    const doneCount = issues.filter(i => i.statusCategory === "Done").length;
    const inProgressCount = issues.filter(i => i.statusCategory === "In Progress").length;

    const assignees = [...new Set(issues.map(i => i.assignee).filter(Boolean) as string[])].sort();

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      epics,
      issues,
      assignees,
      summary: {
        total: openIssues.length,
        overdue: overdueCount,
        blocked: blockedCount,
        done: doneCount,
        inProgress: inProgressCount,
      },
      weeklyCapacity: weekBuckets,
    });
  } catch (err) {
    console.error("PS Jira error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
