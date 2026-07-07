import { LongformerWorkspace } from "./LongformerWorkspace";
import { useLongformerStore } from "./longformerStore";

export function LongformerApp() {
  const vm = useLongformerStore();
  return (
    <>
      <input
        ref={vm.fileInputRef}
        type="file"
        accept="audio/*,video/*,.mp3,.m4a,.wav,.aac,.ogg,.flac,.webm,.mp4,.mov,.mkv"
        className="sr-only"
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void vm.handleFileSelected(file);
          e.target.value = "";
        }}
      />
      <LongformerWorkspace vm={vm} />
    </>
  );
}
