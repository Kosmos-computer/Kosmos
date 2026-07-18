import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * ComposerAttachMenu — the "+" popover: attach actions, slash commands,
 * connectors / tools / agent flyouts, plugins, and composer chrome toggles
 * (emoji picker / rich-text toolbar). Uses shared .arco-menu panel styles
 * directly (rather than <Menu>) because the panel mixes dismiss-on-select
 * rows with non-dismissing switch rows and nested flyouts.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  ChevronRight,
  CircleDashed,
  Folder,
  LayoutGrid,
  Paperclip,
  Pilcrow,
  Plus,
  Plug,
  Settings2,
  Smile,
  SquareSlash,
  Wrench,
} from "lucide-react";
import { useDismiss } from "../useDismiss";
import type { MenuItem } from "../Menu";
import { TOOLSETS } from "./toolsets";

export interface ComposerConnector {
  id: string;
  label: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

type AttachFlyout = "connectors" | "tools" | "agent" | null;

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
  /** Active toolset ids (multi-select). Hidden when unset. */
  toolsetIds?: string[];
  onToolsetIdsChange?: (ids: string[]) => void;
  /** Active agent profile label + menu. */
  agent?: string;
  agentItems?: MenuItem[];
  /** Show the emoji picker control in the composer row. */
  emojiVisible?: boolean;
  onEmojiVisibleChange?: (visible: boolean) => void;
  /** Show the rich-text formatting toolbar above the textarea. */
  richTextVisible?: boolean;
  onRichTextVisibleChange?: (visible: boolean) => void;
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
  toolsetIds,
  onToolsetIdsChange,
  agent,
  agentItems,
  emojiVisible = false,
  onEmojiVisibleChange,
  richTextVisible = false,
  onRichTextVisibleChange,
  disabled,
}: ComposerAttachMenuProps) {
  const [open, setOpen] = useState(false);
  const [flyout, setFlyout] = useState<AttachFlyout>(null);
  const [stubEnabled, setStubEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(STUB_CONNECTORS.map((c) => [c.id, c.enabled])),
  );
  const rootRef = useRef<HTMLDivElement>(null);

  const showTools = Boolean(toolsetIds && onToolsetIdsChange);
  const showAgent = Boolean(agentItems?.length);
  const agentLabel = agent ?? "Agent";

  const close = useCallback(() => {
    setOpen(false);
    setFlyout(null);
  }, []);

  useDismiss(open, close, rootRef);

  useEffect(() => {
    if (!open) setFlyout(null);
  }, [open]);

  function toggleFlyout(next: Exclude<AttachFlyout, null>) {
    setFlyout((current) => (current === next ? null : next));
  }

  function toggleToolset(setId: string) {
    if (!toolsetIds || !onToolsetIdsChange) return;
    const checked = toolsetIds.includes(setId);
    if (checked) {
      const next = toolsetIds.filter((id) => id !== setId);
      onToolsetIdsChange(next.length > 0 ? next : [setId]);
    } else {
      onToolsetIdsChange([...toolsetIds, setId]);
    }
  }

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
          aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_ADD_OR_ATTACH)}
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
            onMouseLeave={() => flyout === "connectors" && setFlyout(null)}
          >
            <button
              type="button"
              role="menuitem"
              className={`arco-menu__item${flyout === "connectors" ? " arco-menu__item--active" : ""}`}
              aria-haspopup="menu"
              aria-expanded={flyout === "connectors"}
              onMouseEnter={() => setFlyout("connectors")}
              onFocus={() => setFlyout("connectors")}
              onClick={() => toggleFlyout("connectors")}
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

            {flyout === "connectors" && (
              <div
                role="menu"
                aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_CONNECTORS)}
                className="arco-menu__panel arco-attach__flyout"
                onMouseEnter={() => setFlyout("connectors")}
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

          {showTools && (
            <div
              className="arco-attach__submenu"
              onMouseLeave={() => flyout === "tools" && setFlyout(null)}
            >
              <button
                type="button"
                role="menuitem"
                className={`arco-menu__item${flyout === "tools" ? " arco-menu__item--active" : ""}`}
                aria-haspopup="menu"
                aria-expanded={flyout === "tools"}
                onMouseEnter={() => setFlyout("tools")}
                onFocus={() => setFlyout("tools")}
                onClick={() => toggleFlyout("tools")}
              >
                <span className="arco-menu__icon" aria-hidden="true">
                  <Wrench size={14} />
                </span>
                <span className="arco-menu__itemlabel">Tools</span>
                <span className="arco-menu__chevron" aria-hidden="true">
                  <ChevronRight size={14} />
                </span>
              </button>

              {flyout === "tools" && (
                <div
                  role="menu"
                  aria-label="Agent toolsets"
                  className="arco-menu__panel arco-menu__panel--rich arco-attach__flyout arco-attach__flyout--tools"
                  onMouseEnter={() => setFlyout("tools")}
                >
                  <div className="arco-menu__heading">Which toolsets may the agent use?</div>
                  {TOOLSETS.map((set) => {
                    const checked = toolsetIds?.includes(set.id) ?? false;
                    return (
                      <button
                        key={set.id}
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={checked}
                        className="arco-menu__item arco-menu__item--described"
                        onClick={() => toggleToolset(set.id)}
                      >
                        <span className="arco-menu__itemlabel">
                          <span className="arco-menu__itemtitle">{set.label}</span>
                          <span className="arco-menu__itemdesc">{set.description}</span>
                        </span>
                        {checked && (
                          <span className="arco-menu__check" aria-hidden="true">
                            <Check size={13} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {showAgent && (
            <div
              className="arco-attach__submenu"
              onMouseLeave={() => flyout === "agent" && setFlyout(null)}
            >
              <button
                type="button"
                role="menuitem"
                className={`arco-menu__item${flyout === "agent" ? " arco-menu__item--active" : ""}`}
                aria-haspopup="menu"
                aria-expanded={flyout === "agent"}
                onMouseEnter={() => setFlyout("agent")}
                onFocus={() => setFlyout("agent")}
                onClick={() => toggleFlyout("agent")}
              >
                <span className="arco-menu__icon" aria-hidden="true">
                  <Bot size={14} />
                </span>
                <span className="arco-menu__itemlabel">{agentLabel}</span>
                <span className="arco-menu__chevron" aria-hidden="true">
                  <ChevronRight size={14} />
                </span>
              </button>

              {flyout === "agent" && (
                <div
                  role="menu"
                  aria-label="Choose agent"
                  className="arco-menu__panel arco-attach__flyout"
                  onMouseEnter={() => setFlyout("agent")}
                >
                  {(agentItems ?? []).map((item) => {
                    if (item.id.startsWith("_section:")) {
                      return (
                        <div key={item.id}>
                          {item.separatorAbove && (
                            <div className="arco-menu__separator" role="separator" />
                          )}
                          <div className="arco-menu__heading" role="presentation">
                            {item.label}
                          </div>
                        </div>
                      );
                    }
                    const IconCmp = item.icon;
                    return (
                      <div key={item.id}>
                        {item.separatorAbove && <div className="arco-menu__separator" role="separator" />}
                        <button
                          type="button"
                          role="menuitem"
                          disabled={item.disabled}
                          className={`arco-menu__item${item.danger ? " arco-menu__item--danger" : ""}`}
                          onClick={() => {
                            item.onSelect?.();
                            close();
                          }}
                        >
                          {IconCmp && (
                            <span className="arco-menu__icon" aria-hidden="true">
                              <IconCmp size={14} />
                            </span>
                          )}
                          <span className="arco-menu__itemlabel">{item.label}</span>
                          {item.checked && (
                            <span className="arco-menu__check" aria-hidden="true">
                              <Check size={13} />
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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

          {(onEmojiVisibleChange || onRichTextVisibleChange) && (
            <>
              <div className="arco-menu__separator" role="separator" />
              {onEmojiVisibleChange && (
                <label className="arco-attach__togglerow">
                  <span className="arco-menu__icon" aria-hidden="true">
                    <Smile size={14} />
                  </span>
                  <span className="arco-attach__togglelabel">
                    <T k={I18nKey.COMPONENTS$COMPOSER_EMOJIS} />
                  </span>
                  <span className="arco-switch">
                    <input
                      type="checkbox"
                      checked={emojiVisible}
                      onChange={(e) => onEmojiVisibleChange(e.target.checked)}
                      aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_EMOJIS)}
                    />
                    <span className="arco-switch__track" />
                  </span>
                </label>
              )}
              {onRichTextVisibleChange && (
                <label className="arco-attach__togglerow">
                  <span className="arco-menu__icon" aria-hidden="true">
                    <Pilcrow size={14} />
                  </span>
                  <span className="arco-attach__togglelabel">
                    <T k={I18nKey.COMPONENTS$COMPOSER_RICH_TEXT} />
                  </span>
                  <span className="arco-switch">
                    <input
                      type="checkbox"
                      checked={richTextVisible}
                      onChange={(e) => onRichTextVisibleChange(e.target.checked)}
                      aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_RICH_TEXT)}
                    />
                    <span className="arco-switch__track" />
                  </span>
                </label>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
