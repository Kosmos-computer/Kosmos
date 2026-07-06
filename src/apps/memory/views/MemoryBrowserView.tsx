import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { MemoryEntry, MemoryKind } from "../types";
import { Chip, Input } from "../../../components/ui";

const KIND_LABELS: Record<MemoryKind, string> = {
  working: "Working",
  episodic: "Episodic",
  semantic: "Semantic",
  procedural: "Procedural",
  identity: "Identity",
  reference: "Reference",
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function MemoryCard({ entry }: { entry: MemoryEntry }) {
  return (
    <article className="arco-memory-card">
      <div className="arco-memory-card__head">
        <div>
          <h3 className="arco-memory-card__title">{entry.title}</h3>
          <p className="arco-memory-card__source">{entry.source}</p>
        </div>
        <Chip active={entry.status === "active"}>{entry.status}</Chip>
      </div>
      <p className="arco-memory-card__summary">{entry.summary}</p>
      <div className="arco-memory-card__meta">
        <span className="arco-memory-card__kind">{KIND_LABELS[entry.kind]}</span>
        <span>{entry.confidence}% confidence</span>
        <span>Last accessed {formatRelative(entry.lastAccessedAt)}</span>
      </div>
      <div className="arco-memory-card__confidence" aria-hidden="true">
        <div className="arco-memory-card__confidence-fill" style={{ width: `${entry.confidence}%` }} />
      </div>
      {entry.tags.length > 0 ? (
        <div className="arco-memory-card__tags">
          {entry.tags.map((tag) => (
            <span key={tag} className="arco-memory-card__tag">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function MemoryBrowserView({ entries }: { entries: MemoryEntry[] }) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<MemoryKind | "all">("all");

  const counts = useMemo(() => {
    const map: Partial<Record<MemoryKind, number>> = {};
    for (const entry of entries) map[entry.kind] = (map[entry.kind] ?? 0) + 1;
    return map;
  }, [entries]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (kindFilter !== "all" && entry.kind !== kindFilter) return false;
      if (!normalized) return true;
      return (
        entry.title.toLowerCase().includes(normalized) ||
        entry.summary.toLowerCase().includes(normalized) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(normalized))
      );
    });
  }, [entries, query, kindFilter]);

  const kindFilters: (MemoryKind | "all")[] = [
    "all",
    "working",
    "episodic",
    "semantic",
    "procedural",
    "identity",
    "reference",
  ];

  return (
    <div className="arco-memory-view">
      <header className="arco-memory-view__header">
        <h1 className="arco-memory-view__title">Memory</h1>
        <p className="arco-memory-view__subtitle">
          Episodic traces, semantic facts, working context, and procedural patterns.
        </p>
      </header>

      <div className="arco-memory-filters">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search memories, tags, sources…"
          startSlot={<Search size={14} aria-hidden="true" />}
          className="arco-memory-filters__search"
        />
        <div className="arco-memory-filters__kinds">
          {kindFilters.map((kind) => (
            <Chip
              key={kind}
              active={kindFilter === kind}
              onClick={() => setKindFilter(kind)}
            >
              {kind === "all" ? `All (${entries.length})` : `${KIND_LABELS[kind]} (${counts[kind] ?? 0})`}
            </Chip>
          ))}
        </div>
      </div>

      <div className="arco-memory-grid">
        {filtered.map((entry) => (
          <MemoryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
