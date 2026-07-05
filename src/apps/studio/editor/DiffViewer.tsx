/**
 * DiffViewer — read-only Monaco diff for one agent file change (the
 * agent-canvas git-changes card, minus git). Lazy-loaded alongside
 * CodeEditor so the diff engine ships in the same on-demand chunk.
 */
import { DiffEditor } from "@monaco-editor/react";
import { languageForPath } from "./monacoSetup";

interface Props {
  path: string;
  /** null renders an empty original side — reads naturally as "new file". */
  before: string | null;
  after: string;
  theme: "light" | "dark";
}

export default function DiffViewer({ path, before, after, theme }: Props) {
  return (
    <DiffEditor
      original={before ?? ""}
      modified={after}
      language={languageForPath(path)}
      theme={theme === "dark" ? "arco-dark" : "arco-light"}
      options={{
        readOnly: true,
        renderSideBySide: false,
        fontSize: 12,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        lineNumbers: "off",
        folding: false,
        renderOverviewRuler: false,
      }}
    />
  );
}
