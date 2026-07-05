/**
 * Terminal — a command runner against the same workspace exec the agent and
 * generated apps use (one-shot commands, not a pty; enough to inspect what
 * the agent built and poke at data scripts).
 */
import { useCallback, useRef, useState } from "react";

interface HistoryEntry {
  id: number;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

let entryId = 0;

export function TerminalApp() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [command, setCommand] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recall = useRef<number>(-1);

  const run = useCallback(async () => {
    const cmd = command.trim();
    if (!cmd || busy) return;
    setCommand("");
    recall.current = -1;
    const id = ++entryId;
    setHistory((h) => [...h, { id, command: cmd, stdout: "", stderr: "", exitCode: null }]);
    setBusy(true);
    try {
      const res = await fetch("/api/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      }).then((r) => r.json() as Promise<{ stdout: string; stderr: string; exitCode: number }>);
      setHistory((h) => h.map((e) => (e.id === id ? { ...e, ...res } : e)));
    } catch (err) {
      setHistory((h) =>
        h.map((e) =>
          e.id === id
            ? { ...e, stderr: err instanceof Error ? err.message : "exec failed", exitCode: 1 }
            : e,
        ),
      );
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    }
  }, [command, busy]);

  return (
    <div className="arco-terminal">
      <div ref={scrollRef} className="arco-terminal__output arco-scroll">
        {history.length === 0 && (
          <div style={{ color: "var(--arco-text-tertiary)" }}>
            Commands run in the Arco workspace (data/workspace). Try: ls scripts/
          </div>
        )}
        {history.map((entry) => (
          <div key={entry.id} style={{ marginBottom: 10 }}>
            <div>
              <span style={{ color: "var(--arco-accent)" }}>❯</span> {entry.command}
            </div>
            {entry.exitCode === null && <div style={{ color: "var(--arco-text-tertiary)" }}>…</div>}
            {entry.stdout && <pre>{entry.stdout}</pre>}
            {entry.stderr && <pre style={{ color: "var(--arco-danger)" }}>{entry.stderr}</pre>}
            {entry.exitCode !== null && entry.exitCode !== 0 && (
              <div style={{ color: "var(--arco-danger)" }}>exit {entry.exitCode}</div>
            )}
          </div>
        ))}
      </div>
      <div className="arco-terminal__inputrow">
        <span style={{ color: "var(--arco-accent)" }}>❯</span>
        <input
          className="arco-terminal__input"
          value={command}
          disabled={busy}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void run();
            if (e.key === "ArrowUp") {
              const commands = history.map((h) => h.command);
              if (commands.length === 0) return;
              recall.current =
                recall.current === -1
                  ? commands.length - 1
                  : Math.max(0, recall.current - 1);
              setCommand(commands[recall.current] ?? "");
            }
          }}
          placeholder={busy ? "running…" : "command"}
          spellCheck={false}
          aria-label="Terminal command"
        />
      </div>
    </div>
  );
}
