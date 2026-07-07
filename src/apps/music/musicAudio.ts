/** Bridges UI seek requests to the shell-mounted MusicEngine audio element. */

type SeekHandler = (progress: number) => void;

let seekHandler: SeekHandler | null = null;

export function registerMusicSeekHandler(handler: SeekHandler | null) {
  seekHandler = handler;
}

export function seekMusicAudio(progress: number) {
  seekHandler?.(progress);
}
