import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { LongformerJobShell } from "./LongformerJobShell";
import { LongformerJobSidebar } from "./LongformerJobSidebar";
import { LongformerJobListView, LongformerUploadsActions } from "./LongformerJobListView";
import { LongformerLibraryView } from "./LongformerLibraryView";
import { LongformerPlaceholderView } from "./LongformerPlaceholderView";
import { LongformerSettingsView } from "./LongformerSettingsView";
import { LongformerSidebar } from "./LongformerSidebar";
import { LongformerSourcesView } from "./LongformerSourcesView";
import { SidebarPane } from "../../components/patterns";
import type { LongformerViewModel } from "./longformerStore";

interface LongformerWorkspaceProps {
  vm: LongformerViewModel;
}

/** Longformer — transcription library and editor workbench. */
export function LongformerWorkspace({ vm }: LongformerWorkspaceProps) {
  const renderMain = () => {
    if (vm.isJobMode) {
      return vm.activeDetail ? (
        <LongformerJobShell vm={vm} detail={vm.activeDetail} />
      ) : (
        <LongformerPlaceholderView
          title={i18n.t(I18nKey.APPS$LONGFORMER_LOADING_TRANSCRIPT)}
          description="Fetching job details…"
        />
      );
    }

    switch (vm.view) {
      case "library":
        return <LongformerLibraryView vm={vm} />;
      case "in-progress":
        return (
          <LongformerJobListView
            vm={vm}
            title={i18n.t(I18nKey.APPS$LONGFORMER_IN_PROGRESS)}
            description="Jobs that are queued or currently transcribing."
            statuses={["queued", "processing"]}
            emptyLabel="No jobs in progress. Upload audio from Uploads to start."
            actions={<LongformerUploadsActions vm={vm} />}
          />
        );
      case "sources":
        return <LongformerSourcesView vm={vm} />;
      case "uploads":
        return (
          <LongformerJobListView
            vm={vm}
            title={i18n.t(I18nKey.APPS$LONGFORMER_UPLOADS)}
            description="Manual uploads from this computer or Arco Files."
            sourceType="upload"
            emptyLabel="No uploads yet. Choose a file to start transcription."
            actions={<LongformerUploadsActions vm={vm} />}
          />
        );
      case "settings":
        return <LongformerSettingsView />;
      default:
        return <LongformerLibraryView vm={vm} />;
    }
  };

  return (
    <div className="arco-longformer">
      <SidebarPane width={vm.sidebarWidth} onWidthChange={vm.setSidebarWidth}>
        {vm.isJobMode ? <LongformerJobSidebar vm={vm} /> : <LongformerSidebar vm={vm} />}
      </SidebarPane>
      <div className="arco-longformer__main">{renderMain()}</div>
    </div>
  );
}
