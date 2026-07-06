import { useCallback, useEffect, useMemo, useState } from "react";
import { SHEET_MIME } from "@shared/capabilities/files";
import { EMPTY_SHEET_JSON } from "@shared/capabilities/sheets";
import { api } from "../../lib/api";
import { systemLaunchKey, useDocumentLaunchStore } from "../../os/documentLaunchStore";
import { useOsStore } from "../../os/osStore";
import { SHEETS_WORKBOOKS } from "./sheetsMock";
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

/** Sheets editor — loads workbooks from Drive when available, falls back to mock data. */
export function useSheets() {
  const notify = useOsStore((s) => s.notify);
  const pendingLaunchId = useDocumentLaunchStore((s) => s.peek(systemLaunchKey("sheets")));
  const consumeLaunch = useDocumentLaunchStore((s) => s.consume);

  const [workbooks, setWorkbooks] = useState<Workbook[]>(SHEETS_WORKBOOKS);
  const [activeWorkbookId, setActiveWorkbookId] = useState(SHEETS_WORKBOOKS[0]?.id ?? "");
  const [openFileId, setOpenFileId] = useState<string | null>(null);
  const [location, setLocation] = useState<SheetsLocation>("home");
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [activeSheetId, setActiveSheetId] = useState(SHEETS_WORKBOOKS[0]?.sheets[0]?.id ?? "");
  const [sheetCells, setSheetCells] = useState<Record<string, SheetCells>>(() =>
    cellsBySheet(SHEETS_WORKBOOKS[0] ?? { id: "", title: "", sheets: [] }),
  );
  const [selection, setSelection] = useState<CellSelection>({ col: 0, row: 0 });
  const [formulaDraft, setFormulaDraft] = useState<string | null>(null);
  const [starred, setStarred] = useState(Boolean(SHEETS_WORKBOOKS[0]?.starred));
  const [history, setHistory] = useState<Record<string, SheetCells>[]>([sheetCells]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const activeWorkbook = workbooks.find((workbook) => workbook.id === activeWorkbookId) ?? workbooks[0];
  const activeSheet =
    activeWorkbook?.sheets.find((sheet) => sheet.id === activeSheetId) ?? activeWorkbook?.sheets[0];
  const cells = activeSheet ? sheetCells[activeSheet.id] ?? {} : {};
  const selectedAddress = cellAddress(selection.col, selection.row);
  const selectedCell = cells[selectedAddress];
  const formulaValue = formulaDraft ?? selectedCell?.formula ?? String(selectedCell?.value ?? "");

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
    setStarred(Boolean(workbook.starred));
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
      const driveIds = new Set(driveWorkbooks.map((workbook) => workbook.id));
      const merged = [
        ...driveWorkbooks,
        ...SHEETS_WORKBOOKS.filter((workbook) => !driveIds.has(workbook.id)),
      ];
      setWorkbooks(merged.length > 0 ? merged : SHEETS_WORKBOOKS);
    } catch {
      setWorkbooks(SHEETS_WORKBOOKS);
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
      const workbook = workbooks.find((item) => item.id === workbookId);
      if (!workbook) return;
      const isDriveFile = !SHEETS_WORKBOOKS.some((mock) => mock.id === workbookId);
      if (isDriveFile) {
        void openWorkbookFile(workbookId);
        return;
      }
      loadWorkbookState(workbook, null);
    },
    [loadWorkbookState, openWorkbookFile, workbooks],
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
  }, [
    activeSheet,
    activeWorkbook,
    notify,
    openFileId,
    refreshDriveWorkbooks,
    sheetCells,
    starred,
  ]);

  const createWorkbook = useCallback(async () => {
    const name = window.prompt("Spreadsheet name:", "Untitled spreadsheet");
    if (!name?.trim()) return;
    const workbook: Workbook = {
      id: `new-${Date.now()}`,
      title: name.trim(),
      sheets: EMPTY_SHEET_JSON.sheets.map((sheet) => ({ ...sheet, cells: {} })),
    };
    loadWorkbookState(workbook, null);
    setWorkbooks((prev) => [workbook, ...prev]);
    setDirty(true);
  }, [loadWorkbookState]);

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
    selectedDisplay: formatCellDisplay(selectedCell),
    formulaValue,
    setFormulaDraft,
    commitFormula,
    handleCellChange,
    handleToolAction,
    activeFormats,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    starred,
    setStarred,
    selectWorkbook,
    createWorkbook,
    saveWorkbook,
    dirty,
    saving,
    loading,
    error,
    openFileId,
  };
}

export type SheetsViewModel = ReturnType<typeof useSheets>;
