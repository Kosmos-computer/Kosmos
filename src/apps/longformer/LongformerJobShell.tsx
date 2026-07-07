import { LongformerJobHeader } from "./LongformerJobHeader";
import { LongformerArtifactPage } from "./pages/LongformerArtifactPage";
import { LongformerChaptersPage } from "./pages/LongformerChaptersPage";
import { LongformerDetailsPage } from "./pages/LongformerDetailsPage";
import { LongformerStatusPage } from "./pages/LongformerStatusPage";
import { LongformerTranscriptPage } from "./pages/LongformerTranscriptPage";
import type { LongformerViewModel } from "./longformerStore";
import type { TranscriptDetail } from "./types";

interface LongformerJobShellProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

/** Job workspace — header + asset page router (Podium-style in-app nav). */
export function LongformerJobShell({ vm, detail }: LongformerJobShellProps) {
  const renderPage = () => {
    switch (vm.jobView) {
      case "status":
        return <LongformerStatusPage vm={vm} detail={detail} />;
      case "transcript":
        return <LongformerTranscriptPage vm={vm} detail={detail} />;
      case "chapters":
        return <LongformerChaptersPage vm={vm} detail={detail} />;
      case "titles":
      case "summaries":
      case "quotes":
      case "clips":
      case "notes":
      case "reels":
        return (
          <LongformerArtifactPage
            vm={vm}
            detail={detail}
            view={vm.jobView as "titles" | "summaries" | "quotes" | "clips" | "notes" | "reels"}
          />
        );
      case "details":
        return <LongformerDetailsPage vm={vm} detail={detail} />;
      default:
        return <LongformerStatusPage vm={vm} detail={detail} />;
    }
  };

  return (
    <div className="arco-longformer-job">
      {vm.jobView !== "transcript" ? <LongformerJobHeader vm={vm} detail={detail} /> : null}
      <div className="arco-longformer-job__page">{renderPage()}</div>
    </div>
  );
}
