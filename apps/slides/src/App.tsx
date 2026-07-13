/**
 * Slides — DOM canvas presentation editor over os.files@1 / os.slides@1.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { createAppClient } from "/app-sdk.js";
import { EMPTY_SLIDES_JSON } from "@shared/capabilities/slides";
import { SLIDES_MIME } from "@shared/capabilities/files";

interface AppClient {
  intents: { invoke: (intent: string, params?: Record<string, unknown>) => Promise<unknown> };
  shell: { notify: (message: string) => Promise<unknown> };
  events: { on: (topic: string, fn: () => void) => () => void };
}

interface SlideBox {
  id: string;
  kind: "text" | "image" | "shape";
  x: number;
  y: number;
  w: number;
  h: number;
  content?: unknown;
  fill?: string;
  textAlign?: "left" | "center" | "right";
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

function readFileIdFromUrl(): string | null {
  const hash = location.hash.match(/file=([^&]+)/)?.[1];
  if (hash) return decodeURIComponent(hash);
  return new URLSearchParams(location.search).get("fileId");
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

export function App() {
  const [os] = useState(() => createAppClient());
  const [decks, setDecks] = useState<FileEntry[]>([]);
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [deck, setDeck] = useState<Deck | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [presenting, setPresenting] = useState(false);
  const [drag, setDrag] = useState<{ id: string; ox: number; oy: number } | null>(null);

  const activeSlide = deck?.slides[slideIndex] ?? null;

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
        setSelectedBoxId(null);
        setDirty(false);
        setWarnings([]);
        location.hash = `file=${encodeURIComponent(id)}`;
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
    return os.events.on("files.changed", () => void refreshList());
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

  const addSlide = useCallback(() => {
    updateDeck((current) => ({
      ...current,
      slides: [...current.slides, { id: `slide-${Date.now()}`, boxes: [] }],
    }));
    setSlideIndex((i) => i + 1);
  }, [updateDeck]);

  const addTextBox = useCallback(() => {
    if (!activeSlide) return;
    const id = `box-${Date.now()}`;
    updateDeck((current) => {
      const slides = current.slides.map((slide, i) =>
        i === slideIndex
          ? {
              ...slide,
              boxes: [
                ...slide.boxes,
                {
                  id,
                  kind: "text" as const,
                  x: 80,
                  y: 80,
                  w: 480,
                  h: 96,
                  content: {
                    type: "doc",
                    content: [{ type: "paragraph", content: [{ type: "text", text: "New text" }] }],
                  },
                },
              ],
            }
          : slide,
      );
      return { ...current, slides };
    });
    setSelectedBoxId(id);
  }, [activeSlide, slideIndex, updateDeck]);

  const addShape = useCallback(() => {
    if (!activeSlide) return;
    const id = `box-${Date.now()}`;
    updateDeck((current) => {
      const slides = current.slides.map((slide, i) =>
        i === slideIndex
          ? {
              ...slide,
              boxes: [
                ...slide.boxes,
                { id, kind: "shape" as const, x: 120, y: 160, w: 240, h: 140, fill: "#6ea8fe" },
              ],
            }
          : slide,
      );
      return { ...current, slides };
    });
    setSelectedBoxId(id);
  }, [activeSlide, slideIndex, updateDeck]);

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

  const renderBoxes = useMemo(() => {
    if (!activeSlide || !deck) return null;
    return activeSlide.boxes.map((box) => (
      <div
        key={box.id}
        className={[
          "slides-box",
          box.kind === "text" ? "slides-box--text" : "",
          box.kind === "shape" ? "slides-box--shape" : "",
          selectedBoxId === box.id ? "slides-box--selected" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          background: box.kind === "shape" ? box.fill ?? "#6ea8fe" : undefined,
          textAlign: box.textAlign,
        }}
        onMouseDown={(event) => {
          event.stopPropagation();
          setSelectedBoxId(box.id);
          setDrag({ id: box.id, ox: event.clientX - box.x, oy: event.clientY - box.y });
        }}
        onDoubleClick={() => {
          if (box.kind !== "text") return;
          const next = window.prompt("Text", boxText(box));
          if (next === null) return;
          updateDeck((current) => ({
            ...current,
            slides: current.slides.map((slide, i) =>
              i === slideIndex
                ? {
                    ...slide,
                    boxes: slide.boxes.map((b) =>
                      b.id === box.id
                        ? {
                            ...b,
                            content: {
                              type: "doc",
                              content: [{ type: "paragraph", content: [{ type: "text", text: next }] }],
                            },
                          }
                        : b,
                    ),
                  }
                : slide,
            ),
          }));
        }}
      >
        {box.kind === "image" ? (
          <img src={String(box.content ?? "")} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : box.kind === "text" ? (
          boxText(box)
        ) : null}
      </div>
    ));
  }, [activeSlide, deck, selectedBoxId, slideIndex, updateDeck]);

  useEffect(() => {
    if (!drag) return;
    const onMove = (event: MouseEvent) => {
      updateDeck((current) => ({
        ...current,
        slides: current.slides.map((slide, i) =>
          i === slideIndex
            ? {
                ...slide,
                boxes: slide.boxes.map((box) =>
                  box.id === drag.id
                    ? {
                        ...box,
                        x: Math.max(0, Math.min(current.width - box.w, event.clientX - drag.ox)),
                        y: Math.max(0, Math.min(current.height - box.h, event.clientY - drag.oy)),
                      }
                    : box,
                ),
              }
            : slide,
        ),
      }));
    };
    const onUp = () => setDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, slideIndex, updateDeck]);

  if (!os) return <div className="slides-empty">Platform SDK unavailable.</div>;

  if (!deck) {
    return (
      <div className="slides-shell">
        <header className="slides-toolbar">
          <strong>Slides</strong>
          <label className="slides-btn">
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
          <button type="button" className="slides-btn slides-btn--primary" onClick={() => void createDeck()}>
            New presentation
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
        <div className="slides-list">
          {decks.length === 0 ? (
            <div className="slides-empty">No presentations yet.</div>
          ) : (
            decks.map((entry) => (
              <button key={entry.id} type="button" className="slides-row" onClick={() => void openDeck(entry.id)}>
                <span>{entry.name}</span>
                <span>{new Date(entry.updatedAt).toLocaleString()}</span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="slides-shell">
      <header className="slides-toolbar">
        <button
          type="button"
          className="slides-btn"
          onClick={() => {
            setDeck(null);
            setFileId(null);
            location.hash = "";
          }}
        >
          ← Back
        </button>
        <span className="slides-title">{fileName}</span>
        <button type="button" className="slides-btn" onClick={addSlide}>
          Add slide
        </button>
        <button type="button" className="slides-btn" onClick={addTextBox}>
          Text
        </button>
        <button type="button" className="slides-btn" onClick={addShape}>
          Shape
        </button>
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
          {deck.slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={["slides-thumb", index === slideIndex ? "slides-thumb--active" : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                setSlideIndex(index);
                setSelectedBoxId(null);
              }}
            >
              Slide {index + 1}
              <div>{slide.boxes.map(boxText).filter(Boolean).slice(0, 1).join("") || "Empty"}</div>
            </button>
          ))}
        </aside>
        <div
          className="slides-canvas-wrap"
          onMouseDown={() => setSelectedBoxId(null)}
        >
          <div className="slides-canvas" style={{ width: deck.width, height: deck.height }}>
            {renderBoxes}
          </div>
        </div>
      </div>
      {presenting ? (
        <div className="slides-present" role="dialog" aria-label="Present mode">
          <div className="slides-present__canvas">
            {(deck.slides[slideIndex]?.boxes ?? []).map((box) => (
              <div
                key={box.id}
                style={{
                  position: "absolute",
                  left: `${(box.x / deck.width) * 100}%`,
                  top: `${(box.y / deck.height) * 100}%`,
                  width: `${(box.w / deck.width) * 100}%`,
                  height: `${(box.h / deck.height) * 100}%`,
                  background: box.kind === "shape" ? box.fill : undefined,
                  color: "#fff",
                  fontSize: "1.4vw",
                  overflow: "hidden",
                  padding: "0.5%",
                }}
              >
                {box.kind === "text" ? boxText(box) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
