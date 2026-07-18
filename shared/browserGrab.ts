/**
 * Design Mode (browser grab) — shared payload contract between desktop
 * webview guest scripts, Studio Browser, and the composer handoff.
 */

export interface BrowserGrabRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BrowserGrabComputedStyles {
  display: string;
  position: string;
  width: string;
  height: string;
  margin: string;
  padding: string;
  color: string;
  backgroundColor: string;
  border: string;
  borderRadius: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  textAlign: string;
  zIndex: string;
}

export interface BrowserGrabTarget {
  tagName: string;
  selector: string;
  textSnippet: string;
  htmlSnippet: string;
  attributes: Record<string, string>;
  accessibility: {
    role: string | null;
    ariaLabel: string | null;
  };
  rectViewport: BrowserGrabRect;
  computedStyles: BrowserGrabComputedStyles;
  sourceFile?: string | null;
  reactComponents?: string | null;
}

export interface BrowserGrabPageContext {
  sanitizedUrl: string;
  title: string;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  capturedAt: string;
}

export interface BrowserGrabScreenshot {
  mimeType: "image/png";
  dataUrl: string;
  width: number;
  height: number;
}

export interface BrowserGrabPayload {
  page: BrowserGrabPageContext;
  target: BrowserGrabTarget;
  ancestorPath: string[];
  screenshot: BrowserGrabScreenshot | null;
}

/** Format a grab for insertion into the agent composer. */
export function formatGrabPayloadAsText(payload: BrowserGrabPayload): string {
  const { page, target, ancestorPath } = payload;
  const styles = Object.entries(target.computedStyles)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n");
  const attrs = Object.entries(target.attributes)
    .map(([k, v]) => `  ${k}="${v}"`)
    .join("\n");
  const lines = [
    "## Design Mode selection",
    "",
    `**Page:** ${page.title || "(untitled)"}`,
    `**URL:** ${page.sanitizedUrl}`,
    `**Element:** \`<${target.tagName}>\` — \`${target.selector}\``,
  ];
  if (target.sourceFile) {
    lines.push(`**Source:** ${target.sourceFile}`);
  }
  if (target.reactComponents) {
    lines.push(`**React:** ${target.reactComponents}`);
  }
  if (target.accessibility.role || target.accessibility.ariaLabel) {
    lines.push(
      `**A11y:** role=${target.accessibility.role ?? "—"} label=${target.accessibility.ariaLabel ?? "—"}`,
    );
  }
  if (ancestorPath.length > 0) {
    lines.push(`**Ancestors:** ${ancestorPath.join(" > ")}`);
  }
  lines.push(
    "",
    "### Text",
    target.textSnippet || "(empty)",
    "",
    "### HTML",
    "```html",
    target.htmlSnippet || "",
    "```",
    "",
    "### Attributes",
    attrs || "(none)",
    "",
    "### Computed CSS",
    "```css",
    styles,
    "```",
    "",
    "Please update this UI element as requested.",
  );
  return lines.join("\n");
}
