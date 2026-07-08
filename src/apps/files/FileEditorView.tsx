import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, Eye, Pencil, Save } from "lucide-react";
import { RichMarkdown } from "../../components/richmarkdown/RichMarkdown";
import { Button } from "../../components/ui";
import { isTextLikeMime } from "./types";

type FileViewMode = "edit" | "preview";

export interface FileEditorViewProps {
  file: { id: string; name: string; content: string; mimeType: string };
  onBack: () => void;
  onSave: (content: string) => Promise<void>;
}

function isMarkdown(name: string, mimeType: string): boolean {
  return name.toLowerCase().endsWith(".md") || mimeType === "text/markdown";
}

export function FileEditorView({ file, onBack, onSave }: FileEditorViewProps) {
  const [content, setContent] = useState(file.content);
  const [viewMode, setViewMode] = useState<FileViewMode>(() =>
    isMarkdown(file.name, file.mimeType) ? "preview" : "edit",
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const markdownFile = useMemo(
    () => (isMarkdown(file.name, file.mimeType) ? file : null),
    [file],
  );

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(content);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [content, onSave]);

  if (!isTextLikeMime(file.mimeType)) {
    return (
      <div className="arco-drive-editor">
        <div className="arco-drive-editor__header">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft size={13} /><T k={I18nKey.COMMON$BACK} /></Button>
          <span className="arco-drive-editor__path">{file.name}</span>
        </div>
        <div className="arco-empty"><T k={I18nKey.APPS$FILES_NO_EDITOR_FOR} />{file.mimeType}<T k={I18nKey.APPS$FILES_YET} /></div>
      </div>
    );
  }

  return (
    <div className="arco-drive-editor">
      <div className="arco-drive-editor__header">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={13} /><T k={I18nKey.COMMON$BACK} /></Button>
        <span className="arco-drive-editor__path">{file.name}</span>
        {markdownFile ? (
          <div className="arco-chip-row">
            <button
              type="button"
              className={`arco-chip${viewMode === "edit" ? " arco-chip--active" : ""}`}
              aria-pressed={viewMode === "edit"}
              onClick={() => setViewMode("edit")}
            >
              <Pencil size={12} /><T k={I18nKey.COMMON$EDIT} /></button>
            <button
              type="button"
              className={`arco-chip${viewMode === "preview" ? " arco-chip--active" : ""}`}
              aria-pressed={viewMode === "preview"}
              onClick={() => setViewMode("preview")}
            >
              <Eye size={12} /><T k={I18nKey.APPS$FILES_PREVIEW} /></button>
          </div>
        ) : null}
        <Button variant="primary" disabled={!dirty || saving} onClick={() => void save()}>
          <Save size={13} /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      {markdownFile && viewMode === "preview" ? (
        <div className="arco-drive-editor__preview arco-scroll">
          <RichMarkdown text={content} />
        </div>
      ) : (
        <textarea
          className="arco-code-editor arco-scroll"
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setDirty(true);
          }}
          spellCheck={false}
        />
      )}
    </div>
  );
}
