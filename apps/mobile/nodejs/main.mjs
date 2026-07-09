/**
 * Arco embedded backend entry — runs inside nodejs-mobile on Android.
 * Bundled runtime lives alongside this file under dist/nodejs/.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { channel, getDataPath } from "bridge";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
process.chdir(ROOT);

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
