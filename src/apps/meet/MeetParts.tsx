import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import {
  Eye,
  Grid2x2,
  LayoutGrid,
  LayoutPanelLeft,
  LayoutPanelTop,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Settings,
  Square,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "../../components/ui";
import type { MeetLayoutId, MeetParticipant } from "./types";
import type { MeetViewModel } from "./useMeetStub";

const LAYOUT_OPTIONS: { id: MeetLayoutId; label: string; icon: typeof LayoutGrid }[] = [
  { id: "solo", label: "Solo", icon: LayoutPanelTop },
  { id: "split", label: "Split", icon: LayoutPanelLeft },
  { id: "pip-left", label: "PiP left", icon: LayoutGrid },
  { id: "pip-right", label: "PiP right", icon: LayoutGrid },
  { id: "grid-4", label: "Grid", icon: Grid2x2 },
  { id: "spotlight", label: "Spotlight", icon: LayoutPanelTop },
];

function AudioMeter({ level }: { level: number }) {
  const bars = [0.35, 0.55, 0.75, 0.95].map((threshold, _i) => level >= threshold);
  return (
    <span className="arco-meet__audio-meter" aria-hidden="true">
      {bars.map((active, i) => (
        <span key={i} className={active ? "arco-meet__audio-meter-bar--active" : ""} />
      ))}
    </span>
  );
}

function ParticipantTile({ participant }: { participant: MeetParticipant }) {
  return (
    <article className="arco-meet__tile">
      {participant.cameraOn && participant.videoSrc ? (
        <img
          className="arco-meet__tile-video"
          src={participant.videoSrc}
          alt={`${participant.name} video`}
        />
      ) : (
        <div className="arco-meet__tile-placeholder">
          <span className="arco-meet__tile-avatar">{participant.avatarInitial}</span>
        </div>
      )}
      <span className="arco-meet__tile-name">{participant.name}</span>
      {!participant.cameraOn ? (
        <span className="arco-meet__tile-camera-off" aria-label={i18n.t(I18nKey.APPS$MEET_CAMERA_OFF)}>
          <VideoOff size={14} />
        </span>
      ) : null}
    </article>
  );
}

export function MeetHeader({ vm }: { vm: MeetViewModel }) {
  const { session, participants } = vm;
  return (
    <header className="arco-meet__header">
      <div className="arco-meet__header-left">
        <span className="arco-meet__brand"><T k={I18nKey.APPS$MEET_MEET} /></span>
        <span className="arco-meet__room">
          <Lock size={12} aria-hidden="true" />
          {session.slug}
        </span>
      </div>
      <div className="arco-meet__header-center">
        <span className="arco-meet__stat">
          <Users size={14} aria-hidden="true" />
          {participants.length}
        </span>
        {session.isLive ? (
          <span className="arco-meet__live">
            <span className="arco-meet__live-dot" aria-hidden="true" /><T k={I18nKey.APPS$MEET_LIVE} /><Eye size={12} aria-hidden="true" />
            {session.viewerCount}
          </span>
        ) : null}
      </div>
      <div className="arco-meet__header-right">
        <span className="arco-meet__host-avatar" aria-label={i18n.t(I18nKey.APPS$MEET_HOST_PROFILE)}>
          {session.hostInitial}
        </span>
      </div>
    </header>
  );
}

export function MeetVideoGrid({ vm }: { vm: MeetViewModel }) {
  return (
    <section className={`arco-meet__grid arco-meet__grid--${vm.layout}`} aria-label={i18n.t(I18nKey.APPS$MEET_VIDEO_FEEDS)}>
      {vm.participants.map((participant) => (
        <ParticipantTile key={participant.id} participant={participant} />
      ))}
    </section>
  );
}

export function MeetControlBar({ vm }: { vm: MeetViewModel }) {
  return (
    <footer className="arco-meet__controls" aria-label={i18n.t(I18nKey.APPS$MEET_CALL_CONTROLS)}>
      <button type="button" className="arco-meet__control" aria-label={i18n.t(I18nKey.OS$APP_SETTINGS)}>
        <Settings size={18} />
      </button>

      <div className="arco-meet__controls-center">
        <button
          type="button"
          className={`arco-meet__control${vm.screenShareOn ? " arco-meet__control--active" : ""}`}
          aria-label={i18n.t(I18nKey.APPS$MEET_SHARE_SCREEN)}
          aria-pressed={vm.screenShareOn}
          onClick={() => vm.setScreenShareOn((on) => !on)}
        >
          <MonitorUp size={18} />
        </button>
        <button
          type="button"
          className={`arco-meet__control${vm.micOn ? " arco-meet__control--active" : ""}`}
          aria-label={vm.micOn ? "Mute microphone" : "Unmute microphone"}
          aria-pressed={vm.micOn}
          onClick={() => vm.setMicOn((on) => !on)}
        >
          {vm.micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>
        <button
          type="button"
          className={`arco-meet__control arco-meet__control--record${vm.recording ? " arco-meet__control--recording" : ""}`}
          aria-label={vm.recording ? "Stop recording" : "Start recording"}
          aria-pressed={vm.recording}
          onClick={vm.toggleRecording}
        >
          <Square size={14} fill="currentColor" />
        </button>
        <button
          type="button"
          className={`arco-meet__control${vm.speakerOn ? " arco-meet__control--active" : ""}`}
          aria-label={vm.speakerOn ? "Mute speaker" : "Unmute speaker"}
          aria-pressed={vm.speakerOn}
          onClick={() => vm.setSpeakerOn((on) => !on)}
        >
          {vm.speakerOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <button
          type="button"
          className={`arco-meet__control${vm.cameraOn ? " arco-meet__control--active" : ""}`}
          aria-label={vm.cameraOn ? "Turn camera off" : "Turn camera on"}
          aria-pressed={vm.cameraOn}
          onClick={() => vm.setCameraOn((on) => !on)}
        >
          {vm.cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
        </button>
      </div>

      <button type="button" className="arco-meet__control arco-meet__control--end" aria-label={i18n.t(I18nKey.APPS$MEET_END_CALL)}>
        <PhoneOff size={18} />
      </button>
    </footer>
  );
}

export function MeetSidebar({ vm }: { vm: MeetViewModel }) {
  return (
    <aside className="arco-meet__sidebar" aria-label={i18n.t(I18nKey.APPS$MEET_STUDIO_PANEL)}>
      <div className="arco-meet__tabs" role="tablist" aria-label={i18n.t(I18nKey.APPS$MEET_SIDEBAR_SECTIONS)}>
        <button
          type="button"
          role="tab"
          className={vm.sidebarTab === "chat" ? "arco-meet__tab--active" : ""}
          aria-selected={vm.sidebarTab === "chat"}
          onClick={vm.openChat}
        >
          <MessageSquare size={14} aria-hidden="true" /><T k={I18nKey.APPS$MEET_CHAT} />{vm.chatUnread > 0 ? <span className="arco-meet__tab-badge">{vm.chatUnread}</span> : null}
        </button>
        <button
          type="button"
          role="tab"
          className={vm.sidebarTab === "participants" ? "arco-meet__tab--active" : ""}
          aria-selected={vm.sidebarTab === "participants"}
          onClick={() => vm.setSidebarTab("participants")}
        ><T k={I18nKey.APPS$MEET_PARTICIPANTS} /></button>
      </div>

      {vm.sidebarTab === "participants" ? (
        <div className="arco-meet__sidebar-body">
          <section className="arco-meet__section">
            <ul className="arco-meet__participant-list">
              {vm.participants.map((p) => (
                <li key={p.id} className="arco-meet__participant">
                  <div className="arco-meet__participant-head">
                    <span className="arco-meet__participant-name">
                      {p.name}
                      {p.role === "host" ? <span className="arco-meet__host-tag"><T k={I18nKey.APPS$MEET_HOST} /></span> : null}
                    </span>
                    <AudioMeter level={p.audioLevel} />
                  </div>
                  <p className="arco-meet__participant-meta">
                    {p.resolution} / {p.audioDevice} / {p.bitrateMbps}<T k={I18nKey.APPS$MEET_MBPS} /></p>
                </li>
              ))}
            </ul>
          </section>

          {vm.waiting.length > 0 ? (
            <section className="arco-meet__section">
              <h3 className="arco-meet__section-title"><T k={I18nKey.APPS$MEET_WAITING_ROOM} /></h3>
              <ul className="arco-meet__waiting-list">
                {vm.waiting.map((guest) => (
                  <li key={guest.id} className="arco-meet__waiting-item">
                    <span>{guest.name}</span>
                    <div className="arco-meet__waiting-actions">
                      <button
                        type="button"
                        className="arco-meet__text-btn"
                        onClick={() => vm.removeGuest(guest.id)}
                      ><T k={I18nKey.COMMON$REMOVE} /></button>
                      <Button
                        variant="primary"
                        className="arco-meet__admit-btn"
                        onClick={() => vm.admitGuest(guest.id)}
                      ><T k={I18nKey.APPS$MEET_ADMIT} /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="arco-meet__section arco-meet__recording">
            <div className="arco-meet__recording-head">
              <h3 className="arco-meet__section-title">{vm.session.title}</h3>
              <span className="arco-meet__recording-time">{vm.elapsedLabel}</span>
            </div>
            <ul className="arco-meet__upload-list">
              {vm.uploads.map((upload) => {
                const pct = Math.round((upload.uploadedMb / upload.totalMb) * 100);
                return (
                  <li key={upload.participantId} className="arco-meet__upload">
                    <div className="arco-meet__upload-label">
                      <span>{upload.label}</span>
                      <span>
                        {upload.uploadedMb} / {upload.totalMb} MB
                      </span>
                    </div>
                    <div className="arco-meet__upload-bar" role="progressbar" aria-valuenow={pct}>
                      <span style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="arco-meet__section">
            <h3 className="arco-meet__section-title"><T k={I18nKey.APPS$MEET_DIRECTOR} /></h3>
            <div className="arco-meet__layout-grid">
              {LAYOUT_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={
                      vm.layout === option.id
                        ? "arco-meet__layout-btn arco-meet__layout-btn--active"
                        : "arco-meet__layout-btn"
                    }
                    aria-label={option.label}
                    aria-pressed={vm.layout === option.id}
                    onClick={() => vm.setLayout(option.id)}
                  >
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        <div className="arco-meet__chat-stub">
          <p><T k={I18nKey.APPS$MEET_CHAT_IS_STUBBED_CONNECT_A_ROOM_BACKEND_TO_STREAM_MESSAGE} /></p>
        </div>
      )}
    </aside>
  );
}
