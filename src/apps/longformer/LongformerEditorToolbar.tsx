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
        <button type="button" className="arco-longformer-toolbar__back" onClick={vm.closeEditor} aria-label="Back to library">
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
        <button type="button" className="arco-longformer-toolbar__transport-btn" onClick={() => skip(-5000)} aria-label="Rewind 5s">
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
        <button type="button" className="arco-longformer-toolbar__transport-btn" onClick={() => skip(5000)} aria-label="Forward 5s">
          <FastForward size={16} strokeWidth={1.75} />
        </button>
        <span className="arco-longformer-toolbar__timecode">{formatTimecode(detail.currentMs)}</span>
      </div>

      <div className="arco-longformer-toolbar__right">
        <button type="button" className="arco-longformer-toolbar__icon-btn" aria-label="AI assist">
          <Sparkles size={16} strokeWidth={1.75} />
        </button>
        <button type="button" className="arco-longformer-toolbar__icon-btn" aria-label="Record">
          <Mic size={16} strokeWidth={1.75} />
        </button>
        <div className="arco-longformer-toolbar__search">
          <Search size={14} strokeWidth={1.75} />
          <input type="search" placeholder="Search transcript" aria-label="Search transcript" />
        </div>
        <Button type="button" variant="default">
          <Share2 size={14} strokeWidth={1.75} />
          Share
        </Button>
      </div>

      <div className="arco-longformer-toolbar__format">
        <div className="arco-longformer-toolbar__format-group">
          <button type="button" className="arco-longformer-toolbar__format-btn" aria-label="Add block">+</button>
          <button type="button" className="arco-longformer-toolbar__format-btn" aria-label="Highlight">H</button>
          <button type="button" className="arco-longformer-toolbar__format-btn" aria-label="Strikethrough">
            <Strikethrough size={14} strokeWidth={1.75} />
          </button>
          <button type="button" className="arco-longformer-toolbar__format-btn" aria-label="Bold">
            <Bold size={14} strokeWidth={1.75} />
          </button>
          <button type="button" className="arco-longformer-toolbar__format-btn" aria-label="Italic">
            <Italic size={14} strokeWidth={1.75} />
          </button>
          <button type="button" className="arco-longformer-toolbar__format-btn" aria-label="Link">
            <Link2 size={14} strokeWidth={1.75} />
          </button>
          <button type="button" className="arco-longformer-toolbar__format-btn" aria-label="Comment">
            <MessageSquarePlus size={14} strokeWidth={1.75} />
          </button>
        </div>
        <Button type="button" variant="primary">
          <Upload size={14} strokeWidth={1.75} />
          Publish
        </Button>
      </div>
    </header>
  );
}
