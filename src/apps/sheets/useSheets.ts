import { useCallback, useEffect, useMemo, useState } from "react";
import { SHEET_MIME } from "@shared/capabilities/files";
import { EMPTY_SHEET_JSON } from "@shared/capabilities/sheets";
import { api } from "../../lib/api";
import { systemLaunchKey, useDocumentLaunchStore } from "../../os/documentLaunchStore";
import { useOsStore } from "../../os/osStore";
import { evaluateFormula } from "@shared/sheetFormula";
import {
  cellAddress,
  formatCellDisplay,
  type Cell,
  type CellSelection,
  type SheetCells,
  type SheetsLocation,
  type Workbook,
} from "./types";
import { serializeWorkbook, workbookFromFile } from "./workbookFormat";

function cloneCells(cells: SheetCells): SheetCells {
  return Object.fromEntries(
    Object.entries(cells).map(([key, cell]) => [
      key,
      { ...cell, format: cell.format ? { ...cell.format } : undefined },
    ]),
  );
}

function cellsBySheet(workbook: Workbook): Record<string, SheetCells> {
  return Object.fromEntries(workbook.sheets.map((sheet) => [sheet.id, cloneCells(sheet.cells)]));
}

/** Sheets editor — Drive-backed workbooks with live formula recalculation. */
export function useSheets() {
  const notify = useOsStore((s) => s.notify);
  const pendingLaunchId = useDocumentLaunchStore((s) => s.peek(systemLaunchKey("sheets")));
  const consumeLaunch = useDocumentLaunchStore((s) => s.consume);

  const emptyWorkbook = useMemo(
    (): Workbook => ({
      id: "local",
      title: "Untitled spreadsheet",
      sheets: EMPTY_SHEET_JSON.sheets.map((sheet) => ({ ...sheet, cells: {} })),
    }),
    [],
  );

  const [workbooks, setWorkbooks] = useState<Workbook[]>([]);
  const [activeWorkbookId, setActiveWorkbookId] = useState("");
  const [openFileId, setOpenFileId] = useState<string | null>(null);
  const [location, setLocation] = useState<SheetsLocation>("home");
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  const [activeSheetId, setActiveSheetId] = useState(emptyWorkbook.sheets[0]?.id ?? "");
  const [sheetCells, setSheetCells] = useState<Record<string, SheetCells>>(() => cellsBySheet(emptyWorkbook));
  const [selection, setSelection] = useState<CellSelection>({ col: 0, row: 0 });
  const [formulaDraft, setFormulaDraft] = useState<string | null>(null);
  const [starred, setStarredState] = useState(false);
  const [history, setHistory] = useState<Record<string, SheetCells>[]>(() => [cellsBySheet(emptyWorkbook)]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const activeWorkbook = workbooks.find((workbook) => workbook.id === activeWorkbookId) ?? workbooks[0] ?? emptyWorkbook;
  const activeSheet =
    activeWorkbook.sheets.find((sheet) => sheet.id === activeSheetId) ?? activeWorkbook.sheets[0];
  const cells = activeSheet ? sheetCells[activeSheet.id] ?? {} : {};
  const selectedAddress = cellAddress(selection.col, selection.row);
  const selectedCell = cells[selectedAddress];
  const formulaValue = formulaDraft ?? selectedCell?.formula ?? String(selectedCell?.value ?? "");
  const selectedEvaluated =
    selectedCell?.formula?.startsWith("=") ? evaluateFormula(selectedCell.formula, cells) : undefined;

  const activeFormats = useMemo(() => {
    const formats = new Set<string>();
    if (selectedCell?.format?.bold) formats.add("bold");
    if (selectedCell?.format?.italic) formats.add("italic");
    if (selectedCell?.format?.strikethrough) formats.add("strikethrough");
    if (selectedCell?.format?.align) formats.add(`align-${selectedCell.format.align}`);
    if (selectedCell?.format?.numberFormat === "currency") formats.add("currency");
    if (selectedCell?.format?.numberFormat === "percent") formats.add("percent");
    return formats;
  }, [selectedCell]);

  const loadWorkbookState = useCallback((workbook: Workbook, fileId: string | null) => {
    const nextCells = cellsBySheet(workbook);
    setActiveWorkbookId(workbook.id);
    setOpenFileId(fileId);
    setActiveSheetId(workbook.sheets[0]?.id ?? "");
    setSheetCells(nextCells);
    setSelection({ col: 0, row: 0 });
    setFormulaDraft(null);
    setStarredState(Boolean(workbook.starred));
    setHistory([nextCells]);
    setHistoryIndex(0);
    setDirty(false);
  }, []);

  const refreshDriveWorkbooks = useCallback(async () => {
    try {
      const entries = await api.listDriveEntries({});
      const sheetEntries = entries.filter((entry) => entry.mimeType === SHEET_MIME && !entry.trashed);
      const driveWorkbooks: Workbook[] = sheetEntries.map((entry) => ({
        id: entry.id,
        title: entry.name.replace(/\.sheet\.json$/i, ""),
        meta: new Date(entry.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        starred: entry.starred,
        sheets: [{ id: "sheet-1", name: "Sheet1", cells: {} }],
      }));
      setWorkbooks(driveWorkbooks);
    } catch {
      setWorkbooks([]);
    }
  }, []);

  const openWorkbookFile = useCallback(
    async (fileId: string) => {
      setLoading(true);
      try {
        const file = await api.readDriveContent(fileId);
        const workbook = workbookFromFile(file.id, file.name, file.content);
        setWorkbooks((prev) => {
          const without = prev.filter((item) => item.id !== workbook.id);
          return [workbook, ...without];
        });
        loadWorkbookState(workbook, fileId);
        setError(null);
        setImportWarnings([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open spreadsheet");
      } finally {
        setLoading(false);
      }
    },
    [loadWorkbookState],
  );

  useEffect(() => {
    void refreshDriveWorkbooks();
  }, [refreshDriveWorkbooks]);

  useEffect(() => {
    const launchId = consumeLaunch(systemLaunchKey("sheets"));
    if (launchId) void openWorkbookFile(launchId);
  }, [consumeLaunch, openWorkbookFile, pendingLaunchId]);

  const selectWorkbook = useCallback(
    (workbookId: string) => {
      void openWorkbookFile(workbookId);
    },
    [openWorkbookFile],
  );

  const pushHistory = useCallback(
    (nextCellsBySheet: Record<string, SheetCells>) => {
      const nextHistory = history.slice(0, historyIndex + 1);
      nextHistory.push(nextCellsBySheet);
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
      setSheetCells(nextCellsBySheet);
      setDirty(true);
    },
    [history, historyIndex],
  );

  const updateActiveCells = useCallback(
    (updater: (current: SheetCells) => SheetCells) => {
      if (!activeSheet) return;
      pushHistory({
        ...sheetCells,
        [activeSheet.id]: updater(sheetCells[activeSheet.id] ?? {}),
      });
    },
    [activeSheet, pushHistory, sheetCells],
  );

  const handleCellChange = useCallback(
    (address: string, cell: Cell) => {
      updateActiveCells((current) => ({ ...current, [address]: cell }));
      setFormulaDraft(null);
    },
    [updateActiveCells],
  );

  const commitFormula = useCallback(() => {
    const trimmed = formulaValue.trim();
    handleCellChange(selectedAddress, {
      ...(selectedCell ?? { value: "" }),
      ...(trimmed.startsWith("=")
        ? { value: trimmed, formula: trimmed }
        : {
            value: trimmed === "" ? "" : Number.isNaN(Number(trimmed)) ? trimmed : Number(trimmed),
            formula: undefined,
          }),
    });
  }, [formulaValue, handleCellChange, selectedAddress, selectedCell]);

  const handleToolAction = useCallback(
    (toolId: string) => {
      if (toolId === "undo") {
        if (historyIndex <= 0) return;
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setSheetCells(history[nextIndex]);
        setDirty(true);
        return;
      }
      if (toolId === "redo") {
        if (historyIndex >= history.length - 1) return;
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setSheetCells(history[nextIndex]);
        setDirty(true);
        return;
      }

      updateActiveCells((current) => {
        const existing = current[selectedAddress] ?? { value: "" };
        const format = { ...existing.format };
        switch (toolId) {
          case "bold":
            format.bold = !format.bold;
            break;
          case "italic":
            format.italic = !format.italic;
            break;
          case "strikethrough":
            format.strikethrough = !format.strikethrough;
            break;
          case "align-left":
            format.align = "left";
            break;
          case "align-center":
            format.align = "center";
            break;
          case "align-right":
            format.align = "right";
            break;
          case "currency":
            format.numberFormat = format.numberFormat === "currency" ? "plain" : "currency";
            break;
          case "percent":
            format.numberFormat = format.numberFormat === "percent" ? "plain" : "percent";
            break;
          default:
            return current;
        }
        return { ...current, [selectedAddress]: { ...existing, format } };
      });
    },
    [history, historyIndex, selectedAddress, updateActiveCells],
  );

  const saveWorkbook = useCallback(async () => {
    if (!activeWorkbook || !activeSheet) return;
    setSaving(true);
    try {
      const payload: Workbook = {
        ...activeWorkbook,
        starred,
        sheets: activeWorkbook.sheets.map((sheet) => ({
          ...sheet,
          cells: sheetCells[sheet.id] ?? sheet.cells,
        })),
      };
      const content = serializeWorkbook(payload);
      if (openFileId) {
        await api.writeDriveContent(openFileId, content);
      } else {
        const created = await api.createDriveEntry({
          name: `${activeWorkbook.title}.sheet.json`,
          kind: "file",
          mimeType: SHEET_MIME,
          content,
        });
        setOpenFileId(created.id);
        setActiveWorkbookId(created.id);
        setWorkbooks((prev) => [{ ...payload, id: created.id }, ...prev.filter((w) => w.id !== activeWorkbook.id)]);
      }
      setDirty(false);
      setError(null);
      notify("Spreadsheet saved");
      await refreshDriveWorkbooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save spreadsheet");
    } finally {
      setSaving(false);
    }
  }, [activeSheet, activeWorkbook, notify, openFileId, refreshDriveWorkbooks, sheetCells, starred]);

  const createWorkbook = useCallback(async () => {
    const name = window.prompt("Spreadsheet name:", "Untitled spreadsheet");
    if (!name?.trim()) return;
    try {
      const created = await api.createDriveEntry({
        name: `${name.trim()}.sheet.json`,
        kind: "file",
        mimeType: SHEET_MIME,
        content: serializeWorkbook({
          id: "new",
          title: name.trim(),
          sheets: EMPTY_SHEET_JSON.sheets.map((sheet) => ({ ...sheet, cells: {} })),
        }),
      });
      await openWorkbookFile(created.id);
      notify(`Created ${created.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create spreadsheet");
    }
  }, [notify, openWorkbookFile]);

  const addSheet = useCallback(() => {
    if (!activeWorkbook) return;
    const index = activeWorkbook.sheets.length + 1;
    const id = `sheet-${Date.now()}`;
    const next: Workbook = {
      ...activeWorkbook,
      sheets: [...activeWorkbook.sheets, { id, name: `Sheet${index}`, cells: {} }],
    };
    setWorkbooks((prev) => prev.map((w) => (w.id === next.id ? next : w)));
    setSheetCells((prev) => ({ ...prev, [id]: {} }));
    setActiveSheetId(id);
    setDirty(true);
  }, [activeWorkbook]);

  return {
    workbooks,
    activeWorkbook,
    activeWorkbookId,
    activeSheet,
    activeSheetId,
    setActiveSheetId: (sheetId: string) => {
      setActiveSheetId(sheetId);
      setSelection({ col: 0, row: 0 });
      setFormulaDraft(null);
    },
    location,
    setLocation,
    sidebarWidth,
    setSidebarWidth,
    cells,
    selection,
    setSelection: (next: CellSelection) => {
      setSelection(next);
      setFormulaDraft(null);
    },
    selectedAddress,
    selectedCell,
    selectedDisplay: formatCellDisplay(selectedCell, selectedEvaluated),
    formulaValue,
    setFormulaDraft,
    commitFormula,
    handleCellChange,
    handleToolAction,
    activeFormats,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    starred,
    setStarred: (value: boolean | ((prev: boolean) => boolean)) => {
      setStarredState(value);
      setDirty(true);
    },
    selectWorkbook,
    createWorkbook,
    saveWorkbook,
    addSheet,
    dirty,
    saving,
    loading,
    error,
    openFileId,
    importWarnings,
  };
}

export type SheetsViewModel = ReturnType<typeof useSheets>;
