/**
 * Slides — DOM canvas presentation editor over os.files@1 / os.slides@1.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { createAppClient } from "/app-sdk.js";
import { EMPTY_SLIDES_JSON } from "@shared/capabilities/slides";
import { SLIDES_MIME } from "@shared/capabilities/files";

interface AppClient {
  intents: { invoke: (intent: string, params?: Record<string, unknown>) => Promise<unknown> };
  shell: { notify: (message: string) => Promise<unknown> };
  events: { on: (topic: string, fn: () => void) => () => void };
}

type ShapeKind = "rect" | "ellipse" | "triangle" | "line" | "diamond";
type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface SlideBox {
  id: string;
  kind: "text" | "image" | "shape";
  x: number;
  y: number;
  w: number;
  h: number;
  content?: unknown;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  color?: string;
  textAlign?: "left" | "center" | "right";
  shape?: ShapeKind;
  groupId?: string;
}

interface Slide {
  id: string;
  boxes: SlideBox[];
  notes?: string;
}

interface Deck {
  version: number;
  title?: string;
  width: number;
  height: number;
  slides: Slide[];
}

interface FileEntry {
  id: string;
  name: string;
  mimeType: string;
  updatedAt: string;
  trashed?: boolean;
}

interface DragState {
  mode: "move" | "resize";
  ids: string[];
  startX: number;
  startY: number;
  origins: Record<string, { x: number; y: number; w: number; h: number }>;
  handle?: ResizeHandle;
}

const SHAPE_OPTIONS: { value: ShapeKind; label: string }[] = [
  { value: "rect", label: "Rectangle" },
  { value: "ellipse", label: "Ellipse" },
  { value: "triangle", label: "Triangle" },
  { value: "diamond", label: "Diamond" },
  { value: "line", label: "Line" },
];

const RESIZE_HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const MIN_BOX = 24;

function readFileIdFromUrl(): string | null {
  const hash = location.hash.match(/file=([^&]+)/)?.[1];
  if (hash) return decodeURIComponent(hash);
  return new URLSearchParams(location.search).get("fileId");
}

/** Update the file hash without scrolling the browsing context (location.hash = "" jumps to top). */
function setFileHash(fileId: string | null) {
  const url = new URL(location.href);
  if (fileId) url.hash = `file=${encodeURIComponent(fileId)}`;
  else url.hash = "";
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function boxText(box: SlideBox): string {
  if (typeof box.content === "string") return box.content;
  if (box.content && typeof box.content === "object") {
    const walk = (n: { text?: string; content?: unknown[] }): string => {
      if (n.text) return n.text;
      return ((n.content as { text?: string; content?: unknown[] }[]) ?? []).map(walk).join("");
    };
    return walk(box.content as { text?: string; content?: unknown[] });
  }
  return "";
}

function textToDoc(text: string) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : [] }],
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function shapeStyle(box: SlideBox): CSSProperties {
  const shape = box.shape ?? "rect";
  const fill = box.fill ?? "#6ea8fe";
  const stroke = box.stroke;
  const strokeWidth = box.strokeWidth ?? (stroke ? 2 : 0);
  const base: CSSProperties = {
    background: shape === "line" ? (stroke ?? fill) : fill,
    border: stroke && shape !== "line" ? `${strokeWidth}px solid ${stroke}` : undefined,
  };
  if (shape === "ellipse") return { ...base, borderRadius: "50%" };
  if (shape === "triangle") return { ...base, clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" };
  if (shape === "diamond") return { ...base, clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" };
  if (shape === "line") {
    return {
      ...base,
      height: Math.max(strokeWidth || 4, 4),
      borderRadius: 999,
      top: box.y + box.h / 2 - Math.max(strokeWidth || 4, 4) / 2,
    };
  }
  return base;
}

function clampBox(
  x: number,
  y: number,
  w: number,
  h: number,
  canvasW: number,
  canvasH: number,
): { x: number; y: number; w: number; h: number } {
  const nextW = Math.max(MIN_BOX, Math.min(w, canvasW));
  const nextH = Math.max(MIN_BOX, Math.min(h, canvasH));
  return {
    w: nextW,
    h: nextH,
    x: Math.max(0, Math.min(x, canvasW - nextW)),
    y: Math.max(0, Math.min(y, canvasH - nextH)),
  };
}

function applyResize(
  origin: { x: number; y: number; w: number; h: number },
  handle: ResizeHandle,
  dx: number,
  dy: number,
  canvasW: number,
  canvasH: number,
) {
  let { x, y, w, h } = origin;
  if (handle.includes("e")) w = origin.w + dx;
  if (handle.includes("s")) h = origin.h + dy;
  if (handle.includes("w")) {
    w = origin.w - dx;
    x = origin.x + dx;
  }
  if (handle.includes("n")) {
    h = origin.h - dy;
    y = origin.y + dy;
  }
  if (w < MIN_BOX) {
    if (handle.includes("w")) x = origin.x + origin.w - MIN_BOX;
    w = MIN_BOX;
  }
  if (h < MIN_BOX) {
    if (handle.includes("n")) y = origin.y + origin.h - MIN_BOX;
    h = MIN_BOX;
  }
  return clampBox(x, y, w, h, canvasW, canvasH);
}

function relatedIds(boxes: SlideBox[], id: string): string[] {
  const target = boxes.find((b) => b.id === id);
  if (!target?.groupId) return [id];
  return boxes.filter((b) => b.groupId === target.groupId).map((b) => b.id);
}

export function App() {
  const [os] = useState(() => createAppClient());
  const [decks, setDecks] = useState<FileEntry[]>([]);
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [deck, setDeck] = useState<Deck | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [presenting, setPresenting] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [homeView, setHomeView] = useState<"all" | "recent">("all");
  const editRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const activeSlide = deck?.slides[slideIndex] ?? null;
  const selectedBoxes = (activeSlide?.boxes ?? []).filter((b) => selectedIds.includes(b.id));
  const primaryBox = selectedBoxes[0] ?? null;
  const canGroup = selectedIds.length >= 2;
  const canUngroup = selectedBoxes.some((b) => Boolean(b.groupId));

  const homeDecks = useMemo(() => {
    const sorted = [...decks].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return homeView === "recent" ? sorted.slice(0, 8) : sorted;
  }, [decks, homeView]);

  const homeTitle = homeView === "recent" ? "Recent" : "All presentations";

  const refreshList = useCallback(async () => {
    if (!os) return;
    try {
      const all = (await os.intents.invoke("files.list", {})) as FileEntry[];
      setDecks(all.filter((f) => f.mimeType === SLIDES_MIME && !f.trashed));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to list presentations");
    }
  }, [os]);

  const openDeck = useCallback(
    async (id: string) => {
      if (!os) return;
      try {
        const result = (await os.intents.invoke("slides.open", { id })) as {
          id: string;
          name: string;
          deck: Deck;
        };
        setFileId(result.id);
        setFileName(result.name);
        setDeck(result.deck);
        setSlideIndex(0);
        setSelectedIds([]);
        setEditingId(null);
        setDirty(false);
        setWarnings([]);
        setFileHash(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to open presentation");
      }
    },
    [os],
  );

  useEffect(() => {
    if (!os) return;
    void refreshList();
    const initial = readFileIdFromUrl();
    if (initial) void openDeck(initial);
    const onHash = () => {
      const next = readFileIdFromUrl();
      if (next) void openDeck(next);
    };
    window.addEventListener("hashchange", onHash);
    const unsub = os.events.on("files.changed", () => void refreshList());
    return () => {
      window.removeEventListener("hashchange", onHash);
      unsub();
    };
  }, [os, refreshList, openDeck]);

  const saveDeck = useCallback(async () => {
    if (!os || !fileId || !deck) return;
    setSaving(true);
    try {
      await os.intents.invoke("files.content.write", {
        id: fileId,
        content: JSON.stringify(deck),
      });
      setDirty(false);
      void os.shell.notify("Saved");
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [os, fileId, deck, refreshList]);

  const createDeck = useCallback(async () => {
    if (!os) return;
    const name = prompt("Presentation name:", "Untitled.slides.json");
    if (!name?.trim()) return;
    try {
      const created = (await os.intents.invoke("slides.create", {
        name: name.trim(),
        content: { ...EMPTY_SLIDES_JSON, slides: EMPTY_SLIDES_JSON.slides.map((s) => ({ ...s })) },
      })) as FileEntry;
      if (!created?.id) throw new Error("Create returned no file id");
      await refreshList();
      await openDeck(created.id);
      void os.shell.notify(`Created ${created.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }, [os, openDeck, refreshList]);

  const updateDeck = useCallback((updater: (current: Deck) => Deck) => {
    setDeck((prev) => (prev ? updater(prev) : prev));
    setDirty(true);
  }, []);

  const patchBoxes = useCallback(
    (mutator: (boxes: SlideBox[]) => SlideBox[]) => {
      updateDeck((current) => ({
        ...current,
        slides: current.slides.map((slide, i) =>
          i === slideIndex ? { ...slide, boxes: mutator(slide.boxes) } : slide,
        ),
      }));
    },
    [slideIndex, updateDeck],
  );

  const patchSelected = useCallback(
    (patch: Partial<SlideBox>) => {
      if (!selectedIds.length) return;
      patchBoxes((boxes) => boxes.map((b) => (selectedIds.includes(b.id) ? { ...b, ...patch } : b)));
    },
    [patchBoxes, selectedIds],
  );

  const addSlide = useCallback(() => {
    if (!deck) return;
    const nextIndex = deck.slides.length;
    updateDeck((current) => ({
      ...current,
      slides: [...current.slides, { id: `slide-${Date.now()}`, boxes: [], notes: "" }],
    }));
    setSlideIndex(nextIndex);
    setSelectedIds([]);
    setEditingId(null);
  }, [deck, updateDeck]);

  const setSlideNotes = useCallback(
    (notes: string) => {
      updateDeck((current) => ({
        ...current,
        slides: current.slides.map((slide, i) =>
          i === slideIndex ? { ...slide, notes } : slide,
        ),
      }));
    },
    [slideIndex, updateDeck],
  );

  const addTextBox = useCallback(() => {
    if (!activeSlide) return;
    const id = `box-${Date.now()}`;
    patchBoxes((boxes) => [
      ...boxes,
      {
        id,
        kind: "text" as const,
        x: 80,
        y: 80,
        w: 480,
        h: 96,
        color: "#eef1f6",
        content: textToDoc("New text"),
      },
    ]);
    setSelectedIds([id]);
    setEditingId(id);
  }, [activeSlide, patchBoxes]);

  const addShape = useCallback(
    (shape: ShapeKind = "rect") => {
      if (!activeSlide) return;
      const id = `box-${Date.now()}`;
      const isLine = shape === "line";
      patchBoxes((boxes) => [
        ...boxes,
        {
          id,
          kind: "shape" as const,
          shape,
          x: 120,
          y: 160,
          w: isLine ? 280 : 240,
          h: isLine ? 8 : 140,
          fill: "#6ea8fe",
          stroke: "#3b6fd4",
          strokeWidth: 2,
        },
      ]);
      setSelectedIds([id]);
      setEditingId(null);
    },
    [activeSlide, patchBoxes],
  );

  const addImageFromFile = useCallback(
    async (file: File) => {
      if (!activeSlide) return;
      try {
        const dataUrl = await fileToDataUrl(file);
        const id = `box-${Date.now()}`;
        patchBoxes((boxes) => [
          ...boxes,
          {
            id,
            kind: "image" as const,
            x: 100,
            y: 100,
            w: 320,
            h: 200,
            content: dataUrl,
          },
        ]);
        setSelectedIds([id]);
        setEditingId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add image");
      }
    },
    [activeSlide, patchBoxes],
  );

  const groupSelected = useCallback(() => {
    if (selectedIds.length < 2) return;
    const groupId = `group-${Date.now()}`;
    patchBoxes((boxes) =>
      boxes.map((b) => (selectedIds.includes(b.id) ? { ...b, groupId } : b)),
    );
  }, [patchBoxes, selectedIds]);

  const ungroupSelected = useCallback(() => {
    if (!selectedIds.length) return;
    const groupIds = new Set(
      (activeSlide?.boxes ?? [])
        .filter((b) => selectedIds.includes(b.id) && b.groupId)
        .map((b) => b.groupId as string),
    );
    if (!groupIds.size) return;
    patchBoxes((boxes) =>
      boxes.map((b) => (b.groupId && groupIds.has(b.groupId) ? { ...b, groupId: undefined } : b)),
    );
  }, [activeSlide, patchBoxes, selectedIds]);

  const deleteSelected = useCallback(() => {
    if (!selectedIds.length) return;
    patchBoxes((boxes) => boxes.filter((b) => !selectedIds.includes(b.id)));
    setSelectedIds([]);
    setEditingId(null);
  }, [patchBoxes, selectedIds]);

  const exportDeck = useCallback(
    async (format: "html" | "odp" | "pptx" | "pdf" | "json") => {
      if (!os || !fileId) return;
      try {
        const result = (await os.intents.invoke("slides.export", { id: fileId, format })) as {
          content?: string;
          contentBase64?: string;
          filenameExt?: string;
          warnings?: string[];
        };
        if (result.warnings?.length) setWarnings(result.warnings);
        const base = fileName.replace(/\.slides\.json$/i, "");
        if (result.content && (format === "html" || format === "json")) {
          const blob = new Blob([result.content], {
            type: format === "html" ? "text/html" : "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${base}.${result.filenameExt ?? format}`;
          a.click();
          URL.revokeObjectURL(url);
        } else if (result.contentBase64) {
          const bin = Uint8Array.from(atob(result.contentBase64), (c) => c.charCodeAt(0));
          const url = URL.createObjectURL(new Blob([bin]));
          const a = document.createElement("a");
          a.href = url;
          a.download = `${base}.${result.filenameExt ?? format}`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Export failed");
      }
    },
    [os, fileId, fileName],
  );

  const importDeck = useCallback(
    async (file: File) => {
      if (!os) return;
      const lower = file.name.toLowerCase();
      const format = lower.endsWith(".pptx")
        ? "pptx"
        : lower.endsWith(".odp")
          ? "odp"
          : lower.endsWith(".html") || lower.endsWith(".htm")
            ? "html"
            : null;
      if (!format) {
        setError("Unsupported import format");
        return;
      }
      try {
        const contentBase64 = await fileToBase64(file);
        const created = (await os.intents.invoke("slides.import", {
          name: file.name,
          format,
          contentBase64,
        })) as FileEntry & { warnings?: string[] };
        if (created.warnings?.length) setWarnings(created.warnings);
        await openDeck(created.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      }
    },
    [os, openDeck],
  );

  useEffect(() => {
    if (!presenting) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPresenting(false);
      if (event.key === "ArrowRight" || event.key === " ") {
        setSlideIndex((i) => Math.min((deck?.slides.length ?? 1) - 1, i + 1));
      }
      if (event.key === "ArrowLeft") setSlideIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, deck?.slides.length]);

  useEffect(() => {
    if (presenting || editingId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Backspace" || event.key === "Delete") {
        const target = event.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
          return;
        }
        if (selectedIds.length) {
          event.preventDefault();
          deleteSelected();
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "g") {
        event.preventDefault();
        if (event.shiftKey) ungroupSelected();
        else groupSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected, editingId, groupSelected, presenting, selectedIds.length, ungroupSelected]);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (!drag || !deck) return;
    const onMove = (event: MouseEvent) => {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      patchBoxes((boxes) =>
        boxes.map((box) => {
          if (!drag.ids.includes(box.id)) return box;
          const origin = drag.origins[box.id];
          if (!origin) return box;
          if (drag.mode === "move") {
            return {
              ...box,
              ...clampBox(origin.x + dx, origin.y + dy, origin.w, origin.h, deck.width, deck.height),
            };
          }
          if (!drag.handle) return box;
          // Resize only the primary box; keep group members relative by skipping them.
          if (box.id !== drag.ids[0]) return box;
          return {
            ...box,
            ...applyResize(origin, drag.handle, dx, dy, deck.width, deck.height),
          };
        }),
      );
    };
    const onUp = () => setDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [deck, drag, patchBoxes]);

  const selectBox = useCallback(
    (box: SlideBox, event: MouseEvent) => {
      if (!activeSlide) return;
      if (event.shiftKey) {
        setSelectedIds((prev) =>
          prev.includes(box.id) ? prev.filter((id) => id !== box.id) : [...prev, box.id],
        );
        setEditingId(null);
        return;
      }
      const ids = relatedIds(activeSlide.boxes, box.id);
      setSelectedIds(ids);
      setEditingId(null);
    },
    [activeSlide],
  );

  const startMove = useCallback(
    (box: SlideBox, event: MouseEvent) => {
      if (!activeSlide || editingId === box.id) return;
      event.stopPropagation();
      selectBox(box, event);
      const ids = event.shiftKey
        ? selectedIds.includes(box.id)
          ? selectedIds
          : [...selectedIds, box.id]
        : relatedIds(activeSlide.boxes, box.id);
      const origins: DragState["origins"] = {};
      for (const id of ids) {
        const b = activeSlide.boxes.find((item) => item.id === id);
        if (b) origins[id] = { x: b.x, y: b.y, w: b.w, h: b.h };
      }
      setDrag({
        mode: "move",
        ids,
        startX: event.clientX,
        startY: event.clientY,
        origins,
      });
    },
    [activeSlide, editingId, selectBox, selectedIds],
  );

  const startResize = useCallback(
    (box: SlideBox, handle: ResizeHandle, event: MouseEvent) => {
      if (!activeSlide) return;
      event.stopPropagation();
      event.preventDefault();
      setSelectedIds([box.id]);
      setEditingId(null);
      setDrag({
        mode: "resize",
        ids: [box.id],
        handle,
        startX: event.clientX,
        startY: event.clientY,
        origins: { [box.id]: { x: box.x, y: box.y, w: box.w, h: box.h } },
      });
    },
    [activeSlide],
  );

  const commitTextEdit = useCallback(
    (id: string, value: string) => {
      patchBoxes((boxes) =>
        boxes.map((b) => (b.id === id ? { ...b, content: textToDoc(value) } : b)),
      );
      setEditingId(null);
    },
    [patchBoxes],
  );

  if (!os) return <div className="slides-empty">Platform SDK unavailable.</div>;

  if (!deck) {
    return (
      <div className="slides-shell slides-shell--home">
        <aside className="slides-nav" aria-label="Slides navigation">
          <div className="slides-nav__brand">Slides</div>
          <div className="slides-nav__actions">
            <button
              type="button"
              className="slides-btn slides-btn--primary slides-nav__primary"
              onClick={() => void createDeck()}
            >
              New presentation
            </button>
            <label className="slides-btn slides-nav__secondary">
              Import
              <input
                type="file"
                accept=".html,.htm,.odp,.pptx"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void importDeck(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <nav className="slides-nav__links" aria-label="Locations">
            <button
              type="button"
              className={["slides-nav-item", homeView === "all" ? "slides-nav-item--active" : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setHomeView("all")}
            >
              <span className="slides-nav-item__icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <rect x="3" y="4" width="18" height="14" rx="2" />
                  <path d="M8 21h8" />
                  <path d="M12 18v3" />
                </svg>
              </span>
              All presentations
            </button>
            <button
              type="button"
              className={["slides-nav-item", homeView === "recent" ? "slides-nav-item--active" : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setHomeView("recent")}
            >
              <span className="slides-nav-item__icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              Recent
            </button>
          </nav>
        </aside>

        <div className="slides-main">
          <header className="slides-main__header">
            <div>
              <h1 className="slides-main__title">{homeTitle}</h1>
              <p className="slides-main__subtitle">
                {homeDecks.length === 0
                  ? "Create a deck or import PPTX / ODP / HTML"
                  : `${homeDecks.length} presentation${homeDecks.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </header>

          {error ? <div className="slides-error">{error}</div> : null}
          {warnings.length ? (
            <div className="slides-warnings">
              {warnings.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
          ) : null}

          <div className="slides-list" role="list">
            {homeDecks.length === 0 ? (
              <div className="slides-empty">
                <div className="slides-empty__icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="14" rx="2" />
                    <path d="M8 21h8" />
                    <path d="M12 18v3" />
                  </svg>
                </div>
                <strong>No presentations yet</strong>
                <span>Start with a blank deck or import an existing file.</span>
                <button
                  type="button"
                  className="slides-btn slides-btn--primary"
                  onClick={() => void createDeck()}
                >
                  New presentation
                </button>
              </div>
            ) : (
              homeDecks.map((entry) => {
                const displayName = entry.name.replace(/\.slides\.json$/i, "");
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="listitem"
                    className="slides-row"
                    onClick={() => void openDeck(entry.id)}
                  >
                    <span className="slides-row__icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <rect x="3" y="4" width="18" height="14" rx="2" />
                        <path d="M8 21h8" />
                        <path d="M12 18v3" />
                      </svg>
                    </span>
                    <span className="slides-row__body">
                      <span className="slides-row__name">{displayName}</span>
                      <span className="slides-row__file">{entry.name}</span>
                    </span>
                    <span className="slides-row__meta">{new Date(entry.updatedAt).toLocaleString()}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  const canvasBoxes = (activeSlide?.boxes ?? []).map((box) => {
    const selected = selectedIds.includes(box.id);
    const shapeCss = box.kind === "shape" ? shapeStyle(box) : undefined;
    return (
      <div
        key={box.id}
        className={[
          "slides-box",
          box.kind === "text" ? "slides-box--text" : "",
          box.kind === "shape" ? "slides-box--shape" : "",
          box.kind === "image" ? "slides-box--image" : "",
          selected ? "slides-box--selected" : "",
          box.groupId ? "slides-box--grouped" : "",
          editingId === box.id ? "slides-box--editing" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          left: box.x,
          top: typeof shapeCss?.top === "number" ? shapeCss.top : box.y,
          width: box.w,
          height: box.kind === "shape" && box.shape === "line" ? Number(shapeCss?.height ?? box.h) : box.h,
          background: box.kind === "text" ? box.fill : (shapeCss?.background as string | undefined),
          border:
            box.kind === "text" && box.stroke
              ? `${box.strokeWidth ?? 1}px solid ${box.stroke}`
              : (shapeCss?.border as string | undefined),
          borderRadius: shapeCss?.borderRadius as string | number | undefined,
          clipPath: shapeCss?.clipPath as string | undefined,
          color: box.color,
          textAlign: box.textAlign,
        }}
        onMouseDown={(event) => startMove(box, event)}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (box.kind !== "text") return;
          setSelectedIds([box.id]);
          setEditingId(box.id);
        }}
      >
        {box.kind === "image" ? (
          <img
            src={String(box.content ?? "")}
            alt=""
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
          />
        ) : null}
        {box.kind === "text" && editingId === box.id ? (
          <textarea
            ref={editRef}
            className="slides-box__editor"
            defaultValue={boxText(box)}
            onMouseDown={(e) => e.stopPropagation()}
            onBlur={(e) => commitTextEdit(box.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                commitTextEdit(box.id, (e.target as HTMLTextAreaElement).value);
              }
              e.stopPropagation();
            }}
          />
        ) : null}
        {box.kind === "text" && editingId !== box.id ? (
          <div className="slides-box__text">{boxText(box)}</div>
        ) : null}
        {selected && editingId !== box.id
          ? RESIZE_HANDLES.map((handle) => (
              <span
                key={handle}
                className={`slides-handle slides-handle--${handle}`}
                onMouseDown={(event) => startResize(box, handle, event)}
              />
            ))
          : null}
      </div>
    );
  });

  return (
    <div className="slides-shell">
      <header className="slides-toolbar">
        <button
          type="button"
          className="slides-btn"
          onClick={() => {
            (document.activeElement as HTMLElement | null)?.blur?.();
            setDeck(null);
            setFileId(null);
            setFileHash(null);
          }}
        >
          ← Back
        </button>
        <span className="slides-title">{fileName}</span>

        <div className="slides-toolbar__group" role="group" aria-label="Insert">
          <button type="button" className="slides-btn" onClick={addTextBox}>
            Text
          </button>
          <select
            className="slides-btn"
            defaultValue=""
            aria-label="Add shape"
            onChange={(e) => {
              const shape = e.target.value as ShapeKind;
              if (shape) addShape(shape);
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              Shape…
            </option>
            {SHAPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button type="button" className="slides-btn" onClick={() => imageInputRef.current?.click()}>
            Image / SVG
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*,.svg,image/svg+xml"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void addImageFromFile(file);
              e.target.value = "";
            }}
          />
        </div>

        <div className="slides-toolbar__group" role="group" aria-label="Style">
          <label className="slides-field" title="Fill">
            <span>Fill</span>
            <input
              type="color"
              disabled={!primaryBox || primaryBox.kind === "image"}
              value={primaryBox?.fill ?? "#6ea8fe"}
              onChange={(e) => patchSelected({ fill: e.target.value })}
            />
          </label>
          <label className="slides-field" title="Stroke">
            <span>Stroke</span>
            <input
              type="color"
              disabled={!primaryBox || primaryBox.kind === "image"}
              value={primaryBox?.stroke ?? "#3b6fd4"}
              onChange={(e) =>
                patchSelected({
                  stroke: e.target.value,
                  strokeWidth: primaryBox?.strokeWidth ?? 2,
                })
              }
            />
          </label>
          <label className="slides-field" title="Text color">
            <span>Text</span>
            <input
              type="color"
              disabled={!primaryBox || primaryBox.kind !== "text"}
              value={primaryBox?.color ?? "#eef1f6"}
              onChange={(e) => patchSelected({ color: e.target.value })}
            />
          </label>
        </div>

        <div className="slides-toolbar__group" role="group" aria-label="Size">
          <label className="slides-field slides-field--num">
            <span>W</span>
            <input
              type="number"
              min={MIN_BOX}
              disabled={!primaryBox}
              value={primaryBox ? Math.round(primaryBox.w) : ""}
              onChange={(e) => {
                if (!primaryBox || !deck) return;
                const w = Number(e.target.value);
                if (!Number.isFinite(w)) return;
                patchSelected(clampBox(primaryBox.x, primaryBox.y, w, primaryBox.h, deck.width, deck.height));
              }}
            />
          </label>
          <label className="slides-field slides-field--num">
            <span>H</span>
            <input
              type="number"
              min={MIN_BOX}
              disabled={!primaryBox}
              value={primaryBox ? Math.round(primaryBox.h) : ""}
              onChange={(e) => {
                if (!primaryBox || !deck) return;
                const h = Number(e.target.value);
                if (!Number.isFinite(h)) return;
                patchSelected(clampBox(primaryBox.x, primaryBox.y, primaryBox.w, h, deck.width, deck.height));
              }}
            />
          </label>
        </div>

        <div className="slides-toolbar__group" role="group" aria-label="Arrange">
          <button type="button" className="slides-btn" disabled={!canGroup} onClick={groupSelected}>
            Group
          </button>
          <button type="button" className="slides-btn" disabled={!canUngroup} onClick={ungroupSelected}>
            Ungroup
          </button>
          <button type="button" className="slides-btn" disabled={!selectedIds.length} onClick={deleteSelected}>
            Delete
          </button>
        </div>

        <button type="button" className="slides-btn" onClick={() => setPresenting(true)}>
          Present
        </button>
        <select
          className="slides-btn"
          defaultValue=""
          aria-label="Export"
          onChange={(e) => {
            const format = e.target.value as "html" | "odp" | "pptx" | "pdf" | "json";
            if (format) void exportDeck(format);
            e.target.value = "";
          }}
        >
          <option value="" disabled>
            Export…
          </option>
          <option value="html">HTML</option>
          <option value="odp">ODP</option>
          <option value="pptx">PPTX</option>
          <option value="pdf">PDF</option>
          <option value="json">JSON</option>
        </select>
        <button
          type="button"
          className="slides-btn slides-btn--primary"
          disabled={!dirty || saving}
          onClick={() => void saveDeck()}
        >
          {saving ? "Saving…" : dirty ? "Save" : "Saved"}
        </button>
      </header>
      {error ? <div className="slides-error">{error}</div> : null}
      {warnings.length ? (
        <div className="slides-warnings">
          {warnings.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
      ) : null}
      <div className="slides-body">
        <aside className="slides-sorter" aria-label="Slide sorter">
          <div className="slides-sorter__header">
            <div className="slides-sorter__title">Slides</div>
            <button
              type="button"
              className="slides-btn slides-btn--primary slides-sorter__add"
              onClick={addSlide}
            >
              Add slide
            </button>
          </div>
          <div className="slides-sorter__scroll" role="list">
            {deck.slides.map((slide, index) => {
              const label =
                slide.boxes.map(boxText).filter(Boolean).slice(0, 1).join("") || "Empty slide";
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="listitem"
                  className={["slides-thumb", index === slideIndex ? "slides-thumb--active" : ""]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={index === slideIndex ? "true" : undefined}
                  aria-label={`Slide ${index + 1}: ${label}`}
                  onClick={() => {
                    setSlideIndex(index);
                    setSelectedIds([]);
                    setEditingId(null);
                  }}
                >
                  <div className="slides-thumb__preview" aria-hidden="true">
                    {slide.boxes.map((box) => {
                      const shapeCss = box.kind === "shape" ? shapeStyle(box) : undefined;
                      return (
                        <div
                          key={box.id}
                          className={[
                            "slides-thumb__box",
                            box.kind === "image" ? "slides-thumb__box--image" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={{
                            left: `${(box.x / deck.width) * 100}%`,
                            top: `${(box.y / deck.height) * 100}%`,
                            width: `${(box.w / deck.width) * 100}%`,
                            height: `${(box.h / deck.height) * 100}%`,
                            background:
                              box.kind === "shape"
                                ? (shapeCss?.background as string | undefined)
                                : box.kind === "text"
                                  ? box.fill
                                  : undefined,
                            borderRadius: shapeCss?.borderRadius as string | undefined,
                            clipPath: shapeCss?.clipPath as string | undefined,
                            color: box.color,
                          }}
                        >
                          {box.kind === "text" ? boxText(box) : null}
                          {box.kind === "image" ? (
                            <img src={String(box.content ?? "")} alt="" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  <div className="slides-thumb__meta">
                    <span className="slides-thumb__index">{index + 1}</span>
                    <span className="slides-thumb__label">{label}</span>
                    {slide.notes?.trim() ? (
                      <span className="slides-thumb__notes" title="Has speaker notes" aria-hidden="true">
                        ▎
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
        <div className="slides-stage">
          <div
            className="slides-canvas-wrap"
            onMouseDown={() => {
              setSelectedIds([]);
              setEditingId(null);
            }}
          >
            <div className="slides-canvas" style={{ width: deck.width, height: deck.height }}>
              {canvasBoxes}
            </div>
          </div>
          <section className="slides-notes" aria-label="Speaker notes">
            <div className="slides-notes__header">
              <span className="slides-notes__title">Speaker notes</span>
              <span className="slides-notes__slide">Slide {slideIndex + 1}</span>
            </div>
            <textarea
              className="slides-notes__input"
              value={activeSlide?.notes ?? ""}
              placeholder="Notes for this slide (only you see these while presenting)…"
              rows={4}
              onChange={(e) => setSlideNotes(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </section>
        </div>
      </div>
      {presenting ? (
        <div className="slides-present" role="dialog" aria-label="Present mode">
          <div className="slides-present__canvas">
            {(deck.slides[slideIndex]?.boxes ?? []).map((box) => {
              const shapeCss = box.kind === "shape" ? shapeStyle(box) : undefined;
              return (
                <div
                  key={box.id}
                  style={{
                    position: "absolute",
                    left: `${(box.x / deck.width) * 100}%`,
                    top: `${(box.y / deck.height) * 100}%`,
                    width: `${(box.w / deck.width) * 100}%`,
                    height: `${(box.h / deck.height) * 100}%`,
                    background:
                      box.kind === "shape"
                        ? (shapeCss?.background as string | undefined)
                        : box.kind === "text"
                          ? box.fill
                          : undefined,
                    borderRadius: shapeCss?.borderRadius as string | undefined,
                    clipPath: shapeCss?.clipPath as string | undefined,
                    color: box.color ?? "#fff",
                    fontSize: "1.4vw",
                    overflow: "hidden",
                    padding: box.kind === "text" ? "0.5%" : 0,
                    textAlign: box.textAlign,
                  }}
                >
                  {box.kind === "text" ? boxText(box) : null}
                  {box.kind === "image" ? (
                    <img
                      src={String(box.content ?? "")}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
