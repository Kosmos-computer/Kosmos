import { I18nKey } from "../../../i18n/declaration";
import i18n from "../../../i18n/index";
import { T } from "../../../i18n/T";
/**
 * TerminalTab — one merged command log: the agent's exec calls stream in
 * live (via the studio store) and the input row runs user commands through
 * the same /api/exec the agent uses. Agent entries are badged so it's clear
 * who ran what.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../lib/api";
import { useStudioStore } from "../studioStore";

let userCmdCounter = 0;

export function TerminalTab() {
  const commands = useStudioStore((s) => s.commands);
  const appendUserCommand = useStudioStore((s) => s.appendUserCommand);
  const updateUserCommand = useStudioStore((s) => s.updateUserCommand);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Follow output as it arrives (both agent and user commands).
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [commands]);

  const run = useCallback(async () => {
    const cmd = draft.trim();
    if (!cmd || busy) return;
    setDraft("");
    const id = `user_${++userCmdCounter}`;
    appendUserCommand({ id, command: cmd, stdout: "", stderr: "", exitCode: null, source: "user" });
    setBusy(true);
    try {
      const res = await api.exec(cmd);
      updateUserCommand(id, res);
    } catch (err) {
      updateUserCommand(id, {
        stderr: err instanceof Error ? err.message : "exec failed",
        exitCode: 1,
      });
    } finally {
      setBusy(false);
    }
  }, [draft, busy, appendUserCommand, updateUserCommand]);

  return (
    <div className="arco-terminal">
      <div ref={scrollRef} className="arco-terminal__output arco-scroll">
        {commands.length === 0 && (
          <div style={{ color: "var(--arco-text-tertiary)" }}><T k={I18nKey.APPS$STUDIO_AGENT_COMMANDS_APPEAR_HERE_AS_THEY_RUN_YOU_CAN_ALSO_RUN_} /></div>
        )}
        {commands.map((entry) => (
          <div key={entry.id} style={{ marginBottom: 10 }}>
            <div>
              {/* eslint-disable-next-line i18next/no-literal-string -- shell prompt glyph */}
              <span style={{ color: "var(--arco-accent)" }}>❯</span> {entry.command}
              {entry.source === "agent" && <span className="arco-studio__cmdbadge"><T k={I18nKey.APPS$STUDIO_AGENT} /></span>}
            </div>
            {entry.exitCode === null && <div style={{ color: "var(--arco-text-tertiary)" }}>…</div>}
            {entry.stdout && <pre>{entry.stdout}</pre>}
            {entry.stderr && <pre style={{ color: "var(--arco-danger)" }}>{entry.stderr}</pre>}
            {entry.exitCode !== null && entry.exitCode !== 0 && (
              <div style={{ color: "var(--arco-danger)" }}><T k={I18nKey.APPS$STUDIO_EXIT} />{entry.exitCode}</div>
            )}
          </div>
        ))}
      </div>
      <div className="arco-terminal__inputrow">
        {/* eslint-disable-next-line i18next/no-literal-string -- shell prompt glyph */}
        <span style={{ color: "var(--arco-accent)" }}>❯</span>
        <input
          className="arco-terminal__input"
          value={draft}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void run();
          }}
          placeholder={busy ? "running…" : "run a command in the workspace"}
          spellCheck={false}
          aria-label={i18n.t(I18nKey.APPS$STUDIO_TERMINAL_COMMAND)}
        />
      </div>
    </div>
  );
}
