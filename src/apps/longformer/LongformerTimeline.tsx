import type { LongformerViewModel } from "./longformerStore";
import type { TranscriptDetail } from "./types";
import { formatDuration } from "./types";

interface LongformerTimelineProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

const TICK_INTERVAL_MS = 10_000;

function buildTicks(durationMs: number): number[] {
  const ticks: number[] = [];
  for (let t = 0; t <= durationMs; t += TICK_INTERVAL_MS) {
    ticks.push(t);
  }
  return ticks;
}

/** Multi-track timeline — chapters, word clips, and waveform lanes. */
export function LongformerTimeline({ vm, detail }: LongformerTimelineProps) {
  const ticks = buildTicks(detail.durationMs);
  const playheadPct = (detail.currentMs / detail.durationMs) * 100;

  return (
    <div className="arco-longformer-timeline" style={{ height: vm.timelineHeight }}>
      <div className="arco-longformer-timeline__ruler">
        {ticks.map((tick) => (
          <span
            key={tick}
            className="arco-longformer-timeline__tick"
            style={{ left: `${(tick / detail.durationMs) * 100}%` }}
          >
            {formatDuration(tick)}
          </span>
        ))}
        <div
          className="arco-longformer-timeline__playhead"
          style={{ left: `${playheadPct}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="arco-longformer-timeline__tracks">
        {detail.tracks.map((track) => (
          <div key={track.id} className={`arco-longformer-timeline__track arco-longformer-timeline__track--${track.kind}`}>
            <span className="arco-longformer-timeline__track-label">{track.label}</span>
            <div className="arco-longformer-timeline__track-lane">
              {track.clips.map((clip) => {
                const left = (clip.startMs / detail.durationMs) * 100;
                const width = ((clip.endMs - clip.startMs) / detail.durationMs) * 100;
                const selected = detail.selectedClipId === clip.id;
                const chapter = detail.chapters.find((ch) => ch.id === clip.id.replace("clip-ch-", "ch-"));

                return (
                  <button
                    key={clip.id}
                    type="button"
                    className={[
                      "arco-longformer-timeline__clip",
                      selected ? "arco-longformer-timeline__clip--selected" : "",
                      track.kind === "waveform" ? "arco-longformer-timeline__clip--wave" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{
                      left: `${left}%`,
                      width: `${Math.max(width, 1.5)}%`,
                      ...(chapter ? { background: chapter.color } : {}),
                    }}
                    onClick={() => {
                      vm.selectClip(clip.id);
                      vm.setCurrentMs(clip.startMs);
                    }}
                    title={clip.label}
                  >
                    {track.kind !== "waveform" ? (
                      <span className="arco-longformer-timeline__clip-label">{clip.label}</span>
                    ) : (
                      <span className="arco-longformer-timeline__wave-bars" aria-hidden="true">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <span key={i} style={{ height: `${30 + ((i * 17) % 50)}%` }} />
                        ))}
                      </span>
                    )}
                    {track.kind === "waveform" ? (
                      <span className="arco-longformer-timeline__clip-duration">{clip.label}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
