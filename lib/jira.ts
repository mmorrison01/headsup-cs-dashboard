const JIRA_BASE_URL = process.env.JIRA_BASE_URL ?? "https://nicoya.atlassian.net";
const JIRA_USER_EMAIL = process.env.JIRA_USER_EMAIL ?? "";
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN ?? "";

export function isJiraConfigured(): boolean {
  return !!(JIRA_USER_EMAIL && JIRA_API_TOKEN);
}

function authHeader(): string {
  const raw = `${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`;
  return "Basic " + Buffer.from(raw).toString("base64");
}

export interface JiraTicket {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  requestType: string | null;
  created: string;
  url: string;
}

interface JqlSearchResponse {
  issues: Array<{
    key: string;
    fields: {
      summary: string;
      created: string;
      status?: { name: string; statusCategory?: { name?: string } };
      customfield_10010?: { requestType?: { name?: string } };
    };
  }>;
}

// ── PS Project Types ─────────────────────────────────────────────────────────

export interface PsEpic {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  url: string;
}

export interface PsIssue {
  key: string;
  summary: string;
  issueType: "Story" | "Task";
  status: string;
  statusCategory: string;
  assignee: string | null;
  assigneeAccountId: string | null;
  dueDate: string | null;
  originalEstimateHours: number | null;
  timeSpentHours: number | null;
  priority: string | null;
  epicKey: string | null;
  epicSummary: string | null;
  blocked: boolean;
  labels: string[];
  lastUpdated: string;
  url: string;
}

export interface PsTransition {
  id: string;
  name: string;
  statusCategory: string;
}

async function jiraFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${JIRA_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  return res;
}

export async function fetchPsEpics(): Promise<PsEpic[]> {
  const res = await jiraFetch("/rest/api/3/search/jql", {
    method: "POST",
    body: JSON.stringify({
      jql: "project = PS AND issuetype = Epic ORDER BY summary ASC",
      fields: ["summary", "status"],
      maxResults: 200,
    }),
  });
  if (!res.ok) throw new Error(`Jira epics fetch failed: ${res.status}`);
  const data = await res.json();
  return (data.issues ?? []).map((i: any) => ({
    key: i.key,
    summary: i.fields.summary,
    status: i.fields.status?.name ?? "Unknown",
    statusCategory: i.fields.status?.statusCategory?.name ?? "Unknown",
    url: `${JIRA_BASE_URL}/browse/${i.key}`,
  }));
}

