import type { ReactNode } from "react";
import { Download, ImageIcon, Search, Trash2 } from "lucide-react";
import type { ImageGenHistoryItem, ImageGenSize, ImageGenStatus, ImageGenStyle } from "@shared/types";
import { SidebarPane } from "../../components/patterns";
import { Badge, Button, Chip, EmptyState, Input } from "../../components/ui";

function historyLabel(item: ImageGenHistoryItem): string {
  const text = item.revisedPrompt ?? item.prompt;
  return text.length > 72 ? `${text.slice(0, 69)}…` : text;
}

export function ImageGenGallery({
  items,
  searchQuery,
  activeId,
  onSearchChange,
  onSelect,
  onDelete,
}: {
  items: ImageGenHistoryItem[];
  searchQuery: string;
  activeId: string | null;
  onSearchChange: (query: string) => void;
  onSelect: (item: ImageGenHistoryItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="arco-imagegen__gallery">
      <div className="arco-imagegen__gallery-header">
        <ImageIcon size={15} />
        Gallery
        <span className="arco-imagegen__gallery-count">{items.length}</span>
      </div>
      <div className="arco-imagegen__gallery-search">
        <Search size={14} className="arco-icon--tertiary" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search prompts"
          aria-label="Search gallery"
          width="auto"
        />
      </div>
      <div className="arco-imagegen__gallery-list arco-scroll">
        {items.length === 0 ? (
          <EmptyState title="No images yet">Generate something to fill the gallery.</EmptyState>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={[
                "arco-imagegen__gallery-item",
                item.id === activeId ? "arco-imagegen__gallery-item--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <button type="button" className="arco-imagegen__gallery-thumb" onClick={() => onSelect(item)}>
                <img src={item.imageUrl} alt={item.prompt} loading="lazy" />
              </button>
              <button type="button" className="arco-imagegen__gallery-meta" onClick={() => onSelect(item)}>
                <span className="arco-imagegen__gallery-label">{historyLabel(item)}</span>
                <span className="arco-imagegen__gallery-sub">
                  {item.size} · {item.provider}
                </span>
              </button>
              <button
                type="button"
                className="arco-imagegen__gallery-delete"
                aria-label="Delete image"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ImageGenWorkspace({
  prompt,
  size,
  style,
  generating,
  activeItem,
  examples,
  sizes,
  styles,
  status,
  error,
  onPromptChange,
  onSizeChange,
  onStyleChange,
  onGenerate,
  onExampleSelect,
}: {
  prompt: string;
  size: ImageGenSize;
  style: ImageGenStyle;
  generating: boolean;
  activeItem: ImageGenHistoryItem | null;
  examples: string[];
  sizes: { id: ImageGenSize; label: string }[];
  styles: { id: ImageGenStyle; label: string }[];
  status: ImageGenStatus | null;
  error: string | null;
  onPromptChange: (value: string) => void;
  onSizeChange: (value: ImageGenSize) => void;
  onStyleChange: (value: ImageGenStyle) => void;
  onGenerate: () => void;
  onExampleSelect: (example: string) => void;
}) {
  const downloadName = activeItem
    ? `arco-image-${activeItem.id.slice(0, 8)}${activeItem.imageUrl.endsWith(".svg") ? ".svg" : ".png"}`
    : "arco-image.png";

  return (
    <div className="arco-imagegen__workspace">
      <div className="arco-imagegen__controls">
        <div className="arco-imagegen__controls-header">
          <label htmlFor="imagegen-prompt">Describe the image</label>
          {status ? (
            <Badge tone={status.configured ? "success" : "default"}>
              {status.configured ? `${status.provider} · ${status.model}` : "Mock preview"}
            </Badge>
          ) : null}
        </div>
        <textarea
          id="imagegen-prompt"
          className="arco-input arco-imagegen__prompt-input"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              onGenerate();
            }
          }}
        />
        <div className="arco-imagegen__option-row">
          <span className="arco-imagegen__option-label">Size</span>
          <div className="arco-chip-row">
            {sizes.map((option) => (
              <Chip key={option.id} active={size === option.id} onClick={() => onSizeChange(option.id)}>
                {option.label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="arco-imagegen__option-row">
          <span className="arco-imagegen__option-label">Style</span>
          <div className="arco-chip-row">
            {styles.map((option) => (
              <Chip key={option.id} active={style === option.id} onClick={() => onStyleChange(option.id)}>
                {option.label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="arco-imagegen__examples">
          {examples.slice(0, 3).map((example) => (
            <button key={example} type="button" className="arco-chip" onClick={() => onExampleSelect(example)}>
              {example}
            </button>
          ))}
        </div>
        <div className="arco-imagegen__prompt-actions">
          <Button variant="primary" onClick={onGenerate} disabled={generating || prompt.trim().length === 0}>
            {generating ? "Generating…" : "Generate"}
          </Button>
          {activeItem ? (
            <a className="arco-btn" href={activeItem.imageUrl} download={downloadName}>
              <Download size={14} aria-hidden="true" />
              Download
            </a>
          ) : null}
        </div>
        {status && !status.configured && status.hint ? (
          <p className="arco-imagegen__hint">{status.hint}</p>
        ) : null}
        {error ? <p className="arco-imagegen__error">{error}</p> : null}
        {activeItem?.revisedPrompt ? (
          <p className="arco-imagegen__revised">
            <strong>Revised prompt:</strong> {activeItem.revisedPrompt}
          </p>
        ) : null}
      </div>

      <div className="arco-imagegen__preview">
        <div className="arco-imagegen__preview-header">
          <span>Preview</span>
          {activeItem ? <Badge>{activeItem.provider}</Badge> : null}
        </div>
        <div className="arco-imagegen__preview-body arco-scroll">
          {!activeItem ? (
            <EmptyState title="Nothing generated yet">
              Describe a scene and press Generate to see it here.
            </EmptyState>
          ) : (
            <img
              className="arco-imagegen__preview-image"
              src={activeItem.imageUrl}
              alt={activeItem.prompt}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function ImageGenLayout({
  gallery,
  workspace,
  sidebarWidth,
  onSidebarWidthChange,
}: {
  gallery: ReactNode;
  workspace: ReactNode;
  sidebarWidth: number;
  onSidebarWidthChange: (width: number) => void;
}) {
  return (
    <div className="arco-imagegen">
      <SidebarPane width={sidebarWidth} onWidthChange={onSidebarWidthChange}>
        {gallery}
      </SidebarPane>
      {workspace}
    </div>
  );
}
