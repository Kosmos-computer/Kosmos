import { useCallback, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { useLongformerPlayback } from "./LongformerPlaybackContext";
import { LongformerSelectionToolbar, type TranscriptSelection } from "./LongformerSelectionToolbar";
import type { LongformerViewModel } from "./longformerStore";
import type { TranscriptDetail } from "./types";

interface LongformerTranscriptPaneProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

/** Editable transcript surface with speaker labels, selection actions, and word-level sync. */
export function LongformerTranscriptPane({ vm, detail }: LongformerTranscriptPaneProps) {
  const { seekTo } = useLongformerPlayback();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<TranscriptSelection | null>(null);
  const speakerMap = Object.fromEntries(detail.speakers.map((s) => [s.id, s]));

  const resolveSelection = useCallback(() => {
    const sel = window.getSelection();
    const body = bodyRef.current;
    if (!sel || sel.isCollapsed || !body || !body.contains(sel.anchorNode)) {
      setSelection(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const segmentEls = [...body.querySelectorAll<HTMLElement>("[data-segment-id]")].filter((el) =>
      range.intersectsNode(el),
    );
    const segmentIds = segmentEls.map((el) => el.dataset.segmentId!).filter(Boolean);
    if (segmentIds.length === 0) {
      setSelection(null);
      return;
    }

    const segments = detail.segments.filter((s) => segmentIds.includes(s.id));
    const startMs = Math.min(...segments.map((s) => s.startMs));
    const endMs = Math.max(...segments.map((s) => s.endMs));
    const rect = range.getBoundingClientRect();

    setSelection({
      text,
      segmentIds,
      startMs,
      endMs,
      rect: { top: rect.top - 48, left: rect.left },
    });
  }, [detail.segments]);

  const playFrom = useCallback(
    (ms: number) => {
      seekTo(ms);
      if (!vm.isPlaying) vm.togglePlayback();
    },
    [seekTo, vm],
  );

  return (
    <div className="arco-longformer-transcript" onMouseUp={resolveSelection}>
      <div className="arco-longformer-transcript__header">
        <h1 className="arco-longformer-transcript__title">{detail.title}</h1>
        {vm.saveStatus !== "idle" ? (
          <span className="arco-longformer-transcript__save" data-status={vm.saveStatus}>
            {vm.saveStatus === "saving" ? "Saving…" : vm.saveStatus === "saved" ? "Saved" : "Save failed"}
          </span>
        ) : null}
      </div>

      <div className="arco-longformer-transcript__body" ref={bodyRef}>
        {detail.segments.map((segment) => {
          const speaker = speakerMap[segment.speakerId];
          const isActive =
            detail.currentMs >= segment.startMs && detail.currentMs <= segment.endMs;

          return (
            <div
              key={segment.id}
              data-segment-id={segment.id}
              className={`arco-longformer-transcript__row ${isActive ? "arco-longformer-transcript__row--active" : ""}`}
            >
              <div className="arco-longformer-transcript__speaker-col">
                <span
                  className="arco-longformer-transcript__speaker"
                  style={{ color: speaker?.color }}
                >
                  {speaker?.name ?? "Unknown"}
                </span>
                <button
                  type="button"
                  className="arco-longformer-transcript__play-segment"
                  onClick={() => playFrom(segment.startMs)}
                  aria-label={`Play from ${speaker?.name}`}
                >
                  <Volume2 size={12} strokeWidth={1.75} />
                </button>
              </div>

              <div className="arco-longformer-transcript__text-col">
                {segment.words.length > 0 ? (
                  <p className="arco-longformer-transcript__words">
                    {segment.words.map((word) => {
                      const wordActive =
                        detail.currentMs >= word.startMs && detail.currentMs < word.endMs;
                      return (
                        <span
                          key={word.id}
                          className={[
                            "arco-longformer-transcript__word",
                            word.highlight ? `arco-longformer-transcript__word--${word.highlight}` : "",
                            wordActive ? "arco-longformer-transcript__word--current" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => seekTo(word.startMs)}
                        >
                          {word.text}{" "}
                        </span>
                      );
                    })}
                    {segment.text.split(" ").slice(segment.words.length).join(" ")}
                  </p>
                ) : (
                  <textarea
                    className="arco-longformer-transcript__textarea"
                    value={segment.text}
                    rows={Math.max(2, Math.ceil(segment.text.length / 72))}
                    onChange={(e) => vm.updateSegmentText(segment.id, e.target.value)}
                    onFocus={() => seekTo(segment.startMs)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selection ? (
        <LongformerSelectionToolbar
          selection={selection}
          speakers={detail.speakers}
          onChangeSpeaker={(speakerId) => vm.assignSegmentSpeaker(selection.segmentIds, speakerId)}
          onCreateClip={() => {
            vm.createClipFromRange(selection.startMs, selection.endMs, selection.text);
            vm.setJobView("clips");
            setSelection(null);
          }}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </div>
  );
}
