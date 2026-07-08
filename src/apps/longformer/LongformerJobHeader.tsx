import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { ChevronLeft, Download } from "lucide-react";
import { Breadcrumb } from "../../components/patterns";
import { Button } from "../../components/ui";
import type { LongformerViewModel } from "./longformerStore";
import type { TranscriptDetail } from "./types";
import { useTranslation } from "react-i18next";

interface LongformerJobHeaderProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

/** Job workspace header — back to library, title, and download. */
export function LongformerJobHeader({ vm, detail }: LongformerJobHeaderProps) {
  const { t } = useTranslation();
  return (
    <header className="arco-longformer-job-header">
      <div className="arco-longformer-job-header__left">
        <button
          type="button"
          className="arco-longformer-job-header__back"
          onClick={vm.closeEditor}
          aria-label={i18n.t(I18nKey.APPS$LONGFORMER_BACK_TO_LIBRARY)}
        >
          <ChevronLeft size={18} strokeWidth={1.75} />
        </button>
        <Breadcrumb
          items={[
            { label: detail.projectName },
            { label: detail.title, current: true },
          ]}
        />
      </div>
      <div className="arco-longformer-job-header__right">
        <span className="arco-longformer-job-header__status" data-status={detail.status}>
          {detail.status}
        </span>
        <Button type="button" variant="default" disabled>
          <Download size={14} strokeWidth={1.75} /><T k={I18nKey.APPS$LONGFORMER_DOWNLOAD_ASSETS} /></Button>
      </div>
    </header>
  );
}
