import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useMemo } from "react";
import { Renderer } from "@openuidev/react-lang";
import { ThemeProvider } from "@openuidev/react-ui";
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib";
import { Search, Sparkles } from "lucide-react";
import { Badge, Button, Chip, EmptyState, Input } from "../../components/ui";
import { useOsStore } from "../../os/osStore";
import { CATALOG_TIER_LABELS } from "./catalog";
import type { CatalogItem, GeneratorResult } from "./types";

export function GeneratorCatalog({
  items,
  searchQuery,
  activeId,
  onSearchChange,
  onSelect,
}: {
  items: CatalogItem[];
  searchQuery: string;
  activeId: string | null;
  onSearchChange: (query: string) => void;
  onSelect: (item: CatalogItem) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const item of items) {
      const bucket = map.get(item.tier) ?? [];
      bucket.push(item);
      map.set(item.tier, bucket);
    }
    return map;
  }, [items]);

  return (
    <div className="arco-generator__catalog">
      <div className="arco-generator__catalog-header">
        <Sparkles size={15} /><T k={I18nKey.APPS$GENERATOR_CATALOG} /><span className="arco-generator__catalog-count">{items.length}</span>
      </div>
      <div className="arco-generator__catalog-search">
        <Search size={14} className="arco-icon--tertiary" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={i18n.t(I18nKey.APPS$GENERATOR_SEARCH_COMPONENTS)}
          aria-label={i18n.t(I18nKey.APPS$GENERATOR_SEARCH_CATALOG)}
          width="auto"
        />
      </div>
      <div className="arco-generator__catalog-list arco-scroll">
        {items.length === 0 ? (
          <EmptyState title={i18n.t(I18nKey.OS_COMMANDPALETTE_NO_MATCHES)}><T k={I18nKey.APPS$GENERATOR_TRY_A_DIFFERENT_SEARCH_TERM} /></EmptyState>
        ) : (
          Array.from(grouped.entries()).map(([tier, sectionItems]) => (
            <section key={tier} className="arco-generator__catalog-section">
              <div className="arco-generator__catalog-section-title">
                {CATALOG_TIER_LABELS[tier as keyof typeof CATALOG_TIER_LABELS] ?? tier}
              </div>
              {sectionItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={[
                    "arco-generator__catalog-item",
                    item.id === activeId ? "arco-generator__catalog-item--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onSelect(item)}
                >
                  <span>{item.label}</span>
                  <Badge>{item.tier}</Badge>
                </button>
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function OpenUiPreview({ code }: { code: string }) {
  const theme = useOsStore((s) => s.theme);
  return (
    <ThemeProvider mode={theme}>
      <Renderer
        response={code}
        library={openuiChatLibrary}
        isStreaming={false}
        onError={(errors) => {
          if (errors.length > 0) console.warn("[arco:generator-preview]", errors);
        }}
      />
    </ThemeProvider>
  );
}

export function GeneratorWorkspace({
  prompt,
  generating,
  result,
  previewTab,
  examples,
  error,
  onPromptChange,
  onGenerate,
  onExampleSelect,
  onTabChange,
  onSaveToCatalog,
  onRefineInStudio,
}: {
  prompt: string;
  generating: boolean;
  result: GeneratorResult | null;
  previewTab: "preview" | "schema";
  examples: string[];
  error: string | null;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  onExampleSelect: (example: string) => void;
  onTabChange: (tab: "preview" | "schema") => void;
  onSaveToCatalog: () => void;
  onRefineInStudio: () => void;
}) {
  return (
    <div className="arco-generator__workspace">
      <div className="arco-generator__prompt">
        <label htmlFor="generator-prompt"><T k={I18nKey.APPS$GENERATOR_DESCRIBE_THE_UI_YOU_WANT} /></label>
        <textarea
          id="generator-prompt"
          className="arco-input arco-generator__prompt-input"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              onGenerate();
            }
          }}
        />
        <div className="arco-generator__examples">
          {examples.slice(0, 3).map((example) => (
            <button key={example} type="button" className="arco-chip" onClick={() => onExampleSelect(example)}>
              {example}
            </button>
          ))}
        </div>
        <div className="arco-generator__prompt-actions">
          <Button variant="primary" onClick={onGenerate} disabled={generating || prompt.trim().length === 0}>
            {generating ? "Generating…" : "Generate"}
          </Button>
          {result ? (
            <>
              <Button onClick={onSaveToCatalog} disabled={generating}><T k={I18nKey.APPS$GENERATOR_SAVE_TO_CATALOG} /></Button>
              <Button onClick={onRefineInStudio} disabled={generating}><T k={I18nKey.APPS$GENERATOR_REFINE_IN_STUDIO} /></Button>
            </>
          ) : null}
        </div>
        {error ? <p className="arco-generator__error">{error}</p> : null}
        {result?.validation === "warn" && result.lintSummary ? (
          <p className="arco-generator__warn">{result.lintSummary}</p>
        ) : null}
      </div>

      <div className="arco-generator__preview">
        <div className="arco-generator__preview-tabs">
          <Chip active={previewTab === "preview"} onClick={() => onTabChange("preview")}><T k={I18nKey.APPS$GENERATOR_PREVIEW} /></Chip>
          <Chip active={previewTab === "schema"} onClick={() => onTabChange("schema")}><T k={I18nKey.APPS$GENERATOR_SCHEMA} /></Chip>
          {result ? <Badge tone={result.source === "saved" ? "success" : "default"}>{result.source}</Badge> : null}
        </div>
        <div className="arco-generator__preview-body arco-scroll">
          {!result ? (
            <EmptyState title={i18n.t(I18nKey.APPS$GENERATOR_NOTHING_GENERATED_YET)}><T k={I18nKey.APPS$GENERATOR_PICK_A_CATALOG_ITEM_OR_DESCRIBE_AN_INTERFACE_TO_PREVIEW_} /></EmptyState>
          ) : previewTab === "preview" ? (
            <OpenUiPreview code={result.code} />
          ) : (
            <pre className="arco-generator__schema">{result.code}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
