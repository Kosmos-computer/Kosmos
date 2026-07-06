import type { BentoItem, BentoWidgetTemplate } from "./types";

/** Widget templates available in the bento add/remove menu. */
export const BENTO_WIDGET_CATALOG: BentoWidgetTemplate[] = [
  {
    templateId: "apps",
    label: "Apps",
    colSpan: 6,
    rowSpan: 4,
    content: { kind: "stat", liveKey: "apps", tone: "accent", percent: 72 },
  },
  {
    templateId: "sessions",
    label: "Sessions",
    colSpan: 6,
    rowSpan: 4,
    content: { kind: "kpi", liveKey: "sessions" },
  },
  {
    templateId: "automations",
    label: "Automations",
    colSpan: 6,
    rowSpan: 3,
    content: { kind: "kpi", liveKey: "automations" },
  },
  {
    templateId: "agent",
    label: "Agent status",
    colSpan: 6,
    rowSpan: 3,
    content: { kind: "kpi", liveKey: "agent" },
  },
  {
    templateId: "clock",
    label: "Clock",
    colSpan: 4,
    rowSpan: 4,
    content: { kind: "clock", liveKey: "clock" },
  },
  {
    templateId: "insight",
    label: "Insight",
    colSpan: 6,
    rowSpan: 4,
    content: {
      kind: "insight",
      title: "Dock your essentials",
      description: "Pin live widgets here to monitor Arco without opening full apps.",
    },
  },
  {
    templateId: "weather",
    label: "Live weather",
    colSpan: 6,
    rowSpan: 5,
    content: { kind: "weather", label: "Live weather" },
  },
  {
    templateId: "recent-apps",
    label: "Recent apps",
    colSpan: 8,
    rowSpan: 5,
    content: {
      kind: "list",
      label: "Recent apps",
      items: [
        { label: "Chat", value: "Active", change: "Now", direction: "up" },
        { label: "Studio", value: "2h ago", change: "+1 session", direction: "up" },
        { label: "Files", value: "Yesterday", change: "3 edits", direction: "up" },
      ],
    },
  },
];

/** Default starter layout for the bento drawer. */
export const BENTO_DEFAULT_ITEMS: BentoItem[] = [
  {
    id: "apps-1",
    templateId: "apps",
    label: "Apps",
    col: 1,
    row: 1,
    colSpan: 6,
    rowSpan: 4,
    content: BENTO_WIDGET_CATALOG[0].content,
  },
  {
    id: "sessions-1",
    templateId: "sessions",
    label: "Sessions",
    col: 7,
    row: 1,
    colSpan: 6,
    rowSpan: 4,
    content: BENTO_WIDGET_CATALOG[1].content,
  },
  {
    id: "clock-1",
    templateId: "clock",
    label: "Clock",
    col: 1,
    row: 5,
    colSpan: 4,
    rowSpan: 4,
    content: BENTO_WIDGET_CATALOG[4].content,
  },
  {
    id: "agent-1",
    templateId: "agent",
    label: "Agent status",
    col: 5,
    row: 5,
    colSpan: 8,
    rowSpan: 3,
    content: BENTO_WIDGET_CATALOG[3].content,
  },
  {
    id: "weather-1",
    templateId: "weather",
    label: "Live weather",
    col: 5,
    row: 8,
    colSpan: 8,
    rowSpan: 5,
    content: BENTO_WIDGET_CATALOG[6].content,
  },
];
