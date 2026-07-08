import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * ComposerEmojiPicker — emoji trigger + searchable popover with category
 * navigation. The panel anchors above the trigger inside the composer (no
 * portal — consistent with Arco's other in-window popovers) and tracks the
 * active category from scroll position.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useDismiss } from "../useDismiss";
import { emojiCategories, filterEmojiCategories } from "./emojiData";

export interface ComposerEmojiPickerProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function ComposerEmojiPicker({ onSelect, disabled }: ComposerEmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState(emojiCategories[0]?.id ?? "");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useDismiss(open, () => setOpen(false), rootRef);

  const filteredCategories = useMemo(() => filterEmojiCategories(query), [query]);
  // While searching, results collapse into one flat list — hide category nav.
  const showCategoryNav = query.trim().length === 0;

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    searchRef.current?.focus();
  }, [open]);

  function scrollToCategory(categoryId: string) {
    setActiveCategoryId(categoryId);
    const container = scrollRef.current;
    const section = sectionRefs.current[categoryId];
    if (!container || !section) return;
    container.scrollTo({ top: section.offsetTop - container.offsetTop, behavior: "smooth" });
  }

  // Track which section header has scrolled past the top to highlight its tab.
  function handleScroll() {
    if (!showCategoryNav) return;
    const container = scrollRef.current;
    if (!container) return;

    let nextActive = emojiCategories[0]?.id ?? "";
    for (const category of emojiCategories) {
      const section = sectionRefs.current[category.id];
      if (!section) continue;
      if (section.offsetTop - container.offsetTop - 8 <= container.scrollTop) {
        nextActive = category.id;
      }
    }
    setActiveCategoryId(nextActive);
  }

  return (
    <div className="arco-menu" ref={rootRef}>
      <button
        type="button"
        className="arco-emoji__trigger"
        aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_INSERT_EMOJI)}
        title={i18n.t(I18nKey.COMPONENTS$COMPOSER_INSERT_EMOJI)}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">😊</span>
      </button>

      {open && (
        <div role="dialog" aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_EMOJI_PICKER)} className="arco-emoji__panel">
          <div className="arco-emoji__searchrow">
            <Search size={13} className="arco-emoji__searchicon" aria-hidden="true" />
            <input
              ref={searchRef}
              className="arco-emoji__searchinput"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={i18n.t(I18nKey.COMPONENTS$COMPOSER_SEARCH_EMOJI_2)}
              aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_SEARCH_EMOJI)}
            />
            {query && (
              <button
                type="button"
                className="arco-btn arco-btn--ghost arco-btn--icon"
                aria-label={i18n.t(I18nKey.APPS$MAPS_CLEAR_SEARCH)}
                onClick={() => setQuery("")}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {showCategoryNav && (
            <div className="arco-emoji__categories" role="tablist" aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_EMOJI_CATEGORIES)}>
              {emojiCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={activeCategoryId === category.id}
                  className={`arco-emoji__category ${
                    activeCategoryId === category.id ? "arco-emoji__category--active" : ""
                  }`}
                  onClick={() => scrollToCategory(category.id)}
                >
                  {category.label}
                </button>
              ))}
            </div>
          )}

          <div ref={scrollRef} className="arco-emoji__scroll arco-scroll" onScroll={handleScroll}>
            {filteredCategories.length === 0 ? (
              <div className="arco-emoji__empty"><T k={I18nKey.COMPONENTS$COMPOSER_NO_EMOJI_MATCH_YOUR_SEARCH} /></div>
            ) : (
              filteredCategories.map((category) => (
                <div
                  key={category.id}
                  ref={(node) => {
                    sectionRefs.current[category.id] = node;
                  }}
                  className="arco-emoji__section"
                >
                  {showCategoryNav && <h3 className="arco-emoji__sectionheader">{category.label}</h3>}
                  <div className="arco-emoji__grid" role="list">
                    {category.emojis.map((entry) => (
                      <button
                        key={`${category.id}-${entry.emoji}`}
                        type="button"
                        role="listitem"
                        className="arco-emoji__button"
                        aria-label={entry.keywords[0] ?? entry.emoji}
                        onClick={() => {
                          onSelect(entry.emoji);
                          setOpen(false);
                        }}
                      >
                        {entry.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
