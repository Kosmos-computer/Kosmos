/**
 * Split assistant text into markdown and fenced `openui-lang` segments.
 * An unclosed fence (mid-stream) becomes a streaming openui segment so the
 * renderer can hoist partial statements as they arrive.
 */
export type Segment =
  | { type: "markdown"; content: string }
  | { type: "openui"; content: string; open: boolean };

const FENCE_OPEN = /```openui-lang[ \t]*\n/g;

export function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  FENCE_OPEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FENCE_OPEN.exec(text)) !== null) {
    if (match.index > cursor) {
      segments.push({ type: "markdown", content: text.slice(cursor, match.index) });
    }
    const bodyStart = match.index + match[0].length;
    const closeIdx = text.indexOf("```", bodyStart);
    if (closeIdx === -1) {
      segments.push({ type: "openui", content: text.slice(bodyStart), open: true });
      cursor = text.length;
      break;
    }
    segments.push({ type: "openui", content: text.slice(bodyStart, closeIdx), open: false });
    cursor = closeIdx + 3;
    FENCE_OPEN.lastIndex = cursor;
  }

  if (cursor < text.length) {
    segments.push({ type: "markdown", content: text.slice(cursor) });
  }
  return segments.filter(
    (s) => s.content.trim().length > 0 || (s.type === "openui" && s.open),
  );
}
