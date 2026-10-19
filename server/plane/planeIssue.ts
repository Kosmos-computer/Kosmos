/**
 * Plane issue identity for a Techno Studio session.
 *
 * Studio owns the transcript. Plane owns the card. The note below is added
 * to the prompt the coding agent sees (ACP, Cursor, OpenHands, or the
 * built-in loop) and is not written into the saved user message.
 */

export interface PlaneIssueRef {
  planeIssueId?: string | null;
  planeIssueKey?: string | null;
}

export interface PlaneIssueSummary {
  id: string;
  key: string;
  name: string;
  sequenceId: number;
}

/** Kosmos Engine on the telepathy Plane. Override with ARCO_PLANE_PROJECT_ID. */
export const DEFAULT_PLANE_PROJECT_ID = "43597a50-93fd-46e3-891f-712abca82a99";

export const DEFAULT_PLANE_PROJECT_KEY = "ENGINE";

/** Shallow clone opened as the Studio project for engine work. */
export const ENGINE_GIT_REF = "Modern-Telepathy/kosmos-engine";

export interface PlaneCycle {
  id: string;
  name: string;
  start: string | null;
  end: string | null;
}

export interface PlaneEnv {
  token: string;
  workspace: string;
  apiUrl: string;
  projectId: string;
  projectKey: string;
  /** Empty means "whichever cycle contains today". */
  cycleId: string;
}

/**
 * Where Studio's read-only issue list should call Plane.
 * An explicit ARCO_PLANE_API_URL wins. On the telepathy host the container
 * already speaks to Plane's MCP by its compose name, and the REST API is
 * the proxy on that same network. A laptop uses the published tunnel port.
 */
export function planeApiUrl(env: NodeJS.ProcessEnv): string {
  const explicit = env.ARCO_PLANE_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const mcp = env.ARCO_PLANE_MCP_URL?.trim() ?? "";
  try {
    if (new URL(mcp).hostname === "plane-plane-mcp-1") return "http://plane-proxy-1";
  } catch {
    // No MCP URL yet. The local tunnel is the useful default.
  }
  return "http://127.0.0.1:8090";
}

/** Read Plane connection settings. apiUrl and token may be empty. */
export function planeEnv(env: NodeJS.ProcessEnv = process.env): PlaneEnv {
  return {
    token: env.ARCO_PLANE_MCP_TOKEN?.trim() || env.PLANE_PAT?.trim() || "",
    workspace: env.ARCO_PLANE_MCP_WORKSPACE?.trim() || "kosmos",
    apiUrl: planeApiUrl(env),
    projectId: env.ARCO_PLANE_PROJECT_ID?.trim() || DEFAULT_PLANE_PROJECT_ID,
    projectKey: env.ARCO_PLANE_PROJECT_KEY?.trim() || DEFAULT_PLANE_PROJECT_KEY,
    cycleId: env.ARCO_PLANE_CYCLE_ID?.trim() || "",
  };
}

/**
 * Cycles from Plane's list payload. Studio shows one cycle, the one that
 * contains today, so the Engine board is not the whole project history.
 */
export function parsePlaneCycles(body: unknown): PlaneCycle[] {
  const results = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { results?: unknown }).results)
      ? (body as { results: unknown[] }).results
      : [];
  const out: PlaneCycle[] = [];
  for (const row of results) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id : "";
    if (!id) continue;
    out.push({
      id,
      name: typeof rec.name === "string" ? rec.name : id,
      start: typeof rec.start_date === "string" ? rec.start_date : null,
      end: typeof rec.end_date === "string" ? rec.end_date : null,
    });
  }
  return out;
}

/**
 * The cycle a person should see. Prefer the window that contains `now`.
 * If none does, use the one that ended most recently.
 */
export function pickActiveCycle(cycles: PlaneCycle[], now = new Date()): PlaneCycle | null {
  const t = now.getTime();
  const containing = cycles.find((cycle) => {
    const start = cycle.start ? Date.parse(cycle.start) : NaN;
    const end = cycle.end ? Date.parse(cycle.end) : NaN;
    return Number.isFinite(start) && Number.isFinite(end) && t >= start && t <= end;
  });
  if (containing) return containing;
  const dated = cycles
    .map((cycle) => ({ cycle, when: Date.parse(cycle.end || cycle.start || "") }))
    .filter((row) => Number.isFinite(row.when))
    .sort((a, b) => b.when - a.when);
  return dated[0]?.cycle ?? cycles[0] ?? null;
}

/**
 * Turn Plane's issue list payload into the rows Studio shows.
 * Accepts either a bare array or the paginated `{ results }` shape.
 */
export function parsePlaneIssueList(body: unknown, projectKey: string): PlaneIssueSummary[] {
  const results = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { results?: unknown }).results)
      ? (body as { results: unknown[] }).results
      : [];
  const out: PlaneIssueSummary[] = [];
  for (const row of results) {
    if (!row || typeof row !== "object") continue;
    const raw = row as Record<string, unknown>;
    // Cycle membership rows sometimes nest the issue under `issue`.
    const rec =
      raw.issue && typeof raw.issue === "object" ? (raw.issue as Record<string, unknown>) : raw;
    const id = typeof rec.id === "string" ? rec.id : "";
    const name = typeof rec.name === "string" ? rec.name : "";
    const sequence = typeof rec.sequence_id === "number" ? rec.sequence_id : Number(rec.sequence_id);
    if (!id || !name || !Number.isFinite(sequence)) continue;
    out.push({ id, name, sequenceId: sequence, key: `${projectKey}-${sequence}` });
  }
  return out.sort((a, b) => a.sequenceId - b.sequenceId);
}

/** One issue object from Plane's detail endpoint. */
export function parsePlaneIssue(body: unknown, projectKey: string): PlaneIssueSummary | null {
  const [one] = parsePlaneIssueList([body], projectKey);
  return one ?? null;
}

/**
 * Short instruction prepended for the agent only.
 * Empty when this session is not bound to a Plane issue.
 */
export function planeIssueNote(session: PlaneIssueRef): string {
  if (!session.planeIssueKey && !session.planeIssueId) return "";
  const key = session.planeIssueKey ?? session.planeIssueId;
  const id = session.planeIssueId ?? "unknown";
  return (
    `This Studio session is the conversation for Plane issue ${key} (${id}). ` +
    `Update that issue through the Plane tools. ` +
    `Agent Canvas may comment on the same issue from its own run; that log is not this transcript.`
  );
}

/** Text sent to an external agent. The stored user message stays unchanged. */
export function messageForAgent(session: PlaneIssueRef, userMessage: string): string {
  const note = planeIssueNote(session);
  if (!note) return userMessage;
  return `${userMessage}\n\n[${note}]`;
}
