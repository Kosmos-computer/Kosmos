/**
 * Kosmos embedded backend entry — runs inside nodejs-mobile on Android.
 * Bundled runtime lives alongside this file under dist/nodejs/.
 */
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import http from "node:http";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BOOT_KEY = "__arcoMobileLocalBooting";

process.chdir(ROOT);
process.env.NODE_ENV = "production";
process.env.ARCO_MOBILE_LOCAL = "1";
process.env.ARCO_PACKAGED = "1";

/** Bundled server resolves some assets relative to public/ parent — mirror on device. */
function ensureSiblingRuntimePaths() {
  const mappings = [
    [path.join(ROOT, "generated"), path.join(ROOT, "..", "generated")],
    [path.join(ROOT, "server", "seeds"), path.join(ROOT, "..", "seeds")],
  ];
  for (const [source, dest] of mappings) {
    if (!fs.existsSync(source) || fs.existsSync(dest)) continue;
    fs.cpSync(source, dest, { recursive: true });
  }
}

/** ESM cannot resolve the Capacitor `bridge` package via NODE_PATH — load explicitly. */
async function importBridge() {
  const candidates = [
    path.join(ROOT, "node_modules", "bridge", "dist", "index.mjs"),
    path.join(ROOT, "..", "builtin_modules", "bridge", "dist", "index.mjs"),
  ];
  let lastErr;
  for (const candidate of candidates) {
    try {
      return await import(pathToFileURL(candidate).href);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("Capacitor nodejs bridge module not found");
}

function probeUrl(port, requestPath, acceptHtml = false) {
  return new Promise((resolve) => {
    const req = http.request(
      { host: "127.0.0.1", port, path: requestPath, method: "GET", timeout: 2000 },
      (res) => {
        res.resume();
        if (!res.statusCode || res.statusCode >= 500) {
          resolve(false);
          return;
        }
        if (!acceptHtml) {
          resolve(res.statusCode < 500);
          return;
        }
        const contentType = res.headers["content-type"] ?? "";
        resolve(res.statusCode < 400 && String(contentType).includes("text/html"));
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function probeHealth(port) {
  const [apiOk, shellOk] = await Promise.all([
    probeUrl(port, "/api/auth/status"),
    probeUrl(port, "/", true),
  ]);
  return { apiOk, shellOk };
}

function notifyReady(port) {
  const url = `http://127.0.0.1:${port}`;
  console.log(`[arco-mobile-local] server ready at ${url}`);
  channel.send("arco-server-ready", { port, url });
}

function notifyError(err) {
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  console.error("[arco-mobile-local] boot failed:", message);
  channel.send("arco-server-error", message);
}

function waitForHealthyServer(port, maxMs = 120_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const poll = async () => {
      const { apiOk, shellOk } = await probeHealth(port);
      if (apiOk && shellOk) {
        notifyReady(port);
        resolve();
        return;
      }
      if (Date.now() - started > maxMs) {
        reject(new Error("Timed out waiting for Kosmos server"));
        return;
      }
      setTimeout(poll, 500);
    };
    void poll();
  });
}

async function resolveListenPort(preferred = 4600) {
  for (let port = preferred; port < preferred + 10; port++) {
    const { apiOk, shellOk } = await probeHealth(port);
    if (shellOk) return { port, alreadyRunning: true };
    if (!apiOk) return { port, alreadyRunning: false };
    console.warn(`[arco-mobile-local] port ${port} has API but no shell — trying next port`);
  }
  throw new Error("No available port for Kosmos local server (stale listeners on 4600–4609)");
}

const { channel, getDataPath } = await importBridge();
ensureSiblingRuntimePaths();

const dataRoot = path.join(getDataPath(), "arco");
process.env.ARCO_DATA_DIR = dataRoot;

console.log(`[arco-mobile-local] data dir: ${dataRoot}`);

try {
  const { port, alreadyRunning } = await resolveListenPort(
    Number(process.env.PORT ?? 4600),
  );
  process.env.PORT = String(port);

  if (alreadyRunning) {
    console.log(`[arco-mobile-local] reusing healthy server on port ${port}`);
    notifyReady(port);
  } else if (globalThis[BOOT_KEY]) {
    console.log(`[arco-mobile-local] boot already in progress — waiting for port ${port}`);
    await waitForHealthyServer(port);
  } else {
    globalThis[BOOT_KEY] = true;
    await import("./server-boot.mjs");
    await waitForHealthyServer(port);
  }
} catch (err) {
  notifyError(err);
}
