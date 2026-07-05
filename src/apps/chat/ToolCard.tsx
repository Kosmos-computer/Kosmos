/**
 * Per-tool-type visualizers — the agent-canvas lesson: typed cards per tool
 * beat one generic JSON dump. Each card gets a headline that reads like a
 * sentence, and expands to raw input/output for debugging.
 */
import { useState } from "react";
import {
  AppWindow,
  CalendarClock,
  ChevronRight,
  Database,
  FileText,
  Globe,
  MonitorUp,
  SquareTerminal,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ChatItem } from "./useChat";
import { useOsStore } from "../../os/osStore";
import { useWindowStore } from "../../os/windowStore";

type ToolItem = Extract<ChatItem, { kind: "tool" }>;

interface Visual {
  icon: LucideIcon;
  headline: string;
  detail?: string;
  status: "running" | "ok" | "error";
}

function parseResult(item: ToolItem): Record<string, unknown> | null {
  if (!item.result) return null;
  try {
    const parsed = JSON.parse(item.result) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function describe(item: ToolItem): Visual {
  const result = parseResult(item);
  const failed = Boolean(result && (result.error || result.validationErrors));
  const status: Visual["status"] = !item.result ? "running" : failed ? "error" : "ok";
  const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

  switch (item.name) {
    case "app_create":
      return {
        icon: AppWindow,
        headline: item.result
          ? `Created app “${str(item.args.title, "Untitled")}”`
          : `Creating app “${str(item.args.title, "Untitled")}”…`,
        detail: result?.validationErrors ? "saved with lint findings — patching" : undefined,
        status,
      };
    case "app_update":
      return {
        icon: AppWindow,
        headline: item.result ? "Updated app" : "Updating app…",
        detail: result?.validationErrors ? "saved with lint findings — patching" : undefined,
        status,
      };
    case "get_app":
      return { icon: AppWindow, headline: "Read app code", status };
    case "list_apps":
      return { icon: AppWindow, headline: "Listed apps", status };
    case "exec":
      return {
        icon: SquareTerminal,
        headline: str(item.args.command, "shell command"),
        status,
      };
    case "read_file":
      return { icon: FileText, headline: `Read ${str(item.args.path, "file")}`, status };
    case "write_file":
      return { icon: FileText, headline: `Wrote ${str(item.args.path, "file")}`, status };
    case "list_files":
      return { icon: FileText, headline: `Listed ${str(item.args.path, "workspace")}`, status };
    case "db_query":
    case "db_execute":
      return {
        icon: Database,
        headline: str(item.args.sql, "SQL").slice(0, 90),
        detail: item.args.namespace ? `db: ${str(item.args.namespace)}` : undefined,
        status,
      };
    case "http_fetch":
      return { icon: Globe, headline: `Fetched ${str(item.args.url, "URL")}`, status };
    case "create_automation":
      return {
        icon: CalendarClock,
        headline: `Scheduled “${str(item.args.name, "automation")}” (${str(item.args.schedule)})`,
        status,
      };
    case "update_automation":
    case "delete_automation":
    case "list_automations":
      return { icon: CalendarClock, headline: item.name.replace("_", " "), status };
    case "os_ui":
      return { icon: MonitorUp, headline: `Shell: ${str(item.args.action, "action")}`, status };
    default:
      return { icon: Wrench, headline: item.name, status };
  }
}

function prettify(value: string | undefined): string {
  if (!value) return "—";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function ToolCard({ item }: { item: ToolItem }) {
  const [open, setOpen] = useState(false);
  const visual = describe(item);
  const Icon = visual.icon;
  const openWindow = useWindowStore((s) => s.open);
  const apps = useOsStore((s) => s.apps);

  const result = parseResult(item);
  const createdAppId =
    (item.name === "app_create" || item.name === "app_update") && typeof result?.id === "string"
      ? result.id
      : null;

  return (
    <div className={`arco-toolcard arco-toolcard--${visual.status}`}>
      <button
        className="arco-toolcard__row"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={`arco-toolcard__status arco-toolcard__status--${visual.status}`} />
        <Icon size={13} style={{ flexShrink: 0 }} />
        <span className="arco-toolcard__headline">{visual.headline}</span>
        {visual.detail && <span className="arco-toolcard__detail">{visual.detail}</span>}
        {createdAppId && (
          <span
            role="button"
            tabIndex={0}
            className="arco-toolcard__open"
            onClick={(e) => {
              e.stopPropagation();
              const app = apps.find((a) => a.id === createdAppId);
              openWindow({ type: "generated", appId: createdAppId }, app?.title ?? "App");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                const app = apps.find((a) => a.id === createdAppId);
                openWindow({ type: "generated", appId: createdAppId }, app?.title ?? "App");
              }
            }}
          >
            Open
          </span>
        )}
        <ChevronRight
          size={12}
          className="arco-toolcard__chevron"
          style={{ transform: open ? "rotate(90deg)" : undefined }}
        />
      </button>
      {open && (
        <div className="arco-toolcard__body">
          <div className="arco-label">Input</div>
          <pre className="arco-toolcard__pre">{JSON.stringify(item.args, null, 2)}</pre>
          <div className="arco-label">Output</div>
          <pre className="arco-toolcard__pre">
            {item.result ? prettify(item.result) : "Running…"}
          </pre>
        </div>
      )}
    </div>
  );
}
