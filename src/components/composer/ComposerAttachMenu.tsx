import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useTranslation } from "react-i18next";
/**
 * ComposerAttachMenu — the "+" popover: an attach/file action plus toggle
 * switches for workspace panels. Uses the shared .arco-menu panel styles
 * directly (rather than <Menu>) because the panel mixes menu items with
 * non-dismissing switch rows.
 */
import { useRef, useState } from "react";
import { Paperclip, Plus } from "lucide-react";
import { useDismiss } from "../useDismiss";

export interface ComposerPanelToggle {
  id: string;
  label: string;
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
}

export interface ComposerAttachMenuProps {
  onAddFile?: () => void;
  panelToggles?: ComposerPanelToggle[];
  disabled?: boolean;
}

export function ComposerAttachMenu({ onAddFile, panelToggles, disabled }: ComposerAttachMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), rootRef);

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
          {onAddFile && (
            <button
              type="button"
              role="menuitem"
              className="arco-menu__item"
              onClick={() => {
                onAddFile();
                setOpen(false);
              }}
            >
              <span className="arco-menu__icon" aria-hidden="true">
                <Paperclip size={14} />
              </span>
              <span className="arco-menu__itemlabel"><T k={I18nKey.COMPONENTS$COMPOSER_ADD_FILE} /></span>
            </button>
          )}

          {panelToggles && panelToggles.length > 0 && (
            <>
              {onAddFile && <div className="arco-menu__separator" role="separator" />}
              <div className="arco-menu__sectionlabel"><T k={I18nKey.COMPONENTS$COMPOSER_PANELS} /></div>
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
