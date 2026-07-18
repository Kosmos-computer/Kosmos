#!/usr/bin/env node
/**
 * kosmos / arco CLI — thin HTTP client against the local Arco server.
 *
 * Usage:
 *   kosmos worktree list
 *   kosmos worktree create <path> <branch>
 *   kosmos worktree remove <path>
 *   kosmos worktree activate <path|primary>
 *   kosmos browser snapshot|click|fill  (prints guidance — agent tools preferred)
 *   kosmos help
 */

const BASE = process.env.ARCO_API ?? process.env.KOSMOS_API ?? "http://127.0.0.1:4600";

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg = typeof body === "object" && body && "error" in body ? body.error : text;
    throw new Error(`${res.status} ${msg || res.statusText}`);
  }
  return body;
}

function usage() {
  console.log(`Kosmos orchestration CLI

Usage:
  kosmos worktree list
  kosmos worktree create <path> <branch>
  kosmos worktree remove <path>
  kosmos worktree activate <path|primary>
  kosmos help

Environment:
  ARCO_API / KOSMOS_API  Server base (default ${BASE})

Browser click/fill/snapshot and computer use are available as agent tools
(browser_*, computer_*) and outward MCP intents while the desktop app is open.
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "help" || args[0] === "--help") {
    usage();
    return;
  }

  const [cmd, sub, ...rest] = args;

  if (cmd === "worktree") {
    if (sub === "list") {
      const trees = await api("/api/git/worktrees");
      console.log(JSON.stringify(trees, null, 2));
      return;
    }
    if (sub === "create") {
      const [wtPath, branch] = rest;
      if (!wtPath || !branch) throw new Error("usage: kosmos worktree create <path> <branch>");
      const out = await api("/api/git/worktrees", {
        method: "POST",
        body: JSON.stringify({ path: wtPath, branch }),
      });
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    if (sub === "remove") {
      const [wtPath] = rest;
      if (!wtPath) throw new Error("usage: kosmos worktree remove <path>");
      const out = await api("/api/git/worktrees", {
        method: "DELETE",
        body: JSON.stringify({ path: wtPath }),
      });
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    if (sub === "activate") {
      const [wtPath] = rest;
      if (!wtPath) throw new Error("usage: kosmos worktree activate <path|primary>");
      const path = wtPath === "primary" ? null : wtPath;
      const out = await api("/api/workspace/worktree", {
        method: "POST",
        body: JSON.stringify({ path }),
      });
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    throw new Error(`Unknown worktree subcommand: ${sub}`);
  }

  if (cmd === "browser") {
    console.log(
      JSON.stringify(
        {
          note: "Drive the Studio Browser via agent tools browser_snapshot / browser_click / browser_fill while Techno Studio Browser is open.",
          sub,
          args: rest,
        },
        null,
        2,
      ),
    );
    return;
  }

  throw new Error(`Unknown command: ${cmd}. Run kosmos help.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
