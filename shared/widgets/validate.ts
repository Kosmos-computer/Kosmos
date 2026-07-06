/**
 * Render-time validation for widget payloads — every host runs AI output
 * through here before rendering. The contract: a valid payload renders, a
 * known-type/wrong-version payload degrades to its markdown fallback, and
 * anything else becomes a labeled error the host shows as inert data. A
 * malformed widget must never crash a document.
 */
import { widgetDef, type PropSpec, type WidgetDef } from "./registry.js";

export interface WidgetInstance {
  type: string;
  version: number;
  props: Record<string, unknown>;
}

export type WidgetValidation =
  /** Render natively. */
  | { ok: true; instance: WidgetInstance; def: WidgetDef }
  /** Known type, unusable payload or retired version — render this markdown. */
  | { ok: false; fallbackMarkdown: string; error: string }
  /** Unknown type / unparseable — host shows a labeled code block. */
  | { ok: false; fallbackMarkdown: null; error: string };

function checkProp(name: string, spec: PropSpec, value: unknown): string | null {
  if (value === undefined || value === null) {
    return spec.required ? `missing required prop "${name}"` : null;
  }
  switch (spec.type) {
    case "string":
      if (typeof value !== "string") return `prop "${name}" must be a string`;
      if (spec.enum && !spec.enum.includes(value)) {
        return `prop "${name}" must be one of: ${spec.enum.join(", ")}`;
      }
      return null;
    case "number":
      return typeof value === "number" && Number.isFinite(value)
        ? null
        : `prop "${name}" must be a number`;
    case "boolean":
      return typeof value === "boolean" ? null : `prop "${name}" must be a boolean`;
    case "array": {
      if (!Array.isArray(value)) return `prop "${name}" must be an array`;
      if (spec.itemProps) {
        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          if (typeof item !== "object" || item === null) {
            return `prop "${name}[${i}]" must be an object`;
          }
          for (const [itemName, itemSpec] of Object.entries(spec.itemProps)) {
            const err = checkProp(
              `${name}[${i}].${itemName}`,
              itemSpec,
              (item as Record<string, unknown>)[itemName],
            );
            if (err) return err;
          }
        }
      }
      return null;
    }
  }
}

/** Validate a parsed widget payload (`{ type, version, props }`). */
export function validateWidget(payload: unknown): WidgetValidation {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, fallbackMarkdown: null, error: "payload must be a JSON object" };
  }
  const raw = payload as Record<string, unknown>;
  const type = typeof raw.type === "string" ? raw.type : "";
  const version = typeof raw.version === "number" ? raw.version : NaN;
  const props =
    typeof raw.props === "object" && raw.props !== null
      ? (raw.props as Record<string, unknown>)
      : null;

  if (!type) return { ok: false, fallbackMarkdown: null, error: "missing \"type\"" };
  if (!Number.isInteger(version)) {
    return { ok: false, fallbackMarkdown: null, error: "missing integer \"version\"" };
  }

  const def = widgetDef(type, version);
  if (!def) {
    // A type we know at another version: degrade via the nearest fallback so
    // old documents keep rendering data instead of an error box.
    const anyVersion = widgetDef(type, 1);
    if (anyVersion && props) {
      return {
        ok: false,
        fallbackMarkdown: anyVersion.fallback(props),
        error: `unsupported version ${version} for widget "${type}"`,
      };
    }
    return { ok: false, fallbackMarkdown: null, error: `unknown widget type "${type}"` };
  }

  if (!props) {
    return { ok: false, fallbackMarkdown: null, error: "missing \"props\" object" };
  }

  for (const [name, spec] of Object.entries(def.props)) {
    const err = checkProp(name, spec, props[name]);
    if (err) return { ok: false, fallbackMarkdown: def.fallback(props), error: err };
  }

  return { ok: true, instance: { type, version, props }, def };
}

/** Parse a widget fence body (JSON text) and validate it. */
export function validateWidgetSource(source: string): WidgetValidation {
  let payload: unknown;
  try {
    payload = JSON.parse(source);
  } catch {
    return { ok: false, fallbackMarkdown: null, error: "widget payload is not valid JSON" };
  }
  return validateWidget(payload);
}
