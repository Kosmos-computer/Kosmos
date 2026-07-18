/**
 * Named toolsets — Hermes-style composer chips that scope which tools the
 * model may call this turn. "all" means no filter (default).
 *
 * Membership is by tool name. Tools not listed in any active toolset are
 * dropped after assembleTools (same posture as readOnly filtering).
 */
export interface ToolsetDef {
  id: string;
  label: string;
  description: string;
  /** Tool names included when this set is active. */
  tools: string[];
}

/**
 * Curated subsets. Overlaps are fine — union of active sets is used.
 * Keep ids stable; composer chips and RunTurnOptions.toolsetIds reference them.
 */
export const TOOLSETS: ToolsetDef[] = [
  {
    id: "core",
    label: "Core",
    description: "Files, web, skills, memory, shell navigation",
    tools: [
      "read_file",
      "write_file",
      "list_files",
      "web_search",
      "http_fetch",
      "read_skill",
      "save_skill",
      "patch_skill",
      "memory_read",
      "memory_write",
      "memory_search",
      "session_search",
      "os_ui",
      "list_apps",
    ],
  },
  {
    id: "coding",
    label: "Coding",
    description: "Exec, files, DB, delegate",
    tools: [
      "exec",
      "read_file",
      "write_file",
      "list_files",
      "delegate_task",
      "db_query",
      "db_execute",
      "read_skill",
    ],
  },
  {
    id: "memory",
    label: "Memory",
    description: "Memory + session transcript search",
    tools: [
      "memory_read",
      "memory_write",
      "memory_search",
      "session_search",
      "read_skill",
      "save_skill",
      "patch_skill",
    ],
  },
  {
    id: "apps",
    label: "Apps",
    description: "OpenUI app authoring and shell",
    tools: [
      "app_create",
      "app_update",
      "get_app",
      "list_apps",
      "os_ui",
      "ui_snapshot",
      "mouse_click",
      "type_text",
      "select_option",
      "generator_catalog_add",
      "read_skill",
    ],
  },
  {
    id: "automations",
    label: "Automations",
    description: "Cron / webhook automation CRUD",
    tools: [
      "list_automations",
      "create_automation",
      "update_automation",
      "delete_automation",
      "run_automation",
    ],
  },
];

/** Default composer selection — broad but not "every tool including torrents". */
export const DEFAULT_TOOLSET_IDS: string[] = ["core", "coding", "memory", "apps"];

export function toolsetById(id: string): ToolsetDef | undefined {
  return TOOLSETS.find((t) => t.id === id);
}

/** Union of tool names for the given toolset ids. Empty / missing → null (no filter). */
export function resolveToolsetAllowlist(toolsetIds: string[] | undefined): Set<string> | null {
  if (!toolsetIds || toolsetIds.length === 0) return null;
  if (toolsetIds.includes("all")) return null;
  const names = new Set<string>();
  for (const id of toolsetIds) {
    const set = toolsetById(id);
    if (!set) continue;
    for (const name of set.tools) names.add(name);
  }
  return names.size > 0 ? names : null;
}
