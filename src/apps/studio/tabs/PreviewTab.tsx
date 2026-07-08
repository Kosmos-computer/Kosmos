import { I18nKey } from "../../../i18n/declaration";
import { T } from "../../../i18n/T";
/**
 * PreviewTab — renders the generated app the agent is currently working on
 * (last app_create/app_update/open_app), with a switcher for the rest of the
 * library. Reuses AppSurface, so Refresh/Code/Refine behave exactly like a
 * standalone app window.
 */
import { AppWindow } from "lucide-react";
import { useOsStore } from "../../../os/osStore";
import { useStudioStore } from "../studioStore";
import { AppSurface } from "../../appview/AppSurface";

export function PreviewTab() {
  const apps = useOsStore((s) => s.apps);
  const previewAppId = useStudioStore((s) => s.previewAppId);
  const setPreview = useStudioStore.setState;

  if (apps.length === 0) {
    return (
      <div className="arco-empty">
        <AppWindow size={18} />
        <span><T k={I18nKey.APPS$STUDIO_NO_GENERATED_APPS_YET_ASK_THE_AGENT_TO_BUILD_ONE} /></span>
      </div>
    );
  }

  const activeId = previewAppId && apps.some((a) => a.id === previewAppId) ? previewAppId : apps[0].id;

  return (
    <div className="arco-studio__preview">
      <div className="arco-chip-row" style={{ padding: "var(--arco-space-s) var(--arco-space-m) 0" }}>
        {apps.map((app) => (
          <button
            key={app.id}
            className={`arco-chip ${app.id === activeId ? "arco-chip--active" : ""}`}
            onClick={() => setPreview({ previewAppId: app.id })}
          >
            {app.title}
          </button>
        ))}
      </div>
      <div className="arco-studio__previewhost">
        <AppSurface key={activeId} appId={activeId} />
      </div>
    </div>
  );
}