export async function fetchPsIssues(): Promise<PsIssue[]> {
  const allIssues: any[] = [];
  let nextPageToken: string | undefined;
  const pageSize = 100;
  while (true) {
    const body: Record<string, any> = {
      jql: "project = PS AND issuetype in (Story, Task) ORDER BY updated DESC",
      fields: ["summary", "status", "assignee", "duedate", "timeoriginalestimate", "timespent",
               "priority", "parent", "labels", "issuelinks", "updated", "issuetype"],
      maxResults: pageSize,
    };
    if (nextPageToken) body.nextPageToken = nextPageToken;
    const res = await jiraFetch("/rest/api/3/search/jql", { method: "POST", body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Jira issues fetch failed: ${res.status}`);
    const data = await res.json();
    allIssues.push(...(data.issues ?? []));
    if (data.isLast || !data.nextPageToken) break;
    nextPageToken = data.nextPageToken;
  }

  return allIssues.map((i: any) => {
    const f = i.fields;
    const isBlocked =
      (f.labels ?? []).some((l: string) => l.toLowerCase() === "blocked") ||
      (f.issuelinks ?? []).some((link: any) => link.type?.inward === "is blocked by" && link.inwardIssue);
    return {
      key: i.key,
      summary: f.summary,
      issueType: f.issuetype?.name as "Story" | "Task",
      status: f.status?.name ?? "Unknown",
      statusCategory: f.status?.statusCategory?.name ?? "Unknown",
      assignee: f.assignee?.displayName ?? null,
      assigneeAccountId: f.assignee?.accountId ?? null,
      dueDate: f.duedate ?? null,
      originalEstimateHours: f.timeoriginalestimate != null ? f.timeoriginalestimate / 3600 : null,
      timeSpentHours: f.timespent != null ? f.timespent / 3600 : null,
      priority: f.priority?.name ?? null,
      epicKey: f.parent?.key ?? null,
      epicSummary: f.parent?.fields?.summary ?? null,
      blocked: isBlocked,
      labels: f.labels ?? [],
      lastUpdated: f.updated,
      url: `${JIRA_BASE_URL}/browse/${i.key}`,
    };
  });
}

export async function getPsIssueTransitions(issueKey: string): Promise<PsTransition[]> {
  const res = await jiraFetch(`/rest/api/3/issue/${issueKey}/transitions`);
  if (!res.ok) throw new Error(`Transitions fetch failed: ${res.status}`);
  const data = await res.json();
  return (data.transitions ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    statusCategory: t.to?.statusCategory?.name ?? "",
  }));
}

export async function transitionPsIssue(issueKey: string, transitionName: string): Promise<void> {
  const transitions = await getPsIssueTransitions(issueKey);
  const match = transitions.find(t => t.name.toLowerCase() === transitionName.toLowerCase());
  if (!match) throw new Error(`Transition "${transitionName}" not found on ${issueKey}`);
  const res = await jiraFetch(`/rest/api/3/issue/${issueKey}/transitions`, {
    method: "POST",
    body: JSON.stringify({ transition: { id: match.id } }),
  });
  if (!res.ok) throw new Error(`Transition failed: ${res.status}`);
}

export async function updatePsIssueFields(
  issueKey: string,
  fields: {
    assignee?: string | null;
    duedate?: string | null;
    timeoriginalestimate?: number;
    labels?: string[];
  },
): Promise<void> {
  const body: Record<string, any> = {};
  if ("assignee" in fields) body.assignee = fields.assignee ? { accountId: fields.assignee } : null;
  if ("duedate" in fields) body.duedate = fields.duedate ?? null;
  if (fields.timeoriginalestimate !== undefined) body.timeoriginalestimate = fields.timeoriginalestimate;
  if (fields.labels !== undefined) body.labels = fields.labels;
  const res = await jiraFetch(`/rest/api/3/issue/${issueKey}`, {
    method: "PUT",
    body: JSON.stringify({ fields: body }),
  });
  if (!res.ok && res.status !== 204) throw new Error(`Field update failed: ${res.status}`);
}

// ── HHC Support Tickets ───────────────────────────────────────────────────────

export async function searchHhcTicketsByOrganization(
  organizationName: string,
  openOnly = true,
  limit = 50,
): Promise<JiraTicket[]> {
  if (!isJiraConfigured()) return [];

  const escaped = organizationName.replace(/"/g, '\\"');
  const openClause = openOnly ? ' AND statusCategory != Done' : '';
  const jql = `project = HHC AND "Organizations" = "${escaped}"${openClause} ORDER BY created DESC`;

  const url = `${JIRA_BASE_URL}/rest/api/3/search/jql`;
  const body = {
    jql,
    fields: ["summary", "status", "created", "customfield_10010"],
    maxResults: limit,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    // Don't cache - we want fresh data
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Jira search failed: ${res.status} ${res.statusText}`);
  }

  const data: JqlSearchResponse = await res.json();

  return (data.issues ?? []).map(i => ({
    key: i.key,
    summary: i.fields.summary,
    status: i.fields.status?.name ?? "Unknown",
    statusCategory: i.fields.status?.statusCategory?.name ?? "Unknown",
    requestType: i.fields.customfield_10010?.requestType?.name ?? null,
    created: i.fields.created,
    url: `${JIRA_BASE_URL}/browse/${i.key}`,
  }));
}
