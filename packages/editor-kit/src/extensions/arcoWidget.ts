import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { WidgetNodeView } from "../WidgetNodeView";

/** Embedded content widget — payload lives in node attrs, rendered read-only. */
export const ArcoWidget = Node.create({
  name: "arcoWidget",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      widgetType: { default: "metric" },
      version: { default: 1 },
      props: { default: {} },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-arco-widget="true"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-arco-widget": "true" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WidgetNodeView);
  },
});
