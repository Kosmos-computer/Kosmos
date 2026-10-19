/**
 * Read-only Plane REST client for the Studio issue list.
 *
 * The MCP server (seeded from ARCO_PLANE_MCP_URL) is what the agent calls
 * to update a card. This client only lists and fetches issues so a person
 * can open the matching Studio session. The token is the same PAT the MCP
 * seed already reads; it is sent as a header and never written here.
 */
import {
  parsePlaneCycles,
  parsePlaneIssue,
  parsePlaneIssueList,
  pickActiveCycle,
  planeEnv,
  type PlaneIssueSummary,
} from "./planeIssue.js";

function authHeaders(token: string): Record<string, string> {
  return { "X-Api-Key": token };
}

function requireConfig(): {
  token: string;
  apiUrl: string;
  workspace: string;
  projectId: string;
  projectKey: string;
  cycleId: string;
} {
  const cfg = planeEnv();
  if (!cfg.token) {
    throw new Error(
      "Plane token is not set. Set ARCO_PLANE_MCP_TOKEN or PLANE_PAT on the Kosmos computer.",
    );
  }
  return cfg;
}

async function planeGet(path: string): Promise<unknown> {
  const cfg = requireConfig();
  const res = await fetch(`${cfg.apiUrl}${path}`, { headers: authHeaders(cfg.token) });
  if (!res.ok) {
    throw new Error(`Plane returned ${res.status} for ${path}`);
  }
  return res.json() as Promise<unknown>;
}

/**
 * Issues on the active Engine cycle, oldest sequence first.
 * ARCO_PLANE_CYCLE_ID pins a cycle; otherwise the cycle that contains today.
 */
export async function listPlaneIssues(): Promise<PlaneIssueSummary[]> {
  const cfg = requireConfig();
  const root = `/api/v1/workspaces/${encodeURIComponent(cfg.workspace)}/projects/${encodeURIComponent(cfg.projectId)}`;
  let cycleId = cfg.cycleId;
  if (!cycleId) {
    cycleId = pickActiveCycle(parsePlaneCycles(await planeGet(`${root}/cycles/`)))?.id ?? "";
  }
  if (!cycleId) return [];
  const body = await planeGet(`${root}/cycles/${encodeURIComponent(cycleId)}/cycle-issues/`);
  return parsePlaneIssueList(body, cfg.projectKey);
}

/** One issue by Plane's uuid. */
export async function getPlaneIssue(issueId: string): Promise<PlaneIssueSummary> {
  const cfg = requireConfig();
  const body = await planeGet(
    `/api/v1/workspaces/${encodeURIComponent(cfg.workspace)}/projects/${encodeURIComponent(cfg.projectId)}/issues/${encodeURIComponent(issueId)}/`,
  );
  const issue = parsePlaneIssue(body, cfg.projectKey);
  if (!issue) throw new Error("Plane issue response was missing id, name, or sequence");
  return issue;
}
