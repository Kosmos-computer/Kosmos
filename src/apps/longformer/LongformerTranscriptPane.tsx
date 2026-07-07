import { Volume2 } from "lucide-react";
import type { LongformerViewModel } from "./longformerStore";
import type { TranscriptDetail } from "./types";

interface LongformerTranscriptPaneProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

/** Editable transcript surface with speaker labels and word-level sync. */
export function LongformerTranscriptPane({ vm, detail }: LongformerTranscriptPaneProps) {
  const speakerMap = Object.fromEntries(detail.speakers.map((s) => [s.id, s]));

  return (
    <div className="arco-longformer-transcript">
      <h1 className="arco-longformer-transcript__title">{detail.title}</h1>

      <div className="arco-longformer-transcript__body">
        {detail.segments.map((segment) => {
          const speaker = speakerMap[segment.speakerId];
          const isActive =
            detail.currentMs >= segment.startMs && detail.currentMs <= segment.endMs;

          return (
            <div
              key={segment.id}
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
                  onClick={() => vm.setCurrentMs(segment.startMs)}
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
                          onClick={() => vm.setCurrentMs(word.startMs)}
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
                    onFocus={() => vm.setCurrentMs(segment.startMs)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
