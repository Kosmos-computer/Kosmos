import { useCallback, useMemo } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Menu, type MenuItem } from "../../components/Menu";
import { BENTO_DEFAULT_ITEMS, BENTO_WIDGET_CATALOG } from "./bentoCatalog";
import { useBentoStore } from "./bentoStore";
import { BentoLiveProvider } from "./BentoLiveProvider";
import { BentoGrid } from "./BentoGrid";
import { clampItemToGrid, findNextFreeSpot } from "./grid-utils";
import type { BentoItem, BentoWidgetTemplate } from "./types";

function createInstanceId(templateId: string) {
  return `${templateId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Interactive bento board — drag, resize, and add/remove widgets on a visible grid. */
export function BentoWorkspace() {
  const items = useBentoStore((s) => s.items);
  const activeId = useBentoStore((s) => s.activeId);
  const setItems = useBentoStore((s) => s.setItems);
  const setActiveId = useBentoStore((s) => s.setActiveId);

  const placedTemplateIds = useMemo(() => new Set(items.map((item) => item.templateId)), [items]);

  const addWidget = useCallback(
    (template: BentoWidgetTemplate) => {
      const spot = findNextFreeSpot(template.colSpan, template.rowSpan, items);
      if (!spot) return;

      const nextItem: BentoItem = {
        id: createInstanceId(template.templateId),
        templateId: template.templateId,
        label: template.label,
        col: spot.col,
        row: spot.row,
        colSpan: template.colSpan,
        rowSpan: template.rowSpan,
        content: template.content,
      };

      const nextItems = [...items, clampItemToGrid(nextItem)];
      setItems(nextItems);
      setActiveId(nextItem.id);
    },
    [items, setActiveId, setItems],
  );

  const removeWidget = useCallback(
    (id: string) => {
      setItems(items.filter((item) => item.id !== id));
      setActiveId(activeId === id ? null : activeId);
    },
    [activeId, items, setActiveId, setItems],
  );

  const moveWidget = useCallback(
    (id: string, next: Pick<BentoItem, "col" | "row">) => {
      setItems(
        items.map((item) => {
          if (item.id !== id) return item;
          return clampItemToGrid({ ...item, ...next });
        }),
      );
    },
    [items, setItems],
  );

  const resizeWidget = useCallback(
    (id: string, next: Pick<BentoItem, "col" | "row" | "colSpan" | "rowSpan">) => {
      setItems(
        items.map((item) => {
          if (item.id !== id) return item;
          return clampItemToGrid({ ...item, ...next });
        }),
      );
    },
    [items, setItems],
  );

  const resetLayout = useCallback(() => {
    const reset = BENTO_DEFAULT_ITEMS.map((item) => clampItemToGrid({ ...item, id: createInstanceId(item.templateId) }));
    setItems(reset);
    setActiveId(reset[0]?.id ?? null);
  }, [setActiveId, setItems]);

  const menuItems = useMemo<MenuItem[]>(() => {
    const available = BENTO_WIDGET_CATALOG.filter((template) => !placedTemplateIds.has(template.templateId));
    const entries: MenuItem[] = [];

    if (available.length > 0) {
      entries.push(
        ...available.map((template, index) => ({
          id: `add-${template.templateId}`,
          label: (
            <span className="arco-bento-menu__label">
              <span>Add {template.label}</span>
              <span className="arco-bento-menu__meta">
                {template.colSpan}×{template.rowSpan}
              </span>
            </span>
          ),
          icon: Plus,
          separatorAbove: index === 0,
          onSelect: () => addWidget(template),
        })),
      );
    }

    if (items.length > 0) {
      entries.push(
        ...items.map((item, index) => ({
          id: `remove-${item.id}`,
          label: `Remove ${item.label}`,
          icon: Trash2,
          danger: true,
          separatorAbove: index === 0 && available.length > 0,
          onSelect: () => removeWidget(item.id),
        })),
      );
    }

    entries.push({
      id: "reset-layout",
      label: "Reset layout",
      separatorAbove: true,
      onSelect: resetLayout,
    });

    if (entries.length === 1) {
      entries.unshift({
        id: "empty",
        label: "All widgets placed",
        disabled: true,
      });
    }

    return entries;
  }, [addWidget, items, placedTemplateIds, removeWidget, resetLayout]);

  return (
    <div className="arco-bento-workspace">
      <div className="arco-bento-workspace__toolbar">
        <Menu
          aria-label="Widget actions"
          align="end"
          trigger={
            <button type="button" className="arco-bento-workspace__menu-btn">
              <Plus size={14} aria-hidden="true" />
              Widgets
              <ChevronDown size={13} aria-hidden="true" />
            </button>
          }
          items={menuItems}
        />
      </div>

      <BentoLiveProvider>
        <BentoGrid
          items={items}
          activeId={activeId}
          onFocus={setActiveId}
          onMove={moveWidget}
          onResize={resizeWidget}
        />
      </BentoLiveProvider>
    </div>
  );
}
