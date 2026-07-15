/**
 * Generator pipeline — one-shot openui-lang synthesis for the Generator app.
 * Uses the inline-chat vocabulary (same renderer as Studio chat). Pattern
 * matching gives instant rich results for common prompts; an LLM handles
 * the long tail with a compact few-shot prompt and falls back locally on failure.
 */
import { extractOpenUiCode, titleFromPrompt } from "../../shared/generator/extractOpenUi.js";
import { lintOpenUICode } from "../lint/lint-openui.js";
import { streamTurn } from "../agent/llm.js";
import { loadSettings } from "../env.js";
import { fallbackLocalUiGenerate, tryLocalUiGenerate } from "./localUiGenerate.js";

/** Compact few-shot prompt — the full chat-prompt.md is too large for small local models. */
const GENERATOR_LLM_SYSTEM = `You generate openui-lang for Arco's INLINE CHAT UI surface.

Rules:
- Static only: no Query, Mutation, or $state.
- Output ONE fenced block tagged openui-lang and nothing else.
- Always define root = Card([...]) (or another top-level component).
- Use Action([@ToAssistant("...")]) on buttons so clicks return to the assistant.
- Prefer Card, CardHeader, TextContent, Form, FormControl, Input, TextArea, Button, Buttons, ListBlock, ListItem, Table, Col, BarChart, Series, TagBlock, FollowUpBlock, FollowUpItem.

Example — contact form:
\`\`\`openui-lang
root = Card([title, form])
title = TextContent("Contact us", "large-heavy")
form = Form("contact", btns, [nameField, emailField, msgField])
nameField = FormControl("Name", Input("name", "Your name", "text", { required: true, minLength: 2 }))
emailField = FormControl("Email", Input("email", "you@example.com", "email", { required: true, email: true }))
msgField = FormControl("Message", TextArea("message", "How can we help?", 4, { required: true, minLength: 10 }))
btns = Buttons([Button("Submit", Action([@ToAssistant("Submit contact form")]), "primary")])
\`\`\`

Example — pricing card:
\`\`\`openui-lang
root = Card([hdr, price, feats, cta])
hdr = CardHeader("Pro", "Everything you need to ship")
price = TextContent("$29 / month", "large-heavy")
feats = ListBlock([f1, f2, f3])
f1 = ListItem("Unlimited projects", "Create without limits")
f2 = ListItem("Priority support", "Fast responses from the team")
f3 = ListItem("Advanced analytics", "Trends and breakdowns")
cta = Buttons([Button("Start trial", Action([@ToAssistant("Start trial")]), "primary")])
\`\`\``;

export interface GenerateUiResult {
  title: string;
  code: string;
  raw: string;
  validation: "ok" | "warn";
  lintSummary?: string;
  /** Where the final code came from — helps debug model vs local synthesis. */
  origin: "local" | "llm" | "fallback";
}

function packResult(
  prompt: string,
  code: string,
  raw: string,
  origin: GenerateUiResult["origin"],
): GenerateUiResult {
  const lint = lintOpenUICode(code);
  return {
    title: titleFromPrompt(prompt),
    code,
    raw,
    origin,
    validation: lint.ok ? "ok" : "warn",
    ...(lint.ok ? {} : { lintSummary: lint.summary }),
  };
}

async function tryLlmGenerate(prompt: string, signal?: AbortSignal): Promise<{ code: string; raw: string } | null> {
  const settings = loadSettings();
  if (settings.provider === "mock") return null;

  try {
    const turn = await streamTurn({
      settings,
      messages: [
        { role: "system", content: GENERATOR_LLM_SYSTEM },
        { role: "user", content: prompt },
      ],
      tools: [],
      onTextDelta: () => {},
      signal,
    });
    const raw = turn.text.trim();
    if (!raw) return null;
    const code = extractOpenUiCode(raw);
    if (!code || !/\broot\s*=/.test(code)) return null;
    return { code, raw };
  } catch {
    return null;
  }
}

export async function generateUiFromPrompt(prompt: string, signal?: AbortSignal): Promise<GenerateUiResult> {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error("prompt is required");

  const local = tryLocalUiGenerate(trimmed);
  if (local) {
    return packResult(trimmed, local.code, `\`\`\`openui-lang\n${local.code}\n\`\`\``, "local");
  }

  const llm = await tryLlmGenerate(trimmed, signal);
  if (llm) {
    return packResult(trimmed, llm.code, llm.raw, "llm");
  }

  const fallback = fallbackLocalUiGenerate(trimmed);
  return packResult(
    trimmed,
    fallback.code,
    `\`\`\`openui-lang\n${fallback.code}\n\`\`\``,
    "fallback",
  );
}
