import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import type { Editor, Range } from "@tiptap/core";
import { SlashMenu, type SlashMenuItem, type SlashMenuRef } from "../SlashMenu";

const SLASH_ITEMS: SlashMenuItem[] = [
  {
    id: "paragraph",
    label: "Paragraph",
    hint: "Plain text",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    id: "heading1",
    label: "Heading 1",
    hint: "Large section title",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    id: "heading2",
    label: "Heading 2",
    hint: "Medium section title",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    id: "heading3",
    label: "Heading 3",
    hint: "Small section title",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    id: "bulletList",
    label: "Bullet list",
    hint: "Unordered list",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    id: "orderedList",
    label: "Numbered list",
    hint: "Ordered list",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    id: "blockquote",
    label: "Quote",
    hint: "Callout or citation",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    id: "codeBlock",
    label: "Code block",
    hint: "Monospace snippet",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    id: "divider",
    label: "Divider",
    hint: "Horizontal rule",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
];

function positionPopup(popup: HTMLElement, clientRect?: (() => DOMRect | null) | null) {
  const rect = clientRect?.();
  if (!rect) return;
  popup.style.position = "fixed";
  popup.style.left = `${rect.left}px`;
  popup.style.top = `${rect.bottom + 6}px`;
  popup.style.zIndex = "3000";
}

const suggestionOptions: Omit<SuggestionOptions<SlashMenuItem>, "editor"> = {
  char: "/",
  startOfLine: false,
  allowSpaces: false,
  items: ({ query }) =>
    SLASH_ITEMS.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
  command: ({ editor, range, props }) => {
    props.command({ editor, range });
  },
  render: () => {
    let component: ReactRenderer<SlashMenuRef> | null = null;
    let popup: HTMLDivElement | null = null;

    return {
      onStart: (props) => {
        component = new ReactRenderer(SlashMenu, {
          props,
          editor: props.editor,
        });
        popup = document.createElement("div");
        popup.className = "ek-slash-menu-host";
        document.body.appendChild(popup);
        popup.appendChild(component.element);
        positionPopup(popup, props.clientRect);
      },
      onUpdate: (props) => {
        component?.updateProps(props);
        if (popup) positionPopup(popup, props.clientRect);
      },
      onKeyDown: (props) => {
        if (props.event.key === "Escape") {
          popup?.remove();
          component?.destroy();
          popup = null;
          component = null;
          return true;
        }
        return component?.ref?.onKeyDown(props) ?? false;
      },
      onExit: () => {
        popup?.remove();
        component?.destroy();
        popup = null;
        component = null;
      },
    };
  },
};

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: suggestionOptions,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export type SlashCommandPayload = { editor: Editor; range: Range };
