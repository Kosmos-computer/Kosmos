import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
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
          <span className="arco-module-card__pill"><T k={I18nKey.APPS$APIS_INSTALLED} /></span>
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
            <Button size="icon" onClick={onClose} aria-label={i18n.t(I18nKey.COMMON$CLOSE)}>
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
                <Star size={12} style={{ verticalAlign: "-2px" }} /> {api.rating.toFixed(1)}<T k={I18nKey.APPS$APIS_RATING} /></div>
            ) : null}
          </div>
        </div>

        <p className="arco-module-card__desc">{api.description}</p>

        <div className="arco-module-card__actions">
          {api.installed ? (
            <>
              <Button disabled><T k={I18nKey.APPS$APIS_INSTALLED} /></Button>
              <Button variant="danger" onClick={onUninstall}>
                <Trash2 size={13} /><T k={I18nKey.COMMON$REMOVE} /></Button>
            </>
          ) : (
            <Button variant="primary" onClick={onInstall}>
              <Plus size={13} /><T k={I18nKey.COMMON$INSTALL} /></Button>
          )}
          {api.docsUrl ? (
            <Button
              onClick={() => window.open(api.docsUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink size={13} /><T k={I18nKey.APPS$APIS_DOCS} /></Button>
          ) : null}
        </div>

        <p className="arco-module__subtitle"><T k={I18nKey.APPS$APIS_INSTALLING_FROM_THE_MARKETPLACE_WILL_PRE_FILL_MCP_SERVER} /></p>
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
          title={i18n.t(I18nKey.OS$APP_APIS)}
          subtitle={i18n.t(I18nKey.APPS$APIS_SAVED_INTEGRATIONS_AND_A_CURATED_MARKETPLACE_OF_MCP_SERV)}
          actions={
            tab === "marketplace" ? (
              <Button onClick={() => setTab("installed")}><T k={I18nKey.APPS$APIS_VIEW_INSTALLED} />{installedCount})</Button>
            ) : (
              <Button onClick={() => setTab("marketplace")}>
                <Plus size={13} /><T k={I18nKey.APPS$APIS_BROWSE_MARKETPLACE} /></Button>
            )
          }
        />

        <ModuleToolbar search={search} onSearchChange={setSearch} searchLabel={i18n.t(I18nKey.APPS$APIS_SEARCH_APIS)}>
          <div className="arco-chip-row" role="group" aria-label={i18n.t(I18nKey.APPS$APIS_API_CATALOG_TAB)}>
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
