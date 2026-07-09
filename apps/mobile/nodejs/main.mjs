/**
 * Arco embedded backend entry — runs inside nodejs-mobile on Android.
 * Bundled runtime lives alongside this file under dist/nodejs/.
 */
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import http from "node:http";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

/** Bundled server resolves generated assets relative to public/ parent — mirror on device. */
function ensureGeneratedPaths() {
  const inPublic = path.join(ROOT, "generated");
  const abovePublic = path.join(ROOT, "..", "generated");
  if (!fs.existsSync(inPublic)) return;
  if (fs.existsSync(abovePublic)) return;
  fs.cpSync(inPublic, abovePublic, { recursive: true });
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

const { channel, getDataPath } = await importBridge();

process.chdir(ROOT);
ensureGeneratedPaths();

const dataRoot = path.join(getDataPath(), "arco");
process.env.NODE_ENV = "production";
process.env.PORT = process.env.PORT ?? "4600";
process.env.ARCO_MOBILE_LOCAL = "1";
process.env.ARCO_PACKAGED = "1";
process.env.ARCO_DATA_DIR = dataRoot;

console.log(`[arco-mobile-local] data dir: ${dataRoot}`);

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

function waitForPort(port, maxMs = 120_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const req = http.request(
        { host: "127.0.0.1", port, path: "/api/auth/status", method: "GET", timeout: 2000 },
        (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) {
            notifyReady(port);
            resolve();
            return;
          }
          retry();
        },
      );
      req.on("error", retry);
      req.on("timeout", () => {
        req.destroy();
        retry();
      });
      req.end();

      function retry() {
        if (Date.now() - started > maxMs) {
          reject(new Error("Timed out waiting for Arco server"));
          return;
        }
        setTimeout(probe, 500);
      }
    };
    probe();
  });
}

try {
  await import("./server-boot.mjs");
  void waitForPort(Number(process.env.PORT)).catch(notifyError);
} catch (err) {
  notifyError(err);
}
