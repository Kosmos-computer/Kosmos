import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
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
        <ImageIcon size={15} /><T k={I18nKey.APPS$IMAGEGEN_GALLERY} /><span className="arco-imagegen__gallery-count">{items.length}</span>
      </div>
      <div className="arco-imagegen__gallery-search">
        <Search size={14} className="arco-icon--tertiary" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={i18n.t(I18nKey.APPS$IMAGEGEN_SEARCH_PROMPTS)}
          aria-label={i18n.t(I18nKey.APPS$IMAGEGEN_SEARCH_GALLERY)}
          width="auto"
        />
      </div>
      <div className="arco-imagegen__gallery-list arco-scroll">
        {items.length === 0 ? (
          <EmptyState title={i18n.t(I18nKey.APPS$IMAGEGEN_NO_IMAGES_YET)}><T k={I18nKey.APPS$IMAGEGEN_GENERATE_SOMETHING_TO_FILL_THE_GALLERY} /></EmptyState>
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
                aria-label={i18n.t(I18nKey.APPS$IMAGEGEN_DELETE_IMAGE)}
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
          <label htmlFor="imagegen-prompt"><T k={I18nKey.APPS$IMAGEGEN_DESCRIBE_THE_IMAGE} /></label>
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
          <span className="arco-imagegen__option-label"><T k={I18nKey.APPS$IMAGEGEN_SIZE} /></span>
          <div className="arco-chip-row">
            {sizes.map((option) => (
              <Chip key={option.id} active={size === option.id} onClick={() => onSizeChange(option.id)}>
                {option.label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="arco-imagegen__option-row">
          <span className="arco-imagegen__option-label"><T k={I18nKey.APPS$IMAGEGEN_STYLE} /></span>
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
              <Download size={14} aria-hidden="true" /><T k={I18nKey.APPS$IMAGEGEN_DOWNLOAD} /></a>
          ) : null}
        </div>
        {status && !status.configured && status.hint ? (
          <p className="arco-imagegen__hint">{status.hint}</p>
        ) : null}
        {error ? <p className="arco-imagegen__error">{error}</p> : null}
        {activeItem?.revisedPrompt ? (
          <p className="arco-imagegen__revised">
            <strong><T k={I18nKey.APPS$IMAGEGEN_REVISED_PROMPT} /></strong> {activeItem.revisedPrompt}
          </p>
        ) : null}
      </div>

      <div className="arco-imagegen__preview">
        <div className="arco-imagegen__preview-header">
          <span><T k={I18nKey.APPS$IMAGEGEN_PREVIEW} /></span>
          {activeItem ? <Badge>{activeItem.provider}</Badge> : null}
        </div>
        <div className="arco-imagegen__preview-body arco-scroll">
          {!activeItem ? (
            <EmptyState title={i18n.t(I18nKey.APPS$GENERATOR_NOTHING_GENERATED_YET)}><T k={I18nKey.APPS$IMAGEGEN_DESCRIBE_A_SCENE_AND_PRESS_GENERATE_TO_SEE_IT_HERE} /></EmptyState>
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
