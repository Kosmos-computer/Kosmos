import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
import { FlaskConical } from "lucide-react";

/** Banner shown on settings sections ported from UI Experiments — interactions are local only. */
export function SettingsStubNotice() {
  return (
    <div className="arco-settings-stub-notice" role="status">
      <FlaskConical size={15} strokeWidth={1.75} aria-hidden="true" />
      <p>
        <strong><T k={I18nKey.APPS$SETTINGS_UI_STUB} /></strong><T k={I18nKey.APPS$SETTINGS_PORTED_FROM_UI_EXPERIMENTS_CONTROLS_UPDATE_LOCAL_MOCK_ST} /></p>
    </div>
  );
}
