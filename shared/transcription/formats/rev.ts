/** Rev.ai / Podium monologue transcript format. */

export interface RevElement {
  type: "text" | "punct";
  value: string;
  ts?: number;
  end_ts?: number;
  start?: number;
  end?: number;
  confidence?: number;
}

export interface RevMonologue {
  speaker_id?: number | string;
  speaker?: number;
  elements: RevElement[];
}

export interface RevTranscript {
  monologues: RevMonologue[];
  language?: { code?: string };
}

/** Normalize Rev `ts`/`end_ts` or Podium `start`/`end` to milliseconds. */
export function elementStartMs(element: RevElement): number {
  const sec = element.ts ?? element.start ?? 0;
  return Math.round(sec * 1000);
}

export function elementEndMs(element: RevElement, fallbackStartMs: number): number {
  const sec = element.end_ts ?? element.end;
  if (sec != null) return Math.round(sec * 1000);
  return fallbackStartMs + 200;
}
