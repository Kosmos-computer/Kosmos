import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { Grid3X3, Layers, Plus, Save, Share2, Star } from "lucide-react";
import { Avatar, Button } from "../../components/ui";
import { SidebarPane } from "../../components/patterns";
import { SheetGridView } from "./SheetGridView";
import { SheetsSidebar } from "./SheetsSidebar";
import { FormulaBar, SheetsToolbar } from "./SheetsToolbar";
import { SHEETS_MENU_ITEMS } from "./types";
import { useSheets } from "./useSheets";

export function SheetsApp() {
  const sheets = useSheets();

  return (
    <div className="arco-sheets">
      <SidebarPane
        width={sheets.sidebarWidth}
        onWidthChange={sheets.setSidebarWidth}
        minWidth={220}
        maxWidth={300}
        handleLabel={i18n.t(I18nKey.APPS$SHEETS_RESIZE_SHEETS_SIDEBAR)}
      >
        <SheetsSidebar
          workbooks={sheets.workbooks}
          activeWorkbookId={sheets.activeWorkbook?.id ?? ""}
          location={sheets.location}
          onLocationChange={sheets.setLocation}
          onSelectWorkbook={sheets.selectWorkbook}
          onNewWorkbook={() => void sheets.createWorkbook()}
        />
      </SidebarPane>

      <div className="arco-sheets__main">
        <header className="arco-sheets__title-bar">
          <div className="arco-sheets__title-left">
            <div className="arco-sheets__app-badge" aria-hidden="true">
              <Grid3X3 size={18} />
            </div>
            <div className="arco-sheets__title-block">
              <div className="arco-sheets__title-row">
                <h1 className="arco-sheets__title">{sheets.activeWorkbook?.title ?? "Untitled spreadsheet"}</h1>
                <button
                  type="button"
                  className={sheets.starred ? "arco-sheets__star--active" : "arco-sheets__star-btn"}
                  aria-label={sheets.starred ? "Remove from starred" : "Add to starred"}
                  onClick={() => sheets.setStarred((value) => !value)}
                >
                  <Star size={16} fill={sheets.starred ? "currentColor" : "none"} />
                </button>
              </div>
              <nav className="arco-sheets__menu-bar" aria-label={i18n.t(I18nKey.APPS$SHEETS_SPREADSHEET_MENU)}>
                {SHEETS_MENU_ITEMS.map((item) => (
                  <button key={item} type="button" className="arco-sheets__menu-item">
                    {item}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="arco-sheets__title-actions">
            <div className="arco-sheets__avatar-stack" aria-hidden="true">
              <Avatar name="Alex Morgan" size="sm" />
              <Avatar name="Jordan Lee" size="sm" />
            </div>
            <Button
              variant="primary"
              disabled={!sheets.dirty || sheets.saving}
              onClick={() => void sheets.saveWorkbook()}
            >
              <Save size={14} />
              {sheets.saving ? "Saving…" : sheets.dirty ? "Save" : "Saved"}
            </Button>
            <Button variant="default">
              <Share2 size={14} /><T k={I18nKey.APPS$SHEETS_SHARE} /></Button>
          </div>
        </header>

        {sheets.error ? <div className="arco-sheets__error">{sheets.error}</div> : null}
        {sheets.loading ? <div className="arco-sheets__status"><T k={I18nKey.APPS$SHEETS_LOADING_SPREADSHEET} /></div> : null}

        <SheetsToolbar
          canUndo={sheets.canUndo}
          canRedo={sheets.canRedo}
          activeFormats={sheets.activeFormats}
          onToolAction={sheets.handleToolAction}
        />

        <FormulaBar
          address={sheets.selectedAddress}
          value={sheets.formulaValue}
          onChange={sheets.setFormulaDraft}
          onCommit={sheets.commitFormula}
        />

        <div className="arco-sheets__grid-region">
          {sheets.activeSheet ? (
            <SheetGridView
              sheet={sheets.activeSheet}
              cells={sheets.cells}
              selection={sheets.selection}
              onSelectionChange={sheets.setSelection}
              onCellChange={sheets.handleCellChange}
            />
          ) : null}
        </div>

        <footer className="arco-sheets__sheet-tabs">
          <div className="arco-sheets__tab-controls">
            <Button variant="ghost" size="icon" aria-label={i18n.t(I18nKey.APPS$SHEETS_ADD_SHEET)} onClick={() => sheets.addSheet()}>
              <Plus size={15} />
            </Button>
            <button type="button" className="arco-sheets__all-sheets-btn" aria-label={i18n.t(I18nKey.APPS$SHEETS_ALL_SHEETS)}>
              <Layers size={15} />
            </button>
          </div>
          <div className="arco-sheets__tab-list" role="tablist" aria-label={i18n.t(I18nKey.APPS$SHEETS_SHEET_TABS)}>
            {(sheets.activeWorkbook?.sheets ?? []).map((sheet) => {
              const active = sheet.id === sheets.activeSheetId;
              return (
                <button
                  key={sheet.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={["arco-sheets__tab", active ? "arco-sheets__tab--active" : ""]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => sheets.setActiveSheetId(sheet.id)}
                >
                  {sheet.name}
                </button>
              );
            })}
          </div>
          <div className="arco-sheets__sheet-summary">
            {sheets.selectedCell ? sheets.selectedDisplay : "Select a cell"}
          </div>
        </footer>
      </div>
    </div>
  );
}
