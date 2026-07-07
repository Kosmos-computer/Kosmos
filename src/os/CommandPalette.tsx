/**
 * Global command palette — ⌘K overlay to jump to apps, settings sections,
 * or switch desktop / app shell modes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { ListItem } from "../components/patterns/ListItem";
import { Input } from "../components/ui";
import { useCan } from "./auth/authStore";
import { visibleSettingsNavGroups } from "../apps/settings/settingsSections";
import {
  buildCommandPaletteEntries,
  filterCommandPaletteEntries,
  groupCommandPaletteEntries,
  type CommandPaletteEntry,
} from "./commandPaletteEntries";
import { useCommandPaletteStore } from "./commandPaletteStore";
import { useOsStore } from "./osStore";
import { useShellApps } from "./shellApps";

export function CommandPalette() {
  const open = useCommandPaletteStore((s) => s.open);
  const closePalette = useCommandPaletteStore((s) => s.closePalette);
  const togglePalette = useCommandPaletteStore((s) => s.togglePalette);
  const shellApps = useShellApps();
  const shellView = useOsStore((s) => s.shellView);
  const appWindowHost = useOsStore((s) => s.appWindowHost);
  const canManageUsers = useCan("users:manage");
  const canWriteSettings = useCan("settings:write");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const allEntries = useMemo(
    () =>
      buildCommandPaletteEntries({
        shellApps,
        settingsGroups: visibleSettingsNavGroups({ canWriteSettings, canManageUsers }),
        shellView,
        appWindowHost,
      }),
    [shellApps, canWriteSettings, canManageUsers, shellView, appWindowHost],
  );

  const filteredEntries = useMemo(
    () => filterCommandPaletteEntries(allEntries, query),
    [allEntries, query],
  );
  const groupedEntries = useMemo(
    () => groupCommandPaletteEntries(filteredEntries),
    [filteredEntries],
  );
  const flatEntries = useMemo(
    () => groupedEntries.flatMap((section) => section.entries),
    [groupedEntries],
  );

  const reset = useCallback(() => {
    setQuery("");
    setActiveIndex(0);
  }, []);

  const close = useCallback(() => {
    closePalette();
    reset();
  }, [closePalette, reset]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        togglePalette();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [togglePalette]);

  useEffect(() => {
    if (!open) return;
    reset();
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, reset]);

  useEffect(() => {
    setActiveIndex((index) => (flatEntries.length === 0 ? 0 : Math.min(index, flatEntries.length - 1)));
  }, [flatEntries.length]);

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const runEntry = useCallback(
    (entry: CommandPaletteEntry) => {
      entry.run();
      close();
    },
    [close],
  );

  if (!open) return null;

  let runningIndex = 0;

  return (
    <div
      className="arco-command-palette__backdrop"
      role="presentation"
      onClick={close}
    >
      <div
        ref={listRef}
        className="arco-command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="arco-command-palette__search">
          <Search size={18} aria-hidden className="arco-command-palette__search-icon" />
          <Input
            ref={inputRef}
            className="arco-command-palette__input"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) => (flatEntries.length === 0 ? 0 : (index + 1) % flatEntries.length));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) =>
                  flatEntries.length === 0 ? 0 : (index - 1 + flatEntries.length) % flatEntries.length,
                );
              } else if (event.key === "Enter") {
                event.preventDefault();
                const entry = flatEntries[activeIndex];
                if (entry) runEntry(entry);
              } else if (event.key === "Escape") {
                event.preventDefault();
                close();
              }
            }}
            placeholder="Search apps, settings, or shell mode…"
            spellCheck={false}
            autoComplete="off"
            aria-controls="command-palette-results"
            aria-activedescendant={
              flatEntries[activeIndex] ? `command-palette-${flatEntries[activeIndex].id}` : undefined
            }
          />
          <kbd className="arco-command-palette__hint">esc</kbd>
        </div>

        <div
          id="command-palette-results"
          className="arco-command-palette__results"
          role="listbox"
          aria-label="Command palette results"
        >
          {flatEntries.length === 0 ? (
            <p className="arco-command-palette__empty">No matches</p>
          ) : (
            groupedEntries.map((section) => (
              <section key={section.group} className="arco-command-palette__section">
                <h3 className="arco-command-palette__section-title">{section.group}</h3>
                <ul className="arco-command-palette__list">
                  {section.entries.map((entry) => {
                    const index = runningIndex;
                    runningIndex += 1;
                    const Icon = entry.icon;
                    const active = index === activeIndex;
                    return (
                      <li key={entry.id}>
                        <ListItem
                          ref={(node) => {
                            itemRefs.current[index] = node;
                          }}
                          id={`command-palette-${entry.id}`}
                          role="option"
                          aria-selected={active}
                          active={active}
                          leading={<Icon size={16} strokeWidth={1.75} aria-hidden />}
                          label={entry.label}
                          description={entry.description}
                          trailing={entry.kind === "shell" && entry.description?.startsWith("Active") ? "Active" : undefined}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => runEntry(entry)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        <footer className="arco-command-palette__footer">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>⌘K toggle</span>
        </footer>
      </div>
    </div>
  );
}
