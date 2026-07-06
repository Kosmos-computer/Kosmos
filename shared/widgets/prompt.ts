/**
 * Generate the model-facing widget section from the registry — never hand-write
 * widget prose in chat-prompt.md (docs/rich-content-widgets-plan.md Phase 2).
 */
import { allWidgets, type WidgetDef } from "./registry.js";

function formatProps(def: WidgetDef): string {
  const lines = Object.entries(def.props).map(([name, spec]) => {
    const req = spec.required ? "required" : "optional";
    const enumHint = spec.enum ? `, one of: ${spec.enum.join(" | ")}` : "";
    return `    - ${name} (${spec.type}, ${req}${enumHint})${spec.description ? ` — ${spec.description}` : ""}`;
  });
  return lines.join("\n");
}

/** Markdown block appended to server/generated/chat-prompt.md by `npm run generate`. */
export function generateWidgetPromptSection(): string {
  const widgets = allWidgets();
  const fenceExample = JSON.stringify(widgets[0]?.exemplar ?? { type: "metric", version: 1, props: {} }, null, 2);

  const catalog = widgets
    .map(
      (w) => `### ${w.type}@${w.version} — ${w.description}
When to use: ${w.whenToUse}
Props:
${formatProps(w)}
Example payload:
${JSON.stringify(w.exemplar, null, 2)}`,
    )
    .join("\n\n");

  return `═══════════════════════════════════════════
CONTENT WIDGETS (markdown embeds)
═══════════════════════════════════════════

Besides openui-lang blocks, you can embed small structured widgets inside markdown prose.
Each widget is a JSON payload \`{ "type", "version", "props" }\` validated against the registry below.

Fenced embed (preferred for multi-prop widgets):
\`\`\`widget
${fenceExample}
\`\`\`

Inline embed (single-value widgets inside a sentence):
:metric[$12.4k]{label=Monthly revenue,trend=up}
:progress[75]{label=Q3 goal,detail=$7.5k of $10k}

Rules:
- Prefer a widget over a markdown table when the registry offers a better fit (timeline for dates, metric for one KPI, progress for completion).
- Use the exact \`type\` and \`version\` from the catalog; unknown types render as plain text fallbacks.
- Widget fences use the tag \`widget\` (not openui-lang). openui-lang remains for full interactive UI blocks.
- Do not nest triple-backticks inside widget JSON.

Widget catalog:

${catalog}`;
}
