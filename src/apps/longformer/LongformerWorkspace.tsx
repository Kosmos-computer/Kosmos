import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { LongformerJobShell } from "./LongformerJobShell";
import { LongformerJobSidebar } from "./LongformerJobSidebar";
import { LongformerLibraryView } from "./LongformerLibraryView";
import { LongformerPlaceholderView } from "./LongformerPlaceholderView";
import { LongformerSidebar } from "./LongformerSidebar";
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
          <LongformerPlaceholderView
            title={i18n.t(I18nKey.APPS$LONGFORMER_IN_PROGRESS)}
            description={
              vm.data.processingCount > 0
                ? `${vm.data.processingCount} job${vm.data.processingCount === 1 ? "" : "s"} transcribing. The library updates automatically.`
                : "No jobs in progress. Upload audio from the Uploads tab to start."
            }
            actionLabel={vm.data.processingCount > 0 ? "View library" : "Upload file"}
            onAction={vm.data.processingCount > 0 ? () => vm.setView("library") : vm.uploadFile}
          />
        );
      case "sources":
        return (
          <LongformerPlaceholderView
            title={i18n.t(I18nKey.APPS$LONGFORMER_CONNECTED_SOURCES)}
            description="Manage integrations for Zoom, Google Meet, podcast feeds, cloud storage, and in-app memory sync."
          />
        );
      case "uploads":
        return (
          <LongformerPlaceholderView
            title={i18n.t(I18nKey.APPS$LONGFORMER_UPLOADS)}
            description={
              vm.uploading
                ? "Uploading and queuing transcription…"
                : "Upload audio or video to transcribe — MP3, M4A, WAV, MP4, and more. Chapters and artifacts generate automatically after transcription."
            }
            actionLabel={vm.uploading ? undefined : "Upload file"}
            onAction={vm.uploading ? undefined : vm.uploadFile}
          />
        );
      case "settings":
        return (
          <LongformerPlaceholderView
            title={i18n.t(I18nKey.OS$APP_SETTINGS)}
            description="Configure language detection, speaker diarization, export formats, filler-word removal, and auto-transcribe rules."
          />
        );
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
