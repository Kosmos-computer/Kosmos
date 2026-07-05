/**
 * Markdown formatting for the composer textarea. The reference design's
 * toolbar was visual-only; here each button applies real Markdown to the
 * current selection so the agent receives formatted prompts.
 *
 * Two strategies: inline formats wrap the selection with markers; line
 * formats prefix every line the selection touches (lists, quotes).
 */

export type MarkdownFormat =
  | "bold"
  | "italic"
  | "strikethrough"
  | "link"
  | "ordered-list"
  | "bullet-list"
  | "quote"
  | "code";

interface Edit {
  next: string;
  selectionStart: number;
  selectionEnd: number;
}

/** Wrap [start, end) with symmetric markers; keeps the text selected. */
function wrapSelection(value: string, start: number, end: number, marker: string): Edit {
  const next = value.slice(0, start) + marker + value.slice(start, end) + marker + value.slice(end);
  return { next, selectionStart: start + marker.length, selectionEnd: end + marker.length };
}

/** Prefix every line the selection touches; keeps the whole block selected. */
function prefixLines(
  value: string,
  start: number,
  end: number,
  makePrefix: (lineIndex: number) => string,
): Edit {
  // Expand to full lines so partial selections still format cleanly.
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndIdx = value.indexOf("\n", Math.max(end - 1, lineStart));
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;

  const block = value.slice(lineStart, lineEnd);
  const formatted = block
    .split("\n")
    .map((line, i) => makePrefix(i) + line)
    .join("\n");

  const next = value.slice(0, lineStart) + formatted + value.slice(lineEnd);
  return { next, selectionStart: lineStart, selectionEnd: lineStart + formatted.length };
}

function computeEdit(value: string, start: number, end: number, format: MarkdownFormat): Edit {
  const selected = value.slice(start, end);

  switch (format) {
    case "bold":
      return wrapSelection(value, start, end, "**");
    case "italic":
      return wrapSelection(value, start, end, "_");
    case "strikethrough":
      return wrapSelection(value, start, end, "~~");
    case "code":
      // Multi-line selections become fenced blocks; single-line stays inline.
      if (selected.includes("\n")) {
        const next = `${value.slice(0, start)}\n\`\`\`\n${selected}\n\`\`\`\n${value.slice(end)}`;
        return { next, selectionStart: start + 5, selectionEnd: start + 5 + selected.length };
      }
      return wrapSelection(value, start, end, "`");
    case "link": {
      // Selection becomes the link text; the placeholder URL stays selected
      // so the user can immediately type over it.
      const text = selected || "link text";
      const url = "url";
      const insert = `[${text}](${url})`;
      const next = value.slice(0, start) + insert + value.slice(end);
      const urlStart = start + text.length + 3; // "[" + text + "]("
      return { next, selectionStart: urlStart, selectionEnd: urlStart + url.length };
    }
    case "ordered-list":
      return prefixLines(value, start, end, (i) => `${i + 1}. `);
    case "bullet-list":
      return prefixLines(value, start, end, () => "- ");
    case "quote":
      return prefixLines(value, start, end, () => "> ");
  }
}

/**
 * Apply `format` at the textarea's current selection and push the result
 * through `onChange`. Restores focus and selection on the next frame, after
 * React re-renders the controlled value.
 */
export function applyMarkdownFormat(
  el: HTMLTextAreaElement | null,
  value: string,
  format: MarkdownFormat,
  onChange: (next: string) => void,
): void {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  const edit = computeEdit(value, start, end, format);
  onChange(edit.next);

  requestAnimationFrame(() => {
    if (!el) return;
    el.focus();
    el.setSelectionRange(edit.selectionStart, edit.selectionEnd);
  });
}

/** Insert text (e.g. an emoji) at the caret, or append when unfocused. */
export function insertAtCursor(
  el: HTMLTextAreaElement | null,
  value: string,
  insert: string,
  onChange: (next: string) => void,
): void {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  onChange(value.slice(0, start) + insert + value.slice(end));

  requestAnimationFrame(() => {
    if (!el) return;
    el.focus();
    const pos = start + insert.length;
    el.setSelectionRange(pos, pos);
  });
}
