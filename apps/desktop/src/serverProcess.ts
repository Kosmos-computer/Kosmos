import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";

export type ServerProcessOptions = {
  root: string;
  port: number;
  dataDir: string;
  /** Electron executable — runs embedded Node via ELECTRON_RUN_AS_NODE. */
  nodeExecutable: string;
  packaged?: boolean;
};

/** Spawn the Hono server using Electron's embedded Node (no system Node required). */
export function startServerProcess(options: ServerProcessOptions): ChildProcessWithoutNullStreams {
  const tsxCli = path.join(options.root, "node_modules", "tsx", "dist", "cli.mjs");
  const serverEntry = path.join(options.root, "server", "index.ts");

  return spawn(options.nodeExecutable, [tsxCli, serverEntry], {
    cwd: options.root,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(options.port),
      ARCO_DATA_DIR: options.dataDir,
      NODE_ENV: "production",
      ...(options.packaged ? { ARCO_PACKAGED: "1" } : {}),
    },
    stdio: "pipe",
  });
}

export async function waitForUrl(url: string, timeoutMs = 60_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.ok || res.status === 401 || res.status === 302) return;
    } catch {
      // Server still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

export function attachServerLogging(child: ChildProcessWithoutNullStreams): void {
  child.stdout.on("data", (chunk: Buffer) => process.stdout.write(`[arco-server] ${chunk}`));
  child.stderr.on("data", (chunk: Buffer) => process.stderr.write(`[arco-server] ${chunk}`));
}
