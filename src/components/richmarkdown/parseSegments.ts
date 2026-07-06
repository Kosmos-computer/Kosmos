/**
 * Split markdown source into prose, openui-lang, and widget fence segments.
 * Unclosed fences become streaming segments so partial assistant output renders
 * progressively without flicker.
 */
export type Segment =
  | { type: "markdown"; content: string }
  | { type: "openui"; content: string; open: boolean }
  | { type: "widget"; content: string; open: boolean };

const FENCE_RE = /```(openui-lang|widget)[ \t]*\n/g;

export function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  FENCE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FENCE_RE.exec(text)) !== null) {
    if (match.index > cursor) {
      segments.push({ type: "markdown", content: text.slice(cursor, match.index) });
    }
    const kind = match[1] as "openui-lang" | "widget";
    const bodyStart = match.index + match[0].length;
    const closeIdx = text.indexOf("```", bodyStart);
    if (closeIdx === -1) {
      segments.push({
        type: kind === "widget" ? "widget" : "openui",
        content: text.slice(bodyStart),
        open: true,
      });
      cursor = text.length;
      break;
    }
    segments.push({
      type: kind === "widget" ? "widget" : "openui",
      content: text.slice(bodyStart, closeIdx),
      open: false,
    });
    cursor = closeIdx + 3;
    FENCE_RE.lastIndex = cursor;
  }

  if (cursor < text.length) {
    segments.push({ type: "markdown", content: text.slice(cursor) });
  }

  return segments.filter(
    (s) => s.content.trim().length > 0 || (s.type !== "markdown" && s.open),
  );
}

/** Inline directive: :type[bracket]{key=value,key2=value2} */
export const INLINE_WIDGET_RE = /:([a-z][a-z0-9_-]*)\[([^\]]*)\](?:\{([^}]*)\})?/g;

export function parseInlineAttrs(raw?: string): Record<string, string> {
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const part of raw.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

/** Map shorthand inline syntax to a widget payload for known types. */
export function inlineToPayload(
  type: string,
  bracket: string,
  attrs: Record<string, string>,
): { type: string; version: number; props: Record<string, unknown> } | null {
  switch (type) {
    case "metric":
      return {
        type: "metric",
        version: 1,
        props: {
          label: attrs.label ?? "Value",
          value: bracket || attrs.value || "—",
          delta: attrs.delta,
          trend: attrs.trend,
          caption: attrs.caption,
        },
      };
    case "progress": {
      const num = Number(bracket);
      return {
        type: "progress",
        version: 1,
        props: {
          label: attrs.label ?? "Progress",
          value: Number.isFinite(num) ? num : Number(attrs.value) || 0,
          detail: attrs.detail,
        },
      };
    }
    case "timeline":
      return null;
    default:
      return null;
  }
}

export type InlinePart =
  | { kind: "text"; content: string }
  | { kind: "widget"; payload: { type: string; version: number; props: Record<string, unknown> } };

/** Split a markdown segment around inline widget directives. */
export function splitInlineWidgets(content: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  INLINE_WIDGET_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INLINE_WIDGET_RE.exec(content)) !== null) {
    if (match.index > last) {
      parts.push({ kind: "text", content: content.slice(last, match.index) });
    }
    const attrs = parseInlineAttrs(match[3]);
    const payload = inlineToPayload(match[1], match[2], attrs);
    if (payload) {
      parts.push({ kind: "widget", payload });
    } else {
      parts.push({ kind: "text", content: match[0] });
    }
    last = match.index + match[0].length;
  }
  if (last < content.length) {
    parts.push({ kind: "text", content: content.slice(last) });
  }
  return parts.length > 0 ? parts : [{ kind: "text", content }];
}
