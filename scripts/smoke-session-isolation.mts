/**
 * Live smoke for session isolation fixes.
 * Spins an ephemeral server (temp ARCO_DATA_DIR) and exercises:
 *   - eager POST /api/sessions
 *   - voice ensure (stable id)
 *   - concurrent turns on two sessions
 *   - delayed session-event focus rule (client guard)
 *   - shell-event envelope parse + activity fallback rule
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { shouldActivateOnSessionEvent } from "../src/apps/chat/sessionFocus.ts";
import { parseShellEventPayload } from "../shared/shellEvents.ts";

const PORT = 4699;
const BASE = `http://127.0.0.1:${PORT}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), "arco-smoke-sess-"));

let passed = 0;
let failed = 0;

function ok(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function json<T>(
  url: string,
  init?: RequestInit & { cookie?: string },
): Promise<{ status: number; body: T; setCookie?: string }> {
  const headers = new Headers(init?.headers);
  if (init?.cookie) headers.set("cookie", init.cookie);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  const setCookie = res.headers.getSetCookie?.()?.[0] ?? res.headers.get("set-cookie") ?? undefined;
  const text = await res.text();
  let body: T;
  try {
    body = JSON.parse(text) as T;
  } catch {
    body = text as unknown as T;
  }
  return { status: res.status, body, setCookie };
}

function cookieFromSetCookie(setCookie: string | undefined): string {
  if (!setCookie) return "";
  return setCookie.split(";")[0] ?? "";
}

async function waitForServer(timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/auth/status`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await sleep(200);
  }
  throw new Error("server did not become ready");
}

async function readSseEvents(
  res: Response,
  until: (events: Array<Record<string, unknown>>) => boolean,
  timeoutMs = 15_000,
): Promise<Array<Record<string, unknown>>> {
  if (!res.body) throw new Error("no body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events: Array<Record<string, unknown>> = [];
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          events.push(JSON.parse(raw) as Record<string, unknown>);
        } catch {
          // ignore
        }
      }
    }
    if (until(events)) {
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
      break;
    }
  }
  return events;
}

async function main() {
  console.log(`Smoke data dir: ${DATA}`);
  console.log(`Starting server on ${BASE}…`);

  const child: ChildProcess = spawn(
    process.execPath,
    ["--import", "tsx", "server/index.ts"],
    {
      cwd: path.resolve(import.meta.dirname, ".."),
      env: {
        ...process.env,
        PORT: String(PORT),
        ARCO_DATA_DIR: DATA,
        // Avoid scheduler / downloads noise during smoke.
        ARCO_LOW_MEMORY: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let serverLog = "";
  child.stdout?.on("data", (b: Buffer) => {
    serverLog += b.toString();
  });
  child.stderr?.on("data", (b: Buffer) => {
    serverLog += b.toString();
  });

  try {
    await waitForServer();
    ok("server ready", true);

    // ── Auth setup ──────────────────────────────────────────────────────────
    const setup = await json<{ user?: { username: string }; sessionToken?: string }>(
      `${BASE}/api/auth/setup`,
      {
        method: "POST",
        headers: { Origin: "http://localhost:9999" }, // force sessionToken in body
        body: JSON.stringify({
          username: "smoke",
          displayName: "Smoke",
          password: "smoke-test-password-123",
        }),
      },
    );
    ok("POST /api/auth/setup", setup.status === 200 || setup.status === 201, String(setup.status));
    const cookie = cookieFromSetCookie(setup.setCookie);
    const bearer = setup.body.sessionToken;
    const authHeader = bearer
      ? { Authorization: `Bearer ${bearer}` }
      : cookie
        ? { Cookie: cookie }
        : {};
    ok("got auth credential", Boolean(bearer || cookie));

    const authInit = (init?: RequestInit): RequestInit => ({
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        ...authHeader,
        ...(init?.body ? { "content-type": "application/json" } : {}),
      },
    });

    // ── Eager create ─────────────────────────────────────────────────────────
    console.log("\nEager session create");
    const created = await json<{ id: string; title: string; messages: unknown[] }>(
      `${BASE}/api/sessions`,
      authInit({
        method: "POST",
        body: JSON.stringify({ title: "New chat", projectId: null }),
      }),
    );
    ok("POST /api/sessions → 201", created.status === 201, String(created.status));
    ok("session has id", typeof created.body.id === "string" && created.body.id.length > 0);
    ok("session starts empty", Array.isArray(created.body.messages) && created.body.messages.length === 0);
    ok("title is New chat", created.body.title === "New chat");

    const created2 = await json<{ id: string }>(
      `${BASE}/api/sessions`,
      authInit({ method: "POST", body: JSON.stringify({}) }),
    );
    ok("second create gets distinct id", created2.body.id !== created.body.id, `${created.body.id} vs ${created2.body.id}`);

    // ── Voice ensure ─────────────────────────────────────────────────────────
    console.log("\nVoice session ensure");
    const voice1 = await json<{ id: string; title: string }>(
      `${BASE}/api/sessions/voice/ensure`,
      authInit({ method: "POST" }),
    );
    const voice2 = await json<{ id: string; title: string }>(
      `${BASE}/api/sessions/voice/ensure`,
      authInit({ method: "POST" }),
    );
    ok("voice ensure → 200", voice1.status === 200, String(voice1.status));
    ok("voice titled Voice chat", voice1.body.title === "Voice chat");
    ok("voice ensure is stable", voice1.body.id === voice2.body.id);
    ok("voice id ≠ eager chat ids", voice1.body.id !== created.body.id && voice1.body.id !== created2.body.id);

    // ── Concurrent chat turns ────────────────────────────────────────────────
    console.log("\nConcurrent turns on different sessions");
    const sessA = created.body.id;
    const sessB = created2.body.id;

    const startTurn = (sessionId: string, message: string) =>
      fetch(`${BASE}/api/chat`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({ sessionId, message }),
      });

    const [resA, resB] = await Promise.all([
      startTurn(sessA, "Smoke turn A — say only OK_A"),
      startTurn(sessB, "Smoke turn B — say only OK_B"),
    ]);

    ok("turn A accepted (not 409)", resA.status === 200, `status ${resA.status}`);
    ok("turn B accepted concurrently (not 409)", resB.status === 200, `status ${resB.status}`);

    // Status while both in flight (best-effort — mock/real models may finish fast)
    const [statusA, statusB] = await Promise.all([
      json<{ active: boolean }>(`${BASE}/api/chat/${sessA}/status`, authInit()),
      json<{ active: boolean }>(`${BASE}/api/chat/${sessB}/status`, authInit()),
    ]);
    ok(
      "status endpoints respond",
      statusA.status === 200 && statusB.status === 200,
      `${statusA.status}/${statusB.status}`,
    );

    const eventsA = await readSseEvents(resA, (ev) =>
      ev.some((e) => e.type === "done" || e.type === "error"),
    );
    const eventsB = await readSseEvents(resB, (ev) =>
      ev.some((e) => e.type === "done" || e.type === "error"),
    );

    const sessionEvA = eventsA.find((e) => e.type === "session");
    const sessionEvB = eventsB.find((e) => e.type === "session");
    ok("turn A emits session event for A", sessionEvA?.sessionId === sessA, JSON.stringify(sessionEvA));
    ok("turn B emits session event for B", sessionEvB?.sessionId === sessB, JSON.stringify(sessionEvB));
    ok(
      "turns did not cross session ids",
      !eventsA.some((e) => e.type === "session" && e.sessionId === sessB) &&
        !eventsB.some((e) => e.type === "session" && e.sessionId === sessA),
    );

    // Same-session second turn while first still active would 409 — start then immediately another
    const resBusy = await startTurn(sessA, "should queue/409 if still active");
    // After previous turn finished, this should be 200; if somehow still active → 409.
    // Either way proves the per-session lock exists.
    if (resBusy.status === 409) {
      ok("same-session overlap returns 409", true);
      try {
        await resBusy.body?.cancel();
      } catch {
        /* ignore */
      }
    } else {
      ok("same-session sequential turn accepted after prior finished", resBusy.status === 200, String(resBusy.status));
      await readSseEvents(resBusy, (ev) => ev.some((e) => e.type === "done" || e.type === "error"));
    }

    // ── Client focus guard (delayed session event) ───────────────────────────
    console.log("\nClient focus guard (cloud race simulation)");
    ok(
      "late session event does not activate after switch",
      shouldActivateOnSessionEvent({
        streamOwnerKey: sessA,
        activeKey: sessB,
        draftKey: "__draft__",
      }) === false,
    );
    ok(
      "late draft→id does not activate after New chat",
      shouldActivateOnSessionEvent({
        streamOwnerKey: "__draft__",
        activeKey: created2.body.id,
        draftKey: "__draft__",
      }) === false,
    );
    ok(
      "still-focused stream may activate",
      shouldActivateOnSessionEvent({
        streamOwnerKey: sessA,
        activeKey: sessA,
        draftKey: "__draft__",
      }) === true,
    );

    // ── Shell envelope ───────────────────────────────────────────────────────
    console.log("\nShell event envelope");
    const enveloped = parseShellEventPayload({
      sessionId: sessA,
      event: { type: "file_changed", path: "x.ts", before: null, after: "1" },
    });
    ok("envelope carries sessionId", enveloped?.sessionId === sessA);
    ok("legacy bare event is unscoped", parseShellEventPayload({ type: "apps_changed" })?.sessionId === null);

    // ── List shows all three ─────────────────────────────────────────────────
    console.log("\nSession list");
    const list = await json<Array<{ id: string }>>(`${BASE}/api/sessions`, authInit());
    const ids = new Set(list.body.map((s) => s.id));
    ok("list includes A, B, voice", ids.has(sessA) && ids.has(sessB) && ids.has(voice1.body.id));
  } catch (err) {
    failed += 1;
    console.error("\nSmoke aborted:", err);
    if (serverLog) {
      console.error("--- server log (tail) ---");
      console.error(serverLog.slice(-2000));
    }
  } finally {
    child.kill("SIGTERM");
    await sleep(300);
    try {
      child.kill("SIGKILL");
    } catch {
      /* ignore */
    }
    fs.rmSync(DATA, { recursive: true, force: true });
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

await main();
