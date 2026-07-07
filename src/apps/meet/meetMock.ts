import type { MeetParticipant, MeetRecordingUpload, MeetSession, MeetWaitingGuest } from "./types";

export const MEET_SESSION: MeetSession = {
  slug: "/the-nadav-show",
  title: "The Nadav Show",
  isLive: true,
  viewerCount: 142,
  isRecording: true,
  recordingElapsedSec: 581,
  hostInitial: "N",
};

export const MEET_PARTICIPANTS: MeetParticipant[] = [
  {
    id: "nadav",
    name: "Nadav",
    role: "host",
    resolution: "1080p",
    audioDevice: "Bose Quiet Comfort 35 II",
    bitrateMbps: 1.2,
    cameraOn: true,
    audioLevel: 0.72,
    avatarInitial: "N",
    videoSrc:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "pieter",
    name: "Pieter",
    resolution: "1080p",
    audioDevice: "AirPods Pieter-Pleun",
    bitrateMbps: 3.1,
    cameraOn: false,
    audioLevel: 0.38,
    avatarInitial: "P",
  },
];

export const MEET_WAITING: MeetWaitingGuest[] = [{ id: "rene", name: "Rene Sijnke" }];

export const MEET_RECORDING_UPLOADS: MeetRecordingUpload[] = [
  { participantId: "nadav", label: "Nadav: Video and Audio", uploadedMb: 372, totalMb: 898 },
  { participantId: "pieter", label: "Pieter: Video and Audio", uploadedMb: 412, totalMb: 901 },
];

export const MEET_CHAT_UNREAD = 12;
