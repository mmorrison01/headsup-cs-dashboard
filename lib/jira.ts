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
