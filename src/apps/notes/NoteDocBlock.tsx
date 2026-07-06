import { Quote } from "lucide-react";
import type { DocBlock } from "./types";

export function NoteDocBlock({ block }: { block: DocBlock }) {
  switch (block.type) {
    case "heading": {
      const Tag = block.level === 1 ? "h1" : block.level === 2 ? "h2" : "h3";
      return <Tag className={`arco-notes__heading arco-notes__heading--h${block.level}`}>{block.text}</Tag>;
    }
    case "paragraph":
      return <p className="arco-notes__paragraph">{block.text}</p>;
    case "bulletList":
      return (
        <ul className="arco-notes__list">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <div className="arco-notes__callout">
          <Quote size={16} className="arco-notes__callout-icon" aria-hidden="true" />
          <span>{block.text}</span>
        </div>
      );
  }
}
