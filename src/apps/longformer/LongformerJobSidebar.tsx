import {
  Activity,
  BookOpen,
  Clapperboard,
  FileText,
  Film,
  Hash,
  List,
  MessageSquareQuote,
  Mic,
  ScrollText,
  StickyNote,
  Type,
} from "lucide-react";
import { NavSidebar } from "../../components/patterns";
import { isJobViewEnabled, LONGFORMER_JOB_NAV } from "./jobNav";
import type { LongformerViewModel } from "./longformerStore";
import type { LongformerJobView } from "./types";

const JOB_VIEW_ICONS: Record<LongformerJobView, typeof Activity> = {
  status: Activity,
  transcript: ScrollText,
  chapters: List,
  clips: Clapperboard,
  titles: Type,
  summaries: BookOpen,
  quotes: MessageSquareQuote,
  notes: StickyNote,
  reels: Film,
  details: FileText,
};

interface LongformerJobSidebarProps {
  vm: LongformerViewModel;
}

/** Per-transcript asset navigation — replaces app nav while a job is open. */
export function LongformerJobSidebar({ vm }: LongformerJobSidebarProps) {
  const detail = vm.activeDetail;

  return (
    <NavSidebar
      className="arco-longformer-job-sidebar"
      header={
        <div className="arco-longformer-job-sidebar__header">
          <span className="arco-longformer-job-sidebar__icon" aria-hidden="true">
            <Mic size={16} strokeWidth={1.75} />
          </span>
          <div className="arco-longformer-job-sidebar__title-block">
            <span className="arco-longformer-job-sidebar__title">{detail?.title ?? "Transcript"}</span>
            <span className="arco-longformer-job-sidebar__subtitle">{detail?.projectName ?? "Uploads"}</span>
          </div>
        </div>
      }
      sections={[
        {
          id: "assets",
          title: "Assets",
          items: LONGFORMER_JOB_NAV.map((item) => {
            const Icon = JOB_VIEW_ICONS[item.id] ?? Hash;
            const enabled = isJobViewEnabled(item, vm.activeJob, detail);
            return {
              id: item.id,
              label: item.label,
              leading: <Icon size={16} strokeWidth={1.75} />,
              active: vm.jobView === item.id,
              disabled: !enabled,
              onClick: enabled ? () => vm.setJobView(item.id) : undefined,
            };
          }),
        },
      ]}
    />
  );
}
