import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "../../components/ui";
import { api } from "../../lib/api";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export interface PdfViewerProps {
  fileId: string;
  /** Preview pane: first page only. Reader: full scroll. */
  variant?: "preview" | "reader";
}

export function PdfViewer({ fileId, variant = "reader" }: PdfViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(variant === "preview" ? 0.55 : 1);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoadError(null);
    setBlobUrl(null);
    setNumPages(0);
    setPageNumber(1);

    void api
      .fetchDriveBlob(fileId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Could not load PDF");
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  const fileSource = useMemo(
    () => (blobUrl ? { url: blobUrl, withCredentials: true as const } : null),
    [blobUrl],
  );

  if (loadError) {
    return <div className="arco-pdf-viewer__status arco-pdf-viewer__status--error">{loadError}</div>;
  }

  if (!fileSource) {
    return <div className="arco-pdf-viewer__status">Loading PDF…</div>;
  }

  const isPreview = variant === "preview";

  return (
    <div className={["arco-pdf-viewer", isPreview ? "arco-pdf-viewer--preview" : ""].filter(Boolean).join(" ")}>
      {!isPreview ? (
        <div className="arco-pdf-viewer__toolbar">
          <div className="arco-pdf-viewer__page-controls">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous page"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
            >
              <ChevronLeft size={15} />
            </Button>
            <span className="arco-pdf-viewer__page-label">
              Page {pageNumber} of {numPages || "…"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next page"
              disabled={numPages === 0 || pageNumber >= numPages}
              onClick={() => setPageNumber((page) => Math.min(numPages, page + 1))}
            >
              <ChevronRight size={15} />
            </Button>
          </div>
          <div className="arco-pdf-viewer__zoom-controls">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Zoom out"
              disabled={scale <= 0.5}
              onClick={() => setScale((value) => Math.max(0.5, value - 0.1))}
            >
              <ZoomOut size={15} />
            </Button>
            <span className="arco-pdf-viewer__zoom-label">{Math.round(scale * 100)}%</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Zoom in"
              disabled={scale >= 2}
              onClick={() => setScale((value) => Math.min(2, value + 0.1))}
            >
              <ZoomIn size={15} />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="arco-pdf-viewer__canvas arco-scroll">
        <Document
          file={fileSource}
          loading={<div className="arco-pdf-viewer__status">Rendering…</div>}
          error={<div className="arco-pdf-viewer__status arco-pdf-viewer__status--error">Could not render PDF.</div>}
          onLoadSuccess={({ numPages: totalPages }) => setNumPages(totalPages)}
        >
          {isPreview ? (
            <Page pageNumber={1} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} />
          ) : (
            <Page pageNumber={pageNumber} scale={scale} />
          )}
        </Document>
      </div>
    </div>
  );
}
