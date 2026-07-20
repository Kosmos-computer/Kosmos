import { useEffect, useRef, useState } from "react";

export type StagedPhase = "enter" | "shown" | "exit";

export interface StagedEntry<T extends { id: string }> {
  item: T;
  phase: StagedPhase;
  key: string;
}

/** Match --arco-dur-med (240ms) plus a small buffer for accordion settle. */
const EXIT_MS = 280;
const ENTER_SETTLE_MS = 280;

/**
 * Keeps leaving items in the list long enough to play an exit animation, and
 * marks newly appearing items so they can enter. Initial loads and bulk folder
 * swaps appear instantly (no accordion).
 */
export function useStagedList<T extends { id: string }>(items: T[]): StagedEntry<T>[] {
  const [entries, setEntries] = useState<StagedEntry<T>[]>(() =>
    items.map((item) => ({ item, phase: "shown", key: item.id })),
  );
  const prevItemsRef = useRef(items);
  const exitTimersRef = useRef<Map<string, number>>(new Map());
  const enterTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const prevItems = prevItemsRef.current;
    prevItemsRef.current = items;

    const nextIds = new Set(items.map((item) => item.id));
    const prevIds = new Set(prevItems.map((item) => item.id));
    const added = items.filter((item) => !prevIds.has(item.id)).length;
    const removed = prevItems.filter((item) => !nextIds.has(item.id)).length;
    // Empty → populated is a load (or folder open), not a single-item mutation.
    const initialPopulate = prevItems.length === 0 && items.length > 0;
    const bulkSwap =
      prevItems.length > 0 &&
      items.length > 0 &&
      added >= Math.min(prevItems.length, items.length) &&
      removed >= Math.min(prevItems.length, items.length) &&
      added + removed >= 4;
    const skipEnterMotion = initialPopulate || bulkSwap;

    setEntries((prevEntries) => {
      if (skipEnterMotion) {
        for (const timer of exitTimersRef.current.values()) window.clearTimeout(timer);
        for (const timer of enterTimersRef.current.values()) window.clearTimeout(timer);
        exitTimersRef.current.clear();
        enterTimersRef.current.clear();
        return items.map((item) => ({ item, phase: "shown" as const, key: item.id }));
      }

      const prevById = new Map(prevEntries.map((entry) => [entry.key, entry]));
      const nextEntries: StagedEntry<T>[] = items.map((item) => {
        const prev = prevById.get(item.id);
        if (!prev || prev.phase === "exit") {
          return { item, phase: "enter", key: item.id };
        }
        return { item, phase: prev.phase === "enter" ? "enter" : "shown", key: item.id };
      });

      prevEntries.forEach((prev, oldIndex) => {
        if (nextIds.has(prev.key)) return;
        if (nextEntries.some((entry) => entry.key === prev.key)) return;

        let insertAt = nextEntries.length;
        for (let i = oldIndex - 1; i >= 0; i -= 1) {
          const neighborKey = prevEntries[i]?.key;
          if (!neighborKey) continue;
          const idx = nextEntries.findIndex((entry) => entry.key === neighborKey);
          if (idx >= 0) {
            insertAt = idx + 1;
            break;
          }
        }

        nextEntries.splice(insertAt, 0, {
          item: prev.item,
          phase: "exit",
          key: prev.key,
        });

        if (prev.phase !== "exit" && !exitTimersRef.current.has(prev.key)) {
          const timer = window.setTimeout(() => {
            setEntries((list) => list.filter((entry) => entry.key !== prev.key));
            exitTimersRef.current.delete(prev.key);
          }, EXIT_MS);
          exitTimersRef.current.set(prev.key, timer);
        }
      });

      return nextEntries;
    });

    if (skipEnterMotion) return;

    const enterIds = items.filter((item) => !prevIds.has(item.id)).map((item) => item.id);
    for (const id of enterIds) {
      if (enterTimersRef.current.has(id)) continue;
      const timer = window.setTimeout(() => {
        setEntries((list) =>
          list.map((entry) => (entry.key === id && entry.phase === "enter" ? { ...entry, phase: "shown" } : entry)),
        );
        enterTimersRef.current.delete(id);
      }, ENTER_SETTLE_MS);
      enterTimersRef.current.set(id, timer);
    }
  }, [items]);

  useEffect(
    () => () => {
      for (const timer of exitTimersRef.current.values()) window.clearTimeout(timer);
      for (const timer of enterTimersRef.current.values()) window.clearTimeout(timer);
      exitTimersRef.current.clear();
      enterTimersRef.current.clear();
    },
    [],
  );

  return entries;
}
