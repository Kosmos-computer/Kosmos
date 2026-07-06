import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { Editor, Range } from "@tiptap/core";

export interface SlashMenuItem {
  id: string;
  label: string;
  hint: string;
  command: (payload: { editor: Editor; range: Range }) => void;
}

export interface SlashMenuProps {
  items: SlashMenuItem[];
  command: (item: SlashMenuItem) => void;
}

export interface SlashMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(function SlashMenu(
  { items, command },
  ref,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((index) => (index + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((index) => (index + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        const item = items[selectedIndex];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="ek-slash-menu" role="listbox" aria-label="Insert block">
        <div className="ek-slash-menu__empty">No matches</div>
      </div>
    );
  }

  return (
    <div className="ek-slash-menu" role="listbox" aria-label="Insert block">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={index === selectedIndex}
          className={[
            "ek-slash-menu__item",
            index === selectedIndex ? "ek-slash-menu__item--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onMouseEnter={() => setSelectedIndex(index)}
          onMouseDown={(event) => {
            event.preventDefault();
            command(item);
          }}
        >
          <span className="ek-slash-menu__label">{item.label}</span>
          <span className="ek-slash-menu__hint">{item.hint}</span>
        </button>
      ))}
    </div>
  );
});
