/**
 * ComposerSlashMenu — typeahead that appears when the draft ends in `/query`.
 */
import { useEffect, useRef } from "react";
import type { SlashCommand } from "./slashCommands";

export interface ComposerSlashMenuProps {
  commands: SlashCommand[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (command: SlashCommand) => void;
}

export function ComposerSlashMenu({
  commands,
  activeIndex,
  onActiveIndexChange,
  onSelect,
}: ComposerSlashMenuProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (commands.length === 0) {
    return (
      <div className="arco-composer-slash" role="listbox" aria-label="Slash commands">
        <div className="arco-composer-slash__empty">No matching commands</div>
      </div>
    );
  }

  return (
    <div className="arco-composer-slash" role="listbox" aria-label="Slash commands" ref={listRef}>
      {commands.map((command, index) => (
        <button
          key={command.id}
          type="button"
          role="option"
          data-index={index}
          aria-selected={index === activeIndex}
          className={`arco-composer-slash__item${index === activeIndex ? " arco-composer-slash__item--active" : ""}`}
          onMouseEnter={() => onActiveIndexChange(index)}
          onClick={() => onSelect(command)}
        >
          <span className="arco-composer-slash__label">/{command.label}</span>
          <span className="arco-composer-slash__desc">{command.description}</span>
        </button>
      ))}
    </div>
  );
}
