import { useMemo } from "react";
import { Plus } from "lucide-react";
import type { McpServerInfo } from "@shared/types";
import { primeComposer } from "../chat/composerBus";
import { useWindowStore } from "../../os/windowStore";
import { ModuleSection } from "../../components/patterns/ModuleDashboard";
import {
  AUTOMATION_CATALOG,
  PROVEN_AUTOMATION_IDS,
  type RecommendedAutomation,
} from "./catalog";

function matchesQuery(automation: RecommendedAutomation, query: string, installed: McpServerInfo[]): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [
    automation.name,
    automation.category,
    automation.description,
    automation.prompt,
    ...automation.requiredMcpServerIds,
    ...installed.filter((s) => automation.requiredMcpServerIds.includes(s.config.id)).map((s) => s.config.name),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalized);
}

function missingMcpCount(automation: RecommendedAutomation, installed: McpServerInfo[]): number {
  const enabledIds = new Set(installed.filter((s) => s.config.enabled).map((s) => s.config.id));
  return automation.requiredMcpServerIds.filter((id) => !enabledIds.has(id)).length;
}

export function RecommendedAutomationsSection({
  query,
  mcpServers,
}: {
  query: string;
  mcpServers: McpServerInfo[];
}) {
  const visible = useMemo(
    () => AUTOMATION_CATALOG.filter((automation) => matchesQuery(automation, query, mcpServers)),
    [query, mcpServers],
  );

  if (visible.length === 0) return null;

  const proven = visible.filter((a) => (PROVEN_AUTOMATION_IDS as readonly string[]).includes(a.id));
  const beta = visible.filter((a) => !(PROVEN_AUTOMATION_IDS as readonly string[]).includes(a.id));

  const launch = (automation: RecommendedAutomation) => {
    const missing = missingMcpCount(automation, mcpServers);
    const prefix =
      missing > 0
        ? `First help me enable these MCP servers: ${automation.requiredMcpServerIds.join(", ")}. Then `
        : "";
    useWindowStore.getState().open({ type: "system", app: "chat" }, "Chat");
    primeComposer({ text: `${prefix}${automation.prompt}`, submit: false });
  };

  return (
    <>
      {proven.length > 0 ? (
        <ModuleSection title="Recommended" count={proven.length}>
          <div className="arco-module__grid">
            {proven.map((automation) => (
              <RecommendedCard
                key={automation.id}
                automation={automation}
                missing={missingMcpCount(automation, mcpServers)}
                onLaunch={() => launch(automation)}
              />
            ))}
          </div>
        </ModuleSection>
      ) : null}
      {beta.length > 0 ? (
        <ModuleSection title="Beta" count={beta.length}>
          <div className="arco-module__grid">
            {beta.map((automation) => (
              <RecommendedCard
                key={automation.id}
                automation={automation}
                missing={missingMcpCount(automation, mcpServers)}
                onLaunch={() => launch(automation)}
              />
            ))}
          </div>
        </ModuleSection>
      ) : null}
    </>
  );
}

function RecommendedCard({
  automation,
  missing,
  onLaunch,
}: {
  automation: RecommendedAutomation;
  missing: number;
  onLaunch: () => void;
}) {
  return (
    <button type="button" className="arco-module-card" onClick={onLaunch}>
      <div className="arco-module-card__head">
        <span className="arco-module-card__icon" aria-hidden="true">
          <Plus size={16} />
        </span>
        <div className="arco-module-card__body">
          <h3 className="arco-module-card__title">{automation.name}</h3>
          <div className="arco-module-card__meta">{automation.category}</div>
        </div>
      </div>
      <p className="arco-module-card__desc">{automation.description}</p>
      <div className="arco-module-card__pills">
        {missing > 0 ? (
          <span className="arco-module-card__pill">{missing} MCP server(s) to connect</span>
        ) : (
          <span className="arco-module-card__pill">Ready to launch</span>
        )}
      </div>
    </button>
  );
}
