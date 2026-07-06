import { useMemo, useState } from "react";
import {
  RichEditor,
  applyBlockFormat,
  setTextAlign,
  toggleTextMark,
  useEditorToolbar,
  type BubbleMenuExtraAction,
  type Editor,
  type JSONContent,
} from "@arco/editor-kit";
import { Mic, Sparkles, Square, Volume2 } from "lucide-react";
import { EditorToolbar } from "../../components/patterns/EditorToolbar";
import { NoteAiComposer } from "./NoteAiComposer";
import { NoteCodeEditor } from "./NoteCodeEditor";
import { NoteDictationBar } from "./NoteDictationBar";
import { hasEditorSelection } from "./noteEditorText";
import { useNoteAiAssist } from "./useNoteAiAssist";
import { useNoteDictation } from "./useNoteDictation";
import { useNoteReadAloud } from "./useNoteReadAloud";
import type { NoteEditorViewMode } from "./types";

export function NoteRichEditor({
  noteId,
  content,
  viewMode = "edit",
  onChange,
}: {
  noteId: string;
  content: JSONContent;
  viewMode?: NoteEditorViewMode;
  onChange: (doc: JSONContent) => void;
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const toolbar = useEditorToolbar(editor, viewMode === "edit");
  const readAloud = useNoteReadAloud(editor);
  const dictation = useNoteDictation(editor);
  const aiAssist = useNoteAiAssist(editor);
  const hasSelection = editor ? hasEditorSelection(editor) : false;

  const bubbleMenuActions = useMemo<BubbleMenuExtraAction[]>(
    () => [
      {
        id: "dictate",
        label: dictation.active ? "Stop dictation" : "Dictate selection",
        icon: Mic,
        active: dictation.active,
        onClick: () => void dictation.toggle(),
      },
      {
        id: "read-aloud",
        label: readAloud.status === "idle" ? "Read selection aloud" : "Stop reading",
        icon: readAloud.status === "playing" ? Square : Volume2,
        active: readAloud.status !== "idle",
        loading: readAloud.status === "loading",
        onClick: readAloud.toggle,
      },
      {
        id: "ai-assist",
        label: "AI assist",
        icon: Sparkles,
        active: aiAssist.open,
        onClick: () => aiAssist.openComposer("selection"),
      },
    ],
    [aiAssist.open, aiAssist.openComposer, dictation.active, dictation.toggle, readAloud.status, readAloud.toggle],
  );

  if (viewMode === "code") {
    return <NoteCodeEditor noteId={noteId} content={content} onChange={onChange} />;
  }

  const prosemirrorClass = [
    "arco-notes__prosemirror",
    viewMode === "preview" ? "arco-notes__prosemirror--readonly" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="arco-notes__editor-stack">
      {viewMode === "edit" && editor ? (
        <div className="arco-notes__editor-chrome">
          <EditorToolbar
            blockFormat={toolbar.blockFormat}
            onBlockFormatChange={(format) => applyBlockFormat(editor, format)}
            activeMarks={toolbar.marks}
            onToggleMark={(mark) => toggleTextMark(editor, mark)}
            align={toolbar.align}
            onAlignChange={(align) => setTextAlign(editor, align)}
            canUndo={toolbar.canUndo}
            canRedo={toolbar.canRedo}
            onUndo={() => editor.chain().focus().undo().run()}
            onRedo={() => editor.chain().focus().redo().run()}
            readAloudStatus={readAloud.status}
            onReadAloud={readAloud.toggle}
            dictationActive={dictation.active}
            dictationAvailable={dictation.available}
            onDictation={() => void dictation.toggle()}
            aiOpen={aiAssist.open}
            onAiAssist={() => (aiAssist.open ? aiAssist.closeComposer() : aiAssist.openComposer())}
          />
          <NoteDictationBar status={dictation.status} interim={dictation.interim} engine={dictation.engine} />
          <NoteAiComposer
            open={aiAssist.open}
            prompt={aiAssist.prompt}
            streaming={aiAssist.streaming}
            applyMode={aiAssist.applyMode}
            hasSelection={hasSelection}
            onPromptChange={aiAssist.setPrompt}
            onApplyModeChange={aiAssist.setApplyMode}
            onSubmit={() => void aiAssist.submit()}
            onStop={aiAssist.stop}
            onClose={aiAssist.closeComposer}
          />
          <p className="arco-notes__editor-hint">
            Type <kbd>/</kbd> for blocks · <kbd>Mic</kbd> to dictate · select text for formatting, AI, or read aloud
          </p>
        </div>
      ) : null}
      <div className="arco-notes__editor-surface">
        <RichEditor
          content={content}
          contentKey={noteId}
          editable={viewMode === "edit"}
          widgets
          slashCommands={viewMode === "edit"}
          bubbleMenu={viewMode === "edit"}
          bubbleMenuActions={viewMode === "edit" ? bubbleMenuActions : undefined}
          placeholder="Start writing, or type / for blocks…"
          className="arco-notes__editor-content"
          contentClassName="arco-notes__editor-content"
          prosemirrorClassName={prosemirrorClass}
          ariaLabel={viewMode === "preview" ? "Note preview" : "Note body"}
          onChange={onChange}
          onEditorReady={setEditor}
        />
      </div>
    </div>
  );
}
