import { Search, Sparkles } from "lucide-react";
import { SidebarPane } from "../../components/patterns";
import { Badge, Button, Chip, EmptyState, Input } from "../../components/ui";
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
  return (
    <div className="arco-generator__catalog">
      <div className="arco-generator__catalog-header">
        <Sparkles size={15} />
        Catalog
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
        {items.map((item) => (
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
      </div>
    </div>
  );
}

function PreviewSurface({ result }: { result: GeneratorResult }) {
  switch (result.preview) {
    case "button-primary":
      return <Button variant="primary">Primary action</Button>;
    case "button-secondary":
      return <Button>Secondary action</Button>;
    case "input":
      return <Input placeholder="Email address" aria-label="Email" />;
    case "empty":
      return <EmptyState title="Nothing here yet">Add items to get started.</EmptyState>;
    case "pricing":
      return (
        <div className="arco-generator__preview-card">
          <strong>Pro</strong>
          <p>$29 / month</p>
          <ul>
            <li>Unlimited projects</li>
            <li>Priority support</li>
          </ul>
          <Button variant="primary">Start trial</Button>
        </div>
      );
    case "contact-form":
      return (
        <div className="arco-generator__preview-form">
          <Input placeholder="Name" aria-label="Name" />
          <Input placeholder="Email" aria-label="Email" />
          <textarea className="arco-input" placeholder="Message" aria-label="Message" />
          <Button variant="primary">Submit</Button>
        </div>
      );
    case "login-form":
      return (
        <div className="arco-generator__preview-form">
          <Input placeholder="Email" aria-label="Email" />
          <Input placeholder="Password" type="password" aria-label="Password" />
          <Button variant="primary">Sign in</Button>
        </div>
      );
    default:
      return (
        <div className="arco-generator__preview-card">
          <strong>{result.title}</strong>
          <p>Generated surface preview</p>
        </div>
      );
  }
}

export function GeneratorWorkspace({
  prompt,
  generating,
  result,
  previewTab,
  examples,
  onPromptChange,
  onGenerate,
  onExampleSelect,
  onTabChange,
}: {
  prompt: string;
  generating: boolean;
  result: GeneratorResult;
  previewTab: "preview" | "schema";
  examples: string[];
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  onExampleSelect: (example: string) => void;
  onTabChange: (tab: "preview" | "schema") => void;
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
        />
        <div className="arco-generator__examples">
          {examples.slice(0, 3).map((example) => (
            <button key={example} type="button" className="arco-chip" onClick={() => onExampleSelect(example)}>
              {example}
            </button>
          ))}
        </div>
        <Button variant="primary" onClick={onGenerate} disabled={generating || prompt.trim().length === 0}>
          {generating ? "Generating…" : "Generate"}
        </Button>
      </div>

      <div className="arco-generator__preview">
        <div className="arco-generator__preview-tabs">
          <Chip active={previewTab === "preview"} onClick={() => onTabChange("preview")}>
            Preview
          </Chip>
          <Chip active={previewTab === "schema"} onClick={() => onTabChange("schema")}>
            Schema
          </Chip>
        </div>
        <div className="arco-generator__preview-body arco-scroll">
          {previewTab === "preview" ? (
            <PreviewSurface result={result} />
          ) : (
            <pre className="arco-generator__schema">{result.schema}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
