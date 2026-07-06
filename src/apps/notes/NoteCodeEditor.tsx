import { useCallback, useEffect, useState } from "react";
import { Save } from "lucide-react";
import type { JSONContent } from "@arco/editor-kit";
import { Button } from "../../components/ui";

function formatJson(content: JSONContent): string {
  return JSON.stringify(content, null, 2);
}

export function NoteCodeEditor({
  noteId,
  content,
  onChange,
}: {
  noteId: string;
  content: JSONContent;
  onChange: (doc: JSONContent) => void;
}) {
  const [text, setText] = useState(() => formatJson(content));
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(formatJson(content));
    setDirty(false);
    setError(null);
  }, [noteId]);

  useEffect(() => {
    if (!dirty) {
      setText(formatJson(content));
    }
  }, [content, dirty]);

  const save = useCallback(() => {
    try {
      const parsed = JSON.parse(text) as JSONContent;
      onChange(parsed);
      setDirty(false);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Invalid JSON");
    }
  }, [onChange, text]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        if (dirty) save();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dirty, save]);

  return (
    <div className="arco-notes__code-editor">
      <div className="arco-notes__code-toolbar">
        <Button variant="primary" size="default" disabled={!dirty} onClick={save}>
          <Save size={13} aria-hidden="true" /> Save
        </Button>
        {dirty ? (
          <span className="arco-notes__code-status">Unsaved changes</span>
        ) : null}
        {error ? (
          <span className="arco-notes__code-error" role="alert">
            {error}
          </span>
        ) : null}
      </div>
      <textarea
        className="arco-notes__code-view arco-scroll"
        value={text}
        aria-label="Note document JSON"
        spellCheck={false}
        onChange={(event) => {
          setText(event.target.value);
          setDirty(true);
          setError(null);
        }}
      />
    </div>
  );
}
