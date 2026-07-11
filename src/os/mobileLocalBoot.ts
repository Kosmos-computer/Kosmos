/**
 * Embedded local backend on Android — nodejs-mobile sidecar + WebView redirect.
 */
import { isMobileLocalShell } from "./server/mobileShellMode";

function showBootStatus(message: string, detail?: string) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div class="arco-mobile-local-boot">
      <p><strong>${message}</strong></p>
      ${detail ? `<p>${detail}</p>` : ""}
    </div>
  `;
}

async function isLocalServerReady(url: string): Promise<boolean> {
  try {
    const [apiRes, shellRes] = await Promise.all([
      fetch(`${url}/api/auth/status`, { credentials: "include" }),
      fetch(`${url}/`, { credentials: "include" }),
    ]);
    if (!apiRes.ok || !shellRes.ok) return false;
    const contentType = shellRes.headers.get("content-type") ?? "";
    return contentType.includes("text/html");
  } catch {
    return false;
  }
}

async function pollLocalServer(maxMs = 120_000): Promise<string> {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    for (let port = 4600; port < 4610; port++) {
      const url = `http://127.0.0.1:${port}`;
      if (await isLocalServerReady(url)) return url;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Kosmos local server did not start in time");
}

/** Wait for embedded Node backend, then load the full shell from localhost:4600. */
export async function bootMobileLocalShell(): Promise<void> {
  if (!isMobileLocalShell()) return;

  const { hostname, port } = window.location;
  // Already served by the embedded sidecar (may use 4601+ if 4600 is stale).
  if (hostname === "127.0.0.1" && /^460\d$/.test(port)) {
    return;
  }

  showBootStatus("Starting Kosmos on this device…", "Embedded server is booting (first launch may take a minute).");

  const targetUrl = "http://127.0.0.1:4600";

  try {
    let NodeJS: typeof import("capacitor-nodejs").NodeJS;
    try {
      ({ NodeJS } = await import(/* @vite-ignore */ "capacitor-nodejs"));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("not implemented") || message.includes("UNIMPLEMENTED")) {
        showBootStatus(
          "Kosmos Local backend unavailable",
          "Install the Kosmos Local APK (not Kosmos Connect). Rebuild with npm run mobile:local:bundle.",
        );
        return;
      }
      throw err;
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error("Local server start timed out"));
      }, 120_000);

      void NodeJS.whenReady().then(() => {
        void NodeJS.addListener("arco-server-ready", (event) => {
          window.clearTimeout(timeout);
          const url = (event.args?.[0] as { url?: string } | undefined)?.url ?? targetUrl;
          window.location.replace(url);
          resolve();
        });
        void NodeJS.addListener("arco-server-error", (event) => {
          window.clearTimeout(timeout);
          reject(new Error(String(event.args?.[0] ?? "Local server failed")));
        });
      });

      void pollLocalServer()
        .then((url) => {
          window.clearTimeout(timeout);
          window.location.replace(url);
          resolve();
        })
        .catch(() => {
          /* channel / poll race — keep waiting for arco-server-ready or timeout */
        });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    showBootStatus("Could not start local Kosmos server", message);
    throw err;
  }
}
