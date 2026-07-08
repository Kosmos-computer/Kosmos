import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { BarChart3, ChevronLeft, Component, Table2 } from "lucide-react";
import { EmptyState } from "../../components/ui";

/** Placeholder for the note context canvas — graphs, tables, MD blocks, generative widgets. */
export function NotesCanvasStub({
  noteTitle,
  onCollapse,
}: {
  noteTitle: string;
  onCollapse?: () => void;
}) {
  return (
    <div className="arco-notes-canvas">
      <header className="arco-notes-canvas__header">
        <span className="arco-notes-canvas__title"><T k={I18nKey.APPS$NOTES_CONTEXT_CANVAS} /></span>
        {onCollapse ? (
          <button
            type="button"
            className="arco-notes-canvas__collapse"
            aria-label={i18n.t(I18nKey.APPS$NOTES_HIDE_CONTEXT_CANVAS)}
            title={i18n.t(I18nKey.APPS$NOTES_HIDE_CANVAS)}
            onClick={onCollapse}
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
          </button>
        ) : null}
      </header>
      <EmptyState className="arco-notes-canvas__stub" title={i18n.t(I18nKey.APPS$NOTES_CANVAS_COMING_SOON)}>
        <p className="arco-notes-canvas__copy"><T k={I18nKey.APPS$NOTES_THIS_PANEL_WILL_RENDER_DYNAMIC_VIEWS_FOR} /><strong>{noteTitle}</strong><T k={I18nKey.APPS$NOTES_LINK_GRAPHS_TABLE_SUMMARIES_STYLED_MARKDOWN_BLOCKS_AND_G} /></p>
        <ul className="arco-notes-canvas__preview" aria-label={i18n.t(I18nKey.APPS$NOTES_PLANNED_CANVAS_MODES)}>
          <li>
            <BarChart3 size={14} strokeWidth={1.75} aria-hidden="true" /><T k={I18nKey.APPS$NOTES_DATA_VIZ_FROM_TABLES_AMP_SHEETS} /></li>
          <li>
            <Table2 size={14} strokeWidth={1.75} aria-hidden="true" /><T k={I18nKey.APPS$NOTES_STRUCTURED_PREVIEWS_AMP_PIVOTS} /></li>
          <li>
            <Component size={14} strokeWidth={1.75} aria-hidden="true" /><T k={I18nKey.APPS$NOTES_LIVE_BLOCKS_AMP_MD_STYLE_COMPONENTS} /></li>
        </ul>
      </EmptyState>
    </div>
  );
}
