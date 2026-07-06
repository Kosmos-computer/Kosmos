import type { JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import type { Extensions } from "@tiptap/core";
import { ArcoWidget } from "./extensions/arcoWidget";
import { SlashCommand } from "./extensions/slashCommand";

export interface CreateEditorExtensionsOptions {
  placeholder?: string;
  /** Embed arcoWidget nodes — Docs and agent-authored content. Default true. */
  widgets?: boolean;
  /** Type `/` for block insertion menu. Default true. */
  slashCommands?: boolean;
}

export function createEditorExtensions(options: CreateEditorExtensionsOptions = {}): Extensions {
  const {
    placeholder = "Start writing…",
    widgets = true,
    slashCommands = true,
  } = options;

  const extensions: Extensions = [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Placeholder.configure({ placeholder }),
    Underline,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
  ];

  if (widgets) extensions.push(ArcoWidget);
  if (slashCommands) extensions.push(SlashCommand);

  return extensions;
}

export const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
