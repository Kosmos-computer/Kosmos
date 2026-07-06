import {
  openuiChatComponentGroups,
  openuiChatExamples,
} from "@openuidev/react-ui/genui-lib";
import type { SavedGeneratorCatalogItem } from "@shared/types";
import type { CatalogItem, CatalogTier } from "./types";
import { snippetForComponent } from "./componentSnippets";

const GROUP_TIER: Record<string, CatalogTier> = {
  Content: "atom",
  Data: "card",
  Charts: "block",
  Forms: "block",
  Actions: "atom",
  Lists: "card",
  Navigation: "card",
  Layout: "block",
};

function tierForGroup(name: string): CatalogTier {
  return GROUP_TIER[name] ?? "atom";
}

function parseExample(example: string, index: number): CatalogItem | null {
  const titleMatch = /^Example \d+ — (.+):/m.exec(example);
  const label = titleMatch?.[1]?.trim() ?? `Example ${index + 1}`;
  const code = example
    .split("\n")
    .filter((line) => /^\s*\w+\s*=/.test(line))
    .join("\n")
    .trim();
  if (!code) return null;
  return {
    id: `example-${index + 1}`,
    label,
    tier: "block",
    code,
    source: "example",
  };
}

function buildBuiltinCatalog(): CatalogItem[] {
  const items: CatalogItem[] = [];
  const seen = new Set<string>();

  for (const group of openuiChatComponentGroups) {
    const tier = tierForGroup(group.name);
    for (const component of group.components) {
      const id = `component-${component.toLowerCase()}`;
      if (seen.has(id)) continue;
      seen.add(id);
      items.push({
        id,
        label: component,
        tier,
        familyLabel: group.name,
        code: snippetForComponent(component),
        source: "builtin",
      });
    }
  }

  openuiChatExamples.forEach((example, index) => {
    const item = parseExample(example, index);
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      items.push(item);
    }
  });

  return items.sort((left, right) => {
    const tierOrder: Record<CatalogTier, number> = {
      atom: 0,
      card: 1,
      block: 2,
      widget: 3,
      saved: 4,
    };
    const tierDiff = tierOrder[left.tier] - tierOrder[right.tier];
    if (tierDiff !== 0) return tierDiff;
    return left.label.localeCompare(right.label);
  });
}

export const BUILTIN_CATALOG = buildBuiltinCatalog();

export function savedToCatalogItem(item: SavedGeneratorCatalogItem): CatalogItem {
  return {
    id: item.id,
    label: item.label,
    tier: "saved",
    code: item.code,
    prompt: item.prompt,
    source: "saved",
    createdAt: item.createdAt,
  };
}

export function mergeCatalog(saved: SavedGeneratorCatalogItem[]): CatalogItem[] {
  const savedItems = saved.map(savedToCatalogItem);
  const savedIds = new Set(savedItems.map((item) => item.id));
  const builtin = BUILTIN_CATALOG.filter((item) => !savedIds.has(item.id));
  return [...savedItems, ...builtin];
}

export function filterCatalog(items: CatalogItem[], query: string): CatalogItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) => {
    const haystack = [item.label, item.tier, item.familyLabel, item.prompt]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function catalogItemById(items: CatalogItem[], id: string): CatalogItem | undefined {
  return items.find((item) => item.id === id);
}

export const CATALOG_TIER_LABELS: Record<CatalogTier, string> = {
  atom: "Atoms",
  card: "Cards",
  block: "Blocks",
  widget: "Widgets",
  saved: "Saved",
};
