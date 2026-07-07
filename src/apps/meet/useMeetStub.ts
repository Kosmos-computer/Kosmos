/**
 * STUB: Meet studio workspace — local UI state + mock session data.
 * Wire point: replace with WebRTC room store and signaling adapter.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MEET_CHAT_UNREAD,
  MEET_PARTICIPANTS,
  MEET_RECORDING_UPLOADS,
  MEET_SESSION,
  MEET_WAITING,
} from "./meetMock";
import type { MeetLayoutId, MeetSidebarTab } from "./types";

export function formatMeetElapsed(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function useMeetStub() {
  const [sidebarTab, setSidebarTab] = useState<MeetSidebarTab>("participants");
  const [layout, setLayout] = useState<MeetLayoutId>("split");
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [recording, setRecording] = useState(MEET_SESSION.isRecording);
  const [elapsedSec, setElapsedSec] = useState(MEET_SESSION.recordingElapsedSec);
  const [waiting, setWaiting] = useState(MEET_WAITING);
  const [chatUnread, setChatUnread] = useState(MEET_CHAT_UNREAD);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setElapsedSec((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  const participants = useMemo(() => MEET_PARTICIPANTS, []);
  const uploads = useMemo(() => MEET_RECORDING_UPLOADS, []);

  const admitGuest = useCallback((guestId: string) => {
    setWaiting((list) => list.filter((g) => g.id !== guestId));
  }, []);

  const removeGuest = useCallback((guestId: string) => {
    setWaiting((list) => list.filter((g) => g.id !== guestId));
  }, []);

  const toggleRecording = useCallback(() => {
    setRecording((on) => !on);
  }, []);

  const openChat = useCallback(() => {
    setSidebarTab("chat");
    setChatUnread(0);
  }, []);

  return {
    session: MEET_SESSION,
    participants,
    waiting,
    uploads,
    sidebarTab,
    setSidebarTab,
    layout,
    setLayout,
    micOn,
    setMicOn,
    cameraOn,
    setCameraOn,
    speakerOn,
    setSpeakerOn,
    screenShareOn,
    setScreenShareOn,
    recording,
    toggleRecording,
    elapsedSec,
    elapsedLabel: formatMeetElapsed(elapsedSec),
    admitGuest,
    removeGuest,
    chatUnread,
    openChat,
  };
}

export type MeetViewModel = ReturnType<typeof useMeetStub>;
