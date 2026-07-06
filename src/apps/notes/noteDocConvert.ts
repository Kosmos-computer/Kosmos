import { EMPTY_DOC, type JSONContent } from "@arco/editor-kit";
import type { DocBlock, NotePage } from "./types";

/** Convert legacy note blocks into TipTap JSON for the editor. */
export function blocksToDoc(blocks: DocBlock[]): JSONContent {
  if (blocks.length === 0) return EMPTY_DOC;

  const content = blocks.map((block): JSONContent => {
    switch (block.type) {
      case "heading":
        return {
          type: "heading",
          attrs: { level: block.level },
          content: block.text ? [{ type: "text", text: block.text }] : [],
        };
      case "paragraph":
        return {
          type: "paragraph",
          content: block.text ? [{ type: "text", text: block.text }] : [],
        };
      case "bulletList":
        return {
          type: "bulletList",
          content: block.items.map((item) => ({
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: item }] }],
          })),
        };
      case "callout":
        return {
          type: "blockquote",
          content: [{ type: "paragraph", content: [{ type: "text", text: block.text }] }],
        };
    }
  });

  return { type: "doc", content };
}

export function getNoteDoc(note: NotePage): JSONContent {
  if (note.doc) return note.doc;
  if (note.blocks?.length) return blocksToDoc(note.blocks);
  return EMPTY_DOC;
}
