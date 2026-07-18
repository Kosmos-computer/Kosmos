import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import {
  Bold,
  ChevronLeft,
  FastForward,
  Italic,
  Link2,
  MessageSquarePlus,
  Mic,
  Pause,
  Play,
  Rewind,
  Search,
  Share2,
  Sparkles,
  Strikethrough,
  Upload,
} from "lucide-react";
import { Breadcrumb } from "../../components/patterns";
import { Button } from "../../components/ui";
import { useLongformerPlayback } from "./LongformerPlaybackContext";
import type { LongformerViewModel } from "./longformerStore";
import type { TranscriptDetail } from "./types";
import { formatTimecode } from "./types";

interface LongformerEditorToolbarProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

/** Editor chrome — breadcrumbs, playback, formatting, and publish actions. */
export function LongformerEditorToolbar({ vm, detail }: LongformerEditorToolbarProps) {
  const { seekTo, togglePlayback } = useLongformerPlayback();
  const skip = (delta: number) => seekTo(detail.currentMs + delta);

  return (
    <header className="arco-longformer-toolbar">
      <div className="arco-longformer-toolbar__left">
        <button
          type="button"
          className="arco-longformer-toolbar__back"
          onClick={() => {
            vm.closeEditor();
            vm.setView("library");
          }}
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

      <div className="arco-longformer-toolbar__transport">
        <button type="button" className="arco-longformer-toolbar__transport-btn" onClick={() => skip(-5000)} aria-label={i18n.t(I18nKey.APPS$LONGFORMER_REWIND_5S)}>
          <Rewind size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="arco-longformer-toolbar__play"
          onClick={togglePlayback}
          aria-label={vm.isPlaying ? "Pause" : "Play"}
        >
          {vm.isPlaying ? <Pause size={16} strokeWidth={1.75} /> : <Play size={16} strokeWidth={1.75} />}
        </button>
        <button type="button" className="arco-longformer-toolbar__transport-btn" onClick={() => skip(5000)} aria-label={i18n.t(I18nKey.APPS$LONGFORMER_FORWARD_5S)}>
          <FastForward size={16} strokeWidth={1.75} />
        </button>
        <span className="arco-longformer-toolbar__timecode">{formatTimecode(detail.currentMs)}</span>
      </div>

      <div className="arco-longformer-toolbar__right">
        <button type="button" className="arco-longformer-toolbar__icon-btn" aria-label={i18n.t(I18nKey.APPS$LONGFORMER_AI_ASSIST)}>
          <Sparkles size={16} strokeWidth={1.75} />
        </button>
        <button type="button" className="arco-longformer-toolbar__icon-btn" aria-label={i18n.t(I18nKey.APPS$LONGFORMER_RECORD)}>
          <Mic size={16} strokeWidth={1.75} />
        </button>
        <div className="arco-longformer-toolbar__search">
          <Search size={14} strokeWidth={1.75} />
          <input type="search" placeholder={i18n.t(I18nKey.APPS$LONGFORMER_SEARCH_TRANSCRIPT)} aria-label={i18n.t(I18nKey.APPS$LONGFORMER_SEARCH_TRANSCRIPT)} />
        </div>
        <Button type="button" variant="default">
          <Share2 size={14} strokeWidth={1.75} /><T k={I18nKey.APPS$LONGFORMER_SHARE} /></Button>
      </div>

      <div className="arco-longformer-toolbar__format">
        <div className="arco-longformer-toolbar__format-group">
          <button type="button" className="arco-longformer-toolbar__format-btn" aria-label={i18n.t(I18nKey.APPS$LONGFORMER_ADD_BLOCK)}>+</button>
          <button type="button" className="arco-longformer-toolbar__format-btn" aria-label={i18n.t(I18nKey.APPS$LONGFORMER_HIGHLIGHT)}>H</button>
          <button type="button" className="arco-longformer-toolbar__format-btn" aria-label={i18n.t(I18nKey.APPS$LONGFORMER_STRIKETHROUGH)}>
            <Strikethrough size={14} strokeWidth={1.75} />
          </button>
          <button type="button" className="arco-longformer-toolbar__format-btn" aria-label={i18n.t(I18nKey.APPS$LONGFORMER_BOLD)}>
            <Bold size={14} strokeWidth={1.75} />
          </button>
          <button type="button" className="arco-longformer-toolbar__format-btn" aria-label={i18n.t(I18nKey.APPS$LONGFORMER_ITALIC)}>
            <Italic size={14} strokeWidth={1.75} />
          </button>
          <button type="button" className="arco-longformer-toolbar__format-btn" aria-label={i18n.t(I18nKey.APPS$LONGFORMER_LINK)}>
            <Link2 size={14} strokeWidth={1.75} />
          </button>
          <button type="button" className="arco-longformer-toolbar__format-btn" aria-label={i18n.t(I18nKey.APPS$LONGFORMER_COMMENT)}>
            <MessageSquarePlus size={14} strokeWidth={1.75} />
          </button>
        </div>
        <Button type="button" variant="primary">
          <Upload size={14} strokeWidth={1.75} /><T k={I18nKey.APPS$LONGFORMER_PUBLISH} /></Button>
      </div>
    </header>
  );
}
