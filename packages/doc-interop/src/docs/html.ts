import type { DocNode, ExportResult, ImportResult } from "../types.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function marksOpen(marks?: DocNode["marks"]): string {
  if (!marks?.length) return "";
  let out = "";
  for (const mark of marks) {
    if (mark.type === "bold") out += "<strong>";
    else if (mark.type === "italic") out += "<em>";
    else if (mark.type === "code") out += "<code>";
    else if (mark.type === "underline") out += "<u>";
    else if (mark.type === "strike") out += "<s>";
    else if (mark.type === "link") out += `<a href="${escapeHtml(String(mark.attrs?.href ?? ""))}">`;
  }
  return out;
}

function marksClose(marks?: DocNode["marks"]): string {
  if (!marks?.length) return "";
  let out = "";
  for (const mark of [...marks].reverse()) {
    if (mark.type === "bold") out += "</strong>";
    else if (mark.type === "italic") out += "</em>";
    else if (mark.type === "code") out += "</code>";
    else if (mark.type === "underline") out += "</u>";
    else if (mark.type === "strike") out += "</s>";
    else if (mark.type === "link") out += "</a>";
  }
  return out;
}

function inlineToHtml(node: DocNode): string {
  if (node.type === "text") {
    return `${marksOpen(node.marks)}${escapeHtml(node.text ?? "")}${marksClose(node.marks)}`;
  }
  if (node.type === "hardBreak") return "<br>";
  if (node.type === "image") {
    const src = escapeHtml(String(node.attrs?.src ?? ""));
    const alt = escapeHtml(String(node.attrs?.alt ?? ""));
    return `<img src="${src}" alt="${alt}" />`;
  }
  return (node.content ?? []).map(inlineToHtml).join("");
}

function nodeToHtml(node: DocNode): string {
  switch (node.type) {
    case "doc":
      return (node.content ?? []).map(nodeToHtml).join("\n");
    case "paragraph":
      return `<p>${(node.content ?? []).map(inlineToHtml).join("")}</p>`;
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1));
      return `<h${level}>${(node.content ?? []).map(inlineToHtml).join("")}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${(node.content ?? []).map(nodeToHtml).join("")}</ul>`;
    case "orderedList":
      return `<ol>${(node.content ?? []).map(nodeToHtml).join("")}</ol>`;
    case "listItem":
      return `<li>${(node.content ?? []).map(nodeToHtml).join("")}</li>`;
    case "blockquote":
      return `<blockquote>${(node.content ?? []).map(nodeToHtml).join("")}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${escapeHtml((node.content ?? []).map((c) => c.text ?? "").join(""))}</code></pre>`;
    case "horizontalRule":
      return "<hr />";
    case "table":
      return `<table>${(node.content ?? []).map(nodeToHtml).join("")}</table>`;
    case "tableRow":
      return `<tr>${(node.content ?? []).map(nodeToHtml).join("")}</tr>`;
    case "tableHeader":
      return `<th>${(node.content ?? []).map(nodeToHtml).join("")}</th>`;
    case "tableCell":
      return `<td>${(node.content ?? []).map(nodeToHtml).join("")}</td>`;
    case "image":
      return inlineToHtml(node);
    default:
      return (node.content ?? []).map(nodeToHtml).join("");
  }
}

function textNode(text: string, marks?: DocNode["marks"]): DocNode {
  return marks?.length ? { type: "text", text, marks } : { type: "text", text };
}

