import { LongformerDrivePickerModal } from "./LongformerDrivePickerModal";
import { LongformerWorkspace } from "./LongformerWorkspace";
import { useLongformerStore } from "./longformerStore";

const MEDIA_ACCEPT =
  "audio/*,video/*,.mp3,.m4a,.wav,.aac,.ogg,.flac,.webm,.mp4,.mov,.mkv";

export function LongformerApp() {
  const vm = useLongformerStore();
  return (
    <>
      <input
        ref={vm.fileInputRef}
        type="file"
        accept={MEDIA_ACCEPT}
        hidden
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void vm.handleFileSelected(file);
          e.target.value = "";
        }}
      />
      <LongformerDrivePickerModal
        open={vm.drivePickerOpen}
        busy={vm.uploading}
        onClose={vm.closeDrivePicker}
        onPick={(file) => void vm.handleFileSelected(file)}
      />
      <LongformerWorkspace vm={vm} />
    </>
  );
}
