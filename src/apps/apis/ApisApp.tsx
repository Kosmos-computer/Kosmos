/**
 * APIs — saved integrations and a marketplace catalog. Mirrors the
 * Longformer Plugins view and Arco's Skills dashboard: search, tab filter
 * (Installed vs Marketplace), card grid, and a detail overlay with install.
 */
import { useMemo, useState } from "react";
import { ExternalLink, Plus, Star, Trash2, X } from "lucide-react";
import {
  ModuleCardGrid,
  ModuleHeader,
  ModuleInner,
  ModulePage,
  ModuleToolbar,
} from "../../components/patterns/ModuleDashboard";
import { Button, Chip, EmptyState } from "../../components/ui";
import { appIcon } from "../appview/appIcon";
import { filterApis } from "./apisFilters";
import type { ApiCatalogTab, ApiIntegration } from "./types";
import { useApisStub } from "./useApisStub";

const TAB_FILTERS: { id: ApiCatalogTab; label: string }[] = [
  { id: "installed", label: "Installed" },
  { id: "marketplace", label: "Marketplace" },
];

function ApiCard({ api, onOpen }: { api: ApiIntegration; onOpen: () => void }) {
  const Icon = appIcon(api.icon);

  return (
    <button type="button" className="arco-module-card" onClick={onOpen}>
      <div className="arco-module-card__head">
        <span className="arco-module-card__icon" aria-hidden="true">
          <Icon size={16} />
        </span>
        <div className="arco-module-card__body">
          <h3 className="arco-module-card__title">{api.name}</h3>
          <div className="arco-module-card__meta">
            {api.author}
            {api.version ? ` · v${api.version}` : ""}
          </div>
        </div>
      </div>
      <p className="arco-module-card__desc">{api.description}</p>
      <div className="arco-module-card__pills">
        <span className="arco-module-card__pill">{api.category}</span>
        {typeof api.rating === "number" ? (
          <span className="arco-module-card__pill">
            <Star size={10} style={{ verticalAlign: "-1px" }} /> {api.rating.toFixed(1)}
          </span>
        ) : null}
        {api.installed ? (
          <span className="arco-module-card__pill">Installed</span>
        ) : null}
      </div>
    </button>
  );
}

function ApiDetailOverlay({
  api,
  onClose,
  onInstall,
  onUninstall,
}: {
  api: ApiIntegration;
  onClose: () => void;
  onInstall: () => void;
  onUninstall: () => void;
}) {
  const Icon = appIcon(api.icon);

  return (
    <div className="arco-module-overlay" role="presentation" onClick={onClose}>
      <div
        className="arco-module-overlay__panel"
        role="dialog"
        aria-label={api.name}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="arco-module-overlay__head">
          <div className="arco-module__headcopy">
            <h2 className="arco-module__title">{api.name}</h2>
            <p className="arco-module__subtitle">
              {api.author}
              {api.version ? ` · v${api.version}` : ""} · {api.category}
            </p>
          </div>
          <div className="arco-module-card__actions">
            <Button size="icon" onClick={onClose} aria-label="Close">
              <X size={14} />
            </Button>
          </div>
        </div>

        <div className="arco-module-card__head">
          <span className="arco-module-card__icon" aria-hidden="true">
            <Icon size={18} />
          </span>
          <div className="arco-module-card__body">
            {typeof api.rating === "number" ? (
              <div className="arco-module-card__meta">
                <Star size={12} style={{ verticalAlign: "-2px" }} /> {api.rating.toFixed(1)} rating
              </div>
            ) : null}
          </div>
        </div>

        <p className="arco-module-card__desc">{api.description}</p>

        <div className="arco-module-card__actions">
          {api.installed ? (
            <>
              <Button disabled>
                Installed
              </Button>
              <Button variant="danger" onClick={onUninstall}>
                <Trash2 size={13} /> Remove
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={onInstall}>
              <Plus size={13} /> Install
            </Button>
          )}
          {api.docsUrl ? (
            <Button
              onClick={() => window.open(api.docsUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink size={13} /> Docs
            </Button>
          ) : null}
        </div>

        <p className="arco-module__subtitle">
          Installing from the marketplace will pre-fill MCP server settings and request any keys
          from Key Wallet.
        </p>
      </div>
    </div>
  );
}

export function ApisApp() {
  const { apis, selected, select, install, uninstall, installedCount } = useApisStub();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<ApiCatalogTab>("installed");

  const filtered = useMemo(() => filterApis(apis, search, tab), [apis, search, tab]);

  const emptyTitle =
    tab === "installed" ? "No APIs installed" : "No marketplace matches";
  const emptyBody =
    tab === "installed"
      ? "Browse the marketplace to add MCP servers and REST connectors."
      : "Try a different search term or check back as the catalog grows.";

  return (
    <ModulePage>
      <ModuleInner>
        <ModuleHeader
          title="APIs"
          subtitle="Saved integrations and a curated marketplace of MCP servers, REST connectors, and third-party tools. Installed APIs expose tools to the agent and may require keys from Key Wallet."
          actions={
            tab === "marketplace" ? (
              <Button onClick={() => setTab("installed")}>View installed ({installedCount})</Button>
            ) : (
              <Button onClick={() => setTab("marketplace")}>
                <Plus size={13} /> Browse marketplace
              </Button>
            )
          }
        />

        <ModuleToolbar search={search} onSearchChange={setSearch} searchLabel="Search APIs">
          <div className="arco-chip-row" role="group" aria-label="API catalog tab">
            {TAB_FILTERS.map((entry) => (
              <Chip
                key={entry.id}
                active={tab === entry.id}
                aria-pressed={tab === entry.id}
                onClick={() => setTab(entry.id)}
              >
                {entry.label}
                {entry.id === "installed" ? ` (${installedCount})` : ""}
              </Chip>
            ))}
          </div>
        </ModuleToolbar>

        {filtered.length === 0 ? (
          <EmptyState title={emptyTitle}>{emptyBody}</EmptyState>
        ) : (
          <ModuleCardGrid>
            {filtered.map((api) => (
              <ApiCard key={api.id} api={api} onOpen={() => select(api.id)} />
            ))}
          </ModuleCardGrid>
        )}
      </ModuleInner>

      {selected ? (
        <ApiDetailOverlay
          api={selected}
          onClose={() => select(null)}
          onInstall={() => install(selected.id)}
          onUninstall={() => uninstall(selected.id)}
        />
      ) : null}
    </ModulePage>
  );
}
