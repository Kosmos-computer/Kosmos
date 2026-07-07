import { advanceAllActiveJobs } from "./pipeline.js";

let timer: ReturnType<typeof setInterval> | null = null;
let ticking = false;

export function startTranscriptionSupervisor(): void {
  if (timer) return;
  timer = setInterval(() => {
    if (ticking) return;
    ticking = true;
    void advanceAllActiveJobs()
      .catch((err) => console.warn("[transcription] supervisor tick failed:", err))
      .finally(() => {
        ticking = false;
      });
  }, 2_000);
  void advanceAllActiveJobs();
}
