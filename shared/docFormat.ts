/**
 * TipTap-compatible document JSON helpers — shared by the server (docs.export)
 * and editor-kit (markdown round-trip). Plain types, no TipTap dependency.
 */

export interface DocNode {
  type?: string;
  content?: DocNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

function widgetFence(type: string, version: number, props: Record<string, unknown>): string {
  return `\`\`\`widget\n${JSON.stringify({ type, version, props }, null, 2)}\n\`\`\``;
}

function nodeToMarkdown(node: DocNode): string {
  switch (node.type) {
    case "doc":
      return (node.content ?? []).map(nodeToMarkdown).join("\n\n");
    case "paragraph":
      return (node.content ?? []).map(inlineToMarkdown).join("") || "";
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1));
      return `${"#".repeat(level)} ${(node.content ?? []).map(inlineToMarkdown).join("")}`;
    }
    case "bulletList":
      return (node.content ?? [])
        .map((item) => `- ${(item.content ?? []).map(nodeToMarkdown).join("\n")}`)
        .join("\n");
    case "orderedList":
      return (node.content ?? [])
        .map((item, i) => `${i + 1}. ${(item.content ?? []).map(nodeToMarkdown).join("\n")}`)
        .join("\n");
    case "listItem":
      return (node.content ?? []).map(nodeToMarkdown).join("\n");
    case "codeBlock":
      return `\`\`\`\n${(node.content ?? []).map((c) => c.text ?? "").join("")}\n\`\`\``;
    case "blockquote":
      return (node.content ?? [])
        .map(nodeToMarkdown)
        .map((line) => `> ${line}`)
        .join("\n");
    case "horizontalRule":
      return "---";
    case "arcoWidget": {
      const attrs = node.attrs ?? {};
      return widgetFence(
        String(attrs.widgetType ?? "unknown"),
        Number(attrs.version) || 1,
        (attrs.props as Record<string, unknown>) ?? {},
      );
    }
    default:
      return (node.content ?? []).map(nodeToMarkdown).join("\n");
  }
}

function inlineToMarkdown(node: DocNode): string {
  if (node.type === "text") {
    let text = node.text ?? "";
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") text = `**${text}**`;
      if (mark.type === "italic") text = `*${text}*`;
      if (mark.type === "code") text = `\`${text}\``;
      if (mark.type === "link") text = `[${text}](${mark.attrs?.href ?? ""})`;
    }
    return text;
  }
  if (node.type === "hardBreak") return "\n";
  return nodeToMarkdown(node);
}

export function exportDocToMarkdown(doc: DocNode): string {
  return nodeToMarkdown(doc).trim();
}

export function importMarkdownToDoc(markdown: string): DocNode {
  const FENCE = /```widget\n([\s\S]*?)```/g;
  const content: DocNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = FENCE.exec(markdown)) !== null) {
    if (match.index > last) {
      for (const para of markdown.slice(last, match.index).split(/\n\n+/)) {
        if (para.trim()) content.push({ type: "paragraph", content: [{ type: "text", text: para.trim() }] });
      }
    }
    try {
      const payload = JSON.parse(match[1]) as Record<string, unknown>;
      content.push({
        type: "arcoWidget",
        attrs: {
          widgetType: payload.type,
          version: payload.version,
          props: payload.props ?? {},
        },
      });
    } catch {
      content.push({ type: "paragraph", content: [{ type: "text", text: match[0] }] });
    }
    last = match.index + match[0].length;
  }
  if (last < markdown.length) {
    for (const para of markdown.slice(last).split(/\n\n+/)) {
      if (para.trim()) content.push({ type: "paragraph", content: [{ type: "text", text: para.trim() }] });
    }
  }
  if (content.length === 0) content.push({ type: "paragraph" });
  return { type: "doc", content };
}
