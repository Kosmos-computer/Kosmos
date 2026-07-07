export type MeetSidebarTab = "chat" | "participants";

export type MeetLayoutId =
  | "solo"
  | "split"
  | "pip-left"
  | "pip-right"
  | "grid-4"
  | "spotlight";

export interface MeetParticipant {
  id: string;
  name: string;
  role?: "host";
  resolution: string;
  audioDevice: string;
  bitrateMbps: number;
  cameraOn: boolean;
  audioLevel: number;
  avatarInitial: string;
  videoSrc?: string;
}

export interface MeetWaitingGuest {
  id: string;
  name: string;
}

export interface MeetRecordingUpload {
  participantId: string;
  label: string;
  uploadedMb: number;
  totalMb: number;
}

export interface MeetSession {
  slug: string;
  title: string;
  isLive: boolean;
  viewerCount: number;
  isRecording: boolean;
  recordingElapsedSec: number;
  hostInitial: string;
}
