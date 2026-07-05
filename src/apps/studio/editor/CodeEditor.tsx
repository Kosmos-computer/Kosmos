/**
 * CodeEditor — the Studio's Monaco surface for editing a workspace file.
 *
 * Default export so the Files tab can React.lazy() it: Monaco (and its
 * workers) load only when a file is actually opened. Cmd/Ctrl+S is wired to
 * the caller's save handler instead of the browser's save dialog.
 */
import { useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { KeyCode, KeyMod } from "monaco-editor";
import { languageForPath } from "./monacoSetup";

interface Props {
  path: string;
  value: string;
  theme: "light" | "dark";
  onChange: (value: string) => void;
  onSave: () => void;
}

export default function CodeEditor({ path, value, theme, onChange, onSave }: Props) {
  // The save callback changes with dirty state; a ref keeps the Monaco
  // keybinding (registered once on mount) pointed at the latest closure.
  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  const handleMount: OnMount = (editor) => {
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, () => saveRef.current());
  };

  return (
    <Editor
      path={path}
      language={languageForPath(path)}
      value={value}
      theme={theme === "dark" ? "arco-dark" : "arco-light"}
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
      options={{
        fontSize: 12.5,
        fontFamily: "var(--arco-font-mono)",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 10 },
        renderLineHighlight: "line",
        tabSize: 2,
      }}
    />
  );
}
