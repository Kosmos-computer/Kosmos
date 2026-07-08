import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
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
          <Save size={13} aria-hidden="true" /><T k={I18nKey.COMMON$SAVE} /></Button>
        {dirty ? (
          <span className="arco-notes__code-status"><T k={I18nKey.APPS$NOTES_UNSAVED_CHANGES} /></span>
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
        aria-label={i18n.t(I18nKey.APPS$NOTES_NOTE_DOCUMENT_JSON)}
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
