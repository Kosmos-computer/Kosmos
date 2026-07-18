import { I18nKey } from "../../../i18n/declaration";
import { T } from "../../../i18n/T";
/**
 * DiffsTab — what the agent changed this session, newest first. Each entry
 * expands into an inline Monaco diff (baseline = content before the agent's
 * first edit in this conversation), with a jump to the Files tab for editing.
 */
import { Suspense, lazy, useState } from "react";
import { ChevronRight, FileDiff, SquarePen } from "lucide-react";
import { useOsStore } from "../../../os/osStore";
import { useStudioStore, useSessionActivity } from "../studioStore";

const DiffViewer = lazy(() => import("../editor/DiffViewer"));

export function DiffsTab() {
  const theme = useOsStore((s) => s.theme);
  const { changes } = useSessionActivity();
  const requestFile = useStudioStore((s) => s.requestFile);
  const setActiveTab = useStudioStore((s) => s.setActiveTab);
  const [openPath, setOpenPath] = useState<string | null>(null);

  const sorted = Object.values(changes).sort((a, b) => b.at - a.at);

  if (sorted.length === 0) {
    return (
      <div className="arco-empty">
        <FileDiff size={18} />
        <span><T k={I18nKey.APPS$STUDIO_NO_FILE_CHANGES_YET_AGENT_EDITS_WILL_APPEAR_HERE} /></span>
      </div>
    );
  }

  return (
    <div className="arco-studio__diffs arco-scroll">
      {sorted.map((change) => {
        const open = openPath === change.path;
        return (
          <div key={change.path} className="arco-studio__diffcard">
            <div className="arco-studio__diffrow">
              <button
                type="button"
                className="arco-studio__diffrow-main"
                onClick={() => setOpenPath(open ? null : change.path)}
                aria-expanded={open}
              >
                <ChevronRight
                  size={12}
                  className="arco-studio__treechevron"
                  style={{ transform: open ? "rotate(90deg)" : undefined }}
                />
                <span className="arco-studio__diffpath">{change.path}</span>
                <span
                  className={`arco-studio__diffbadge ${change.before === null ? "arco-studio__diffbadge--new" : ""}`}
                >
                  {change.before === null ? "new" : "edited"}
                </span>
              </button>
              <button
                type="button"
                className="arco-toolcard__open"
                onClick={() => {
                  requestFile(change.path);
                  setActiveTab("files");
                }}
              >
                <SquarePen size={11} style={{ verticalAlign: "-1px" }} />
                <T k={I18nKey.COMMON$EDIT} />
              </button>
            </div>
            {open && (
              <div className="arco-studio__diffhost">
                <Suspense fallback={<div className="arco-empty"><T k={I18nKey.APPS$STUDIO_LOADING_DIFF} /></div>}>
                  <DiffViewer
                    path={change.path}
                    before={change.before}
                    after={change.after}
                    theme={theme}
                  />
                </Suspense>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