/** Minimal HTML → TipTap for the Arco authoring surface (no DOM in Node). */
function parseInline(html: string): DocNode[] {
  const nodes: DocNode[] = [];
  const re =
    /<(strong|b|em|i|code|u|s|a|br|img)(\s[^>]*)?>([\s\S]*?)<\/\1>|<br\s*\/?>|<img\s([^>]*?)\s*\/?>|([^<]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    if (match[5]) {
      nodes.push(textNode(match[5].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')));
      continue;
    }
    const tag = (match[1] ?? "").toLowerCase();
    if (!tag && /<br/i.test(match[0])) {
      nodes.push({ type: "hardBreak" });
      continue;
    }
    if (/^img/i.test(match[0]) || tag === "img") {
      const attrs = match[4] ?? match[2] ?? "";
      const src = attrs.match(/src=["']([^"']+)["']/i)?.[1] ?? "";
      const alt = attrs.match(/alt=["']([^"']+)["']/i)?.[1] ?? "";
      nodes.push({ type: "image", attrs: { src, alt } });
      continue;
    }
    const inner = match[3] ?? "";
    const child = parseInline(inner);
    const markType =
      tag === "strong" || tag === "b"
        ? "bold"
        : tag === "em" || tag === "i"
          ? "italic"
          : tag === "code"
            ? "code"
            : tag === "u"
              ? "underline"
              : tag === "s"
                ? "strike"
                : tag === "a"
                  ? "link"
                  : null;
    if (!markType) {
      nodes.push(...child);
      continue;
    }
    const href = tag === "a" ? (match[2]?.match(/href=["']([^"']+)["']/i)?.[1] ?? "") : undefined;
    for (const c of child) {
      if (c.type === "text") {
        const marks = [...(c.marks ?? []), href !== undefined ? { type: markType, attrs: { href } } : { type: markType }];
        nodes.push({ ...c, marks });
      } else nodes.push(c);
    }
  }
  return nodes.length ? nodes : [];
}

function parseBlocks(html: string): DocNode[] {
  const cleaned = html
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .trim();
  const blocks: DocNode[] = [];
  const re =
    /<(h([1-6])|p|ul|ol|blockquote|pre|hr|table)(\s[^>]*)?>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(cleaned)) !== null) {
    if (match.index > last) {
      const loose = cleaned.slice(last, match.index).trim();
      if (loose) blocks.push({ type: "paragraph", content: parseInline(loose) });
    }
    if (/^<hr/i.test(match[0])) {
      blocks.push({ type: "horizontalRule" });
      last = match.index + match[0].length;
      continue;
    }
    const tag = (match[1] ?? "").toLowerCase();
    const inner = match[4] ?? "";
    if (tag.startsWith("h")) {
      blocks.push({
        type: "heading",
        attrs: { level: Number(match[2] ?? 1) },
        content: parseInline(inner),
      });
    } else if (tag === "p") {
      blocks.push({ type: "paragraph", content: parseInline(inner) });
    } else if (tag === "ul" || tag === "ol") {
      const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => ({
        type: "listItem" as const,
        content: [{ type: "paragraph", content: parseInline(m[1]) }],
      }));
      blocks.push({ type: tag === "ul" ? "bulletList" : "orderedList", content: items });
    } else if (tag === "blockquote") {
      blocks.push({ type: "blockquote", content: parseBlocks(inner) });
    } else if (tag === "pre") {
      const text = inner.replace(/<\/?code[^>]*>/gi, "").replace(/<[^>]+>/g, "");
      blocks.push({ type: "codeBlock", content: [{ type: "text", text }] });
    } else if (tag === "table") {
      const rows = [...inner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) => {
        const cells = [...row[1].matchAll(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi)].map((cell) => ({
          type: cell[1].toLowerCase() === "th" ? ("tableHeader" as const) : ("tableCell" as const),
          content: [{ type: "paragraph", content: parseInline(cell[2]) }],
        }));
        return { type: "tableRow" as const, content: cells };
      });
      blocks.push({ type: "table", content: rows });
    }
    last = match.index + match[0].length;
  }
  if (last < cleaned.length) {
    const loose = cleaned.slice(last).trim();
    if (loose) blocks.push({ type: "paragraph", content: parseInline(loose) });
  }
  return blocks.length ? blocks : [{ type: "paragraph" }];
}

export function importHtml(html: string): ImportResult<DocNode> {
  return {
    content: { type: "doc", content: parseBlocks(html) },
    warnings: ["HTML import maps only the Arco Docs authoring surface (headings, lists, links, tables, images)."],
    assets: [],
  };
}

export function exportHtml(doc: DocNode): ExportResult {
  const body = nodeToHtml(doc);
  const html = `<!DOCTYPE html>\n<html><head><meta charset="utf-8"><title>Document</title></head><body>\n${body}\n</body></html>\n`;
  return {
    bytes: new TextEncoder().encode(html),
    mimeType: "text/html",
    filenameExt: "html",
    warnings: [],
  };
}
