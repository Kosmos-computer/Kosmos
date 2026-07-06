import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";

export type ServerProcessOptions = {
  root: string;
  port: number;
  dataDir: string;
};

/** Spawn the existing Hono server via the repo's tsx binary. */
export function startServerProcess(options: ServerProcessOptions): ChildProcessWithoutNullStreams {
  const tsxBin =
    process.platform === "win32"
      ? path.join(options.root, "node_modules", ".bin", "tsx.cmd")
      : path.join(options.root, "node_modules", ".bin", "tsx");

  return spawn(tsxBin, ["server/index.ts"], {
    cwd: options.root,
    env: {
      ...process.env,
      PORT: String(options.port),
      ARCO_DATA_DIR: options.dataDir,
      NODE_ENV: "production",
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
