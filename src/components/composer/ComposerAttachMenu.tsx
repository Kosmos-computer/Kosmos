import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * ComposerAttachMenu — the "+" popover: attach actions, slash commands,
 * connectors submenu (with enable toggles), plugins, and optional workspace
 * panel switches. Uses shared .arco-menu panel styles directly (rather than
 * <Menu>) because the panel mixes dismiss-on-select rows with non-dismissing
 * switch rows and a nested flyout.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  CircleDashed,
  Folder,
  LayoutGrid,
  Paperclip,
  Plus,
  Plug,
  Settings2,
  SquareSlash,
} from "lucide-react";
import { useDismiss } from "../useDismiss";

export interface ComposerPanelToggle {
  id: string;
  label: string;
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
}

export interface ComposerConnector {
  id: string;
  label: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export interface ComposerAttachMenuProps {
  onAddFile?: () => void;
  onAddFolder?: () => void;
  onImportGitHubIssue?: () => void;
  onSlashCommands?: () => void;
  onAddPlugins?: () => void;
  onManageConnectors?: () => void;
  onBrowseConnectors?: () => void;
  /** Installed connectors shown as toggles in the Connectors flyout. */
  connectors?: ComposerConnector[];
  panelToggles?: ComposerPanelToggle[];
  disabled?: boolean;
}

/** Default stub connectors when the host app has not wired real ones yet. */
const STUB_CONNECTORS: Omit<ComposerConnector, "onEnabledChange">[] = [
  { id: "google-drive", label: "Google Drive", enabled: true },
  { id: "browser", label: "Claude in Chrome", enabled: true },
];

export function ComposerAttachMenu({
  onAddFile,
  onAddFolder,
  onImportGitHubIssue,
  onSlashCommands,
  onAddPlugins,
  onManageConnectors,
  onBrowseConnectors,
  connectors: connectorsProp,
  panelToggles,
  disabled,
}: ComposerAttachMenuProps) {
  const [open, setOpen] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [stubEnabled, setStubEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(STUB_CONNECTORS.map((c) => [c.id, c.enabled])),
  );
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setConnectorsOpen(false);
  }, []);

  useDismiss(open, close, rootRef);

  useEffect(() => {
    if (!open) setConnectorsOpen(false);
  }, [open]);

  const fileShortcut =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘U" : "Ctrl+U";

  // Hosts that wire MCP pass `connectors` (even `[]`); only fall back to stubs
  // when the prop is omitted entirely.
  const connectors: ComposerConnector[] =
    connectorsProp !== undefined
      ? connectorsProp
      : STUB_CONNECTORS.map((c) => ({
          ...c,
          enabled: stubEnabled[c.id] ?? c.enabled,
          onEnabledChange: (enabled: boolean) => {
            setStubEnabled((prev) => ({ ...prev, [c.id]: enabled }));
          },
        }));

  function runAndClose(action?: () => void) {
    action?.();
    close();
  }

  return (
    <div className="arco-menu" ref={rootRef}>
      <button
        type="button"
        className="arco-btn arco-btn--ghost arco-btn--icon"
        aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_ADD_OR_ATTACH)}
        title={i18n.t(I18nKey.COMPONENTS$COMPOSER_ADD_OR_ATTACH)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <Plus size={15} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_ATTACH_AND_PANELS)}
          className="arco-menu__panel arco-menu__panel--top arco-menu__panel--start arco-attach__panel"
        >
          <button
            type="button"
            role="menuitem"
            className="arco-menu__item"
            onClick={() => runAndClose(onAddFile)}
          >
            <span className="arco-menu__icon" aria-hidden="true">
              <Paperclip size={14} />
            </span>
            <span className="arco-menu__itemlabel">
              <T k={I18nKey.COMPONENTS$COMPOSER_ADD_FILES_OR_PHOTOS} />
            </span>
            <span className="arco-menu__shortcut" aria-hidden="true">
              {fileShortcut}
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="arco-menu__item"
            onClick={() => runAndClose(onAddFolder)}
          >
            <span className="arco-menu__icon" aria-hidden="true">
              <Folder size={14} />
            </span>
            <span className="arco-menu__itemlabel">
              <T k={I18nKey.COMPONENTS$COMPOSER_ADD_FOLDER} />
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="arco-menu__item"
            onClick={() => runAndClose(onImportGitHubIssue)}
          >
            <span className="arco-menu__icon" aria-hidden="true">
              <CircleDashed size={14} />
            </span>
            <span className="arco-menu__itemlabel">
              <T k={I18nKey.COMPONENTS$COMPOSER_IMPORT_GITHUB_ISSUE} />
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="arco-menu__item"
            onClick={() => runAndClose(onSlashCommands)}
          >
            <span className="arco-menu__icon" aria-hidden="true">
              <SquareSlash size={14} />
            </span>
            <span className="arco-menu__itemlabel">
              <T k={I18nKey.COMPONENTS$COMPOSER_SLASH_COMMANDS} />
            </span>
          </button>

          <div
            className="arco-attach__submenu"
            onMouseLeave={() => setConnectorsOpen(false)}
          >
            <button
              type="button"
              role="menuitem"
              className={`arco-menu__item${connectorsOpen ? " arco-menu__item--active" : ""}`}
              aria-haspopup="menu"
              aria-expanded={connectorsOpen}
              onMouseEnter={() => setConnectorsOpen(true)}
              onFocus={() => setConnectorsOpen(true)}
              onClick={() => setConnectorsOpen((v) => !v)}
            >
              <span className="arco-menu__icon" aria-hidden="true">
                <LayoutGrid size={14} />
              </span>
              <span className="arco-menu__itemlabel">
                <T k={I18nKey.COMPONENTS$COMPOSER_CONNECTORS} />
              </span>
              <span className="arco-menu__chevron" aria-hidden="true">
                <ChevronRight size={14} />
              </span>
            </button>

            {connectorsOpen && (
              <div
                role="menu"
                aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_CONNECTORS)}
                className="arco-menu__panel arco-attach__flyout"
                onMouseEnter={() => setConnectorsOpen(true)}
              >
                {connectors.length === 0 ? (
                  <div className="arco-menu__empty">No connectors installed</div>
                ) : (
                  connectors.map((connector) => (
                    <label key={connector.id} className="arco-attach__togglerow">
                      <span className="arco-menu__icon" aria-hidden="true">
                        <LayoutGrid size={14} />
                      </span>
                      <span className="arco-attach__togglelabel">{connector.label}</span>
                      <span className="arco-switch">
                        <input
                          type="checkbox"
                          checked={connector.enabled}
                          onChange={(e) => connector.onEnabledChange(e.target.checked)}
                          aria-label={connector.label}
                        />
                        <span className="arco-switch__track" />
                      </span>
                    </label>
                  ))
                )}

                <div className="arco-menu__separator" role="separator" />

                <button
                  type="button"
                  role="menuitem"
                  className="arco-menu__item"
                  onClick={() => runAndClose(onManageConnectors)}
                >
                  <span className="arco-menu__icon" aria-hidden="true">
                    <Settings2 size={14} />
                  </span>
                  <span className="arco-menu__itemlabel">
                    <T k={I18nKey.COMPONENTS$COMPOSER_MANAGE_CONNECTORS} />
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  className="arco-menu__item"
                  onClick={() => runAndClose(onBrowseConnectors)}
                >
                  <span className="arco-menu__icon" aria-hidden="true">
                    <Plus size={14} />
                  </span>
                  <span className="arco-menu__itemlabel">
                    <T k={I18nKey.COMPONENTS$COMPOSER_BROWSE_CONNECTORS} />
                  </span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            role="menuitem"
            className="arco-menu__item"
            onClick={() => runAndClose(onAddPlugins)}
          >
            <span className="arco-menu__icon" aria-hidden="true">
              <Plug size={14} />
            </span>
            <span className="arco-menu__itemlabel">
              <T k={I18nKey.COMPONENTS$COMPOSER_ADD_PLUGINS} />
            </span>
          </button>

          {panelToggles && panelToggles.length > 0 && (
            <>
              <div className="arco-menu__separator" role="separator" />
              <div className="arco-menu__sectionlabel">
                <T k={I18nKey.COMPONENTS$COMPOSER_PANELS} />
              </div>
              {panelToggles.map((toggle) => (
                <label key={toggle.id} className="arco-attach__togglerow">
                  <span className="arco-attach__togglelabel">{toggle.label}</span>
                  <span className="arco-switch">
                    <input
                      type="checkbox"
                      checked={toggle.visible}
                      onChange={(e) => toggle.onVisibleChange(e.target.checked)}
                      aria-label={toggle.label}
                    />
                    <span className="arco-switch__track" />
                  </span>
                </label>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
