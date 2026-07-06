import { useMemo } from "react";
import { Renderer } from "@openuidev/react-lang";
import { ThemeProvider } from "@openuidev/react-ui";
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib";
import { Search, Sparkles } from "lucide-react";
import { SidebarPane } from "../../components/patterns";
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
        <Sparkles size={15} />
        Catalog
        <span className="arco-generator__catalog-count">{items.length}</span>
      </div>
      <div className="arco-generator__catalog-search">
        <Search size={14} className="arco-icon--tertiary" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search components"
          aria-label="Search catalog"
          width="auto"
        />
      </div>
      <div className="arco-generator__catalog-list arco-scroll">
        {items.length === 0 ? (
          <EmptyState title="No matches">Try a different search term.</EmptyState>
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
        <label htmlFor="generator-prompt">Describe the UI you want</label>
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
              <Button onClick={onSaveToCatalog} disabled={generating}>
                Save to catalog
              </Button>
              <Button onClick={onRefineInStudio} disabled={generating}>
                Refine in Studio
              </Button>
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
          <Chip active={previewTab === "preview"} onClick={() => onTabChange("preview")}>
            Preview
          </Chip>
          <Chip active={previewTab === "schema"} onClick={() => onTabChange("schema")}>
            Schema
          </Chip>
          {result ? <Badge tone={result.source === "saved" ? "success" : "default"}>{result.source}</Badge> : null}
        </div>
        <div className="arco-generator__preview-body arco-scroll">
          {!result ? (
            <EmptyState title="Nothing generated yet">
              Pick a catalog item or describe an interface to preview openui-lang here.
            </EmptyState>
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
