/**
 * Game window. Buttons call os.engine@1. The chat uses the same intents,
 * so opening the game here and asking the chat to open it share one session.
 */
import { createAppClient } from "/app-sdk.js";

const os = createAppClient();

const summary = document.getElementById("summary");
const port = document.getElementById("port");
const listening = document.getElementById("listening");
const windowLine = document.getElementById("window");
const note = document.getElementById("note");

function paint(status) {
  if (!status || typeof status !== "object") return;
  port.textContent = status.url || "—";
  listening.textContent = status.listening ? "yes" : "no";
  windowLine.textContent = status.window ? "this machine can show one" : "headless";
  note.textContent = status.error || status.windowNote || "";
  summary.textContent = status.listening
    ? "The engine is up. The chat can query it."
    : "The engine is not listening yet.";
}

async function refresh() {
  try {
    paint(await os.intents.invoke("engine.status", {}));
  } catch (err) {
    summary.textContent = err instanceof Error ? err.message : "Could not read engine status.";
  }
}

document.getElementById("open").addEventListener("click", async () => {
  summary.textContent = "Opening…";
  try {
    paint(await os.intents.invoke("engine.open", {}));
  } catch (err) {
    summary.textContent = err instanceof Error ? err.message : "Open failed.";
  }
});

document.getElementById("refresh").addEventListener("click", () => {
  void refresh();
});

document.getElementById("close").addEventListener("click", async () => {
  try {
    const result = await os.intents.invoke("engine.close", {});
    note.textContent = result?.reason || "";
    await refresh();
  } catch (err) {
    summary.textContent = err instanceof Error ? err.message : "Close failed.";
  }
});

void refresh();
