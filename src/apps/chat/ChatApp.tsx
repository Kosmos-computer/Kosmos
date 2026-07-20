import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * The Chat app — the OS's front door. Calm-Console shaped: prose first,
 * tool activity as compact metadata cards, inline generative UI rendered
 * from fenced openui-lang via the chat component library.
 */
import { useCallback, useEffect, useState } from "react";
import { History, Plus, Trash2, Undo2 } from "lucide-react";
import type { ApprovalMode } from "@shared/types";
import { useChat } from "./useChat";
import { onPrimeComposer } from "./composerBus";
import { VoiceBar } from "./VoiceBar";
import { useVoice, voiceClient } from "../../voice";
import { Composer } from "../../components/composer/Composer";
import { ComposerNotice } from "../../components/composer/ComposerNotice";
import { DEFAULT_APPROVAL_MODE } from "../../components/composer/approvalModes";
import { DEFAULT_TOOLSET_IDS } from "../../components/composer/toolsets";
import { useComposerAttach } from "../../components/composer/useComposerAttach";
import { ChatThread } from "../../components/chat/ChatThread";
import { ScrollToLatestButton } from "../../components/chat/ScrollToLatestButton";
import { useThreadScroll } from "../../components/chat/useThreadScroll";
import { MasterDetail } from "../../components/patterns";
import { EmptyState } from "../../components/ui";
import { useModelSelection } from "../studio/useModelSelection";
import { useActiveAgentProfile } from "./useActiveAgentProfile";
import { openShellWindow } from "../../os/shellNavigation";
import { systemAppTitle } from "../../os/systemAppTitles";

export function ChatApp() {
  const chat = useChat();
  const voice = useVoice();
  const { profileId, agentLabel, agentItems, agents, active, setProfileId } =
    useActiveAgentProfile();
  const { modelLabel, modelItems, providers, activeProviderId, selectProvider } =
    useModelSelection({
      activeProfile: active,
      agents,
      setProfileId,
      sessionId: chat.sessionId,
    });
  const [draft, setDraft] = useState("");
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(DEFAULT_APPROVAL_MODE);
  const [toolsetIds, setToolsetIds] = useState<string[]>(() => [...DEFAULT_TOOLSET_IDS]);
  const [showSessions, setShowSessions] = useState(false);
  const { scrollRef, onScroll, showJump, scrollToLatest, pinToLatest } =
    useThreadScroll(chat.items);

  const attach = useComposerAttach({
    onOpenFilesPanel: () =>
      openShellWindow({ type: "system", app: "files" }, systemAppTitle("files")),
    onInsertDraft: (text) =>
      setDraft((current) => (current.trim() ? `${current.trim()}\n\n${text}` : text)),
  });

  const submit = useCallback(
    (text?: string) => {
      const value = (text ?? draft).trim();
      if (!value) return;
      setDraft("");
      pinToLatest();
      void chat.send(value, { approvalMode, profileId, toolsetIds });
    },
    [draft, chat, approvalMode, profileId, toolsetIds, pinToLatest],
  );

  useEffect(() => voiceClient.subscribe(chat.applyVoiceEvent), [chat.applyVoiceEvent]);

  useEffect(
    () =>
      onPrimeComposer(({ text, submit: shouldSubmit }) => {
        if (shouldSubmit) submit(text);
        else setDraft(text);
      }),
    [submit],
  );

  const sessionList = (
    <>
      {chat.sessions.length === 0 && <EmptyState><T k={I18nKey.APPS$CHAT_NO_SESSIONS_YET} /></EmptyState>}
      {chat.sessions.map((s) => (
        <div
          key={s.id}
          className={[
            "arco-master-detail__list-item",
            s.id === chat.sessionId ? "arco-master-detail__list-item--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <button
            className="arco-master-detail__list-button"
            onClick={() => {
              void chat.loadSession(s.id);
              setShowSessions(false);
            }}
          >
            {s.kind === "automation" ? "⚙ " : ""}
            {s.title}
          </button>
          <button
            aria-label={`Delete session ${s.title}`}
            className="arco-master-detail__list-delete"
            onClick={() => void chat.removeSession(s.id)}
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </>
  );

  return (
    <div className="arco-chat">
      <div className="arco-chat__topbar">
        <button
          className="arco-btn"
          onClick={() => setShowSessions((v) => !v)}
          aria-pressed={showSessions}
        >
          <History size={13} /><T k={I18nKey.APPS$CHAT_HISTORY} /></button>
        <button className="arco-btn" onClick={() => void chat.newChat()}>
          <Plus size={13} /><T k={I18nKey.APPS$CHAT_NEW} /></button>
      </div>

      <MasterDetail
        listOpen={showSessions}
        list={sessionList}
        detail={
          <>
            {voice.active && <VoiceBar voice={voice} placement="expanded" />}
            <div
              ref={scrollRef}
              className="arco-chat__thread arco-scroll"
              onScroll={onScroll}
            >
              {chat.items.length === 0 && (
                <EmptyState title={i18n.t(I18nKey.APPS$CHAT_ASK_ARCO_TO_BUILD_SOMETHING)}><T k={I18nKey.APPS$CHAT_BUILD_ME_A_SYSTEM_MONITOR_TRACK_MY_READING_LIST_DASHBOAR} /></EmptyState>
              )}
              <ChatThread
                items={chat.items}
                sessionId={chat.sessionId}
                streaming={chat.streaming}
                turnMeta={chat.turnMeta}
                onFollowUp={submit}
                onFork={(item) => chat.forkConversation(item)}
                onRegenerate={(item) => chat.regenerateResponse(item)}
                onEditAndResend={(item, text) => chat.editAndResend(item, text)}
                onRestoreCheckpoint={(item, mode) => chat.restoreCheckpoint(item, mode)}
                onPrimeComposer={(text) => setDraft(text)}
              />
            </div>
          </>
        }
      />

      {voice.active && <VoiceBar voice={voice} placement="dock" />}

      <div className="arco-composer-dock">
        <ScrollToLatestButton visible={showJump} onClick={scrollToLatest} />
        {attach.fileInput}
        {attach.githubModal}
        <Composer
          value={draft}
          onChange={setDraft}
          onSubmit={() => submit()}
          streaming={chat.streaming}
          onStop={chat.stop}
          placeholder={i18n.t(I18nKey.APPS$CHAT_ASK_ARCO_TO_BUILD_AUTOMATE_OR_EXPLAIN)}
          approvalMode={approvalMode}
          onApprovalModeChange={setApprovalMode}
          toolsetIds={toolsetIds}
          onToolsetIdsChange={setToolsetIds}
          agent={agentLabel}
          agentItems={agentItems}
          model={modelLabel}
          modelItems={modelItems}
          modelProviders={providers}
          activeModelProviderId={activeProviderId}
          onModelProviderChange={selectProvider}
          onAddFile={attach.onAddFile}
          onFilesDropped={attach.onFilesDropped}
          onAddFolder={attach.onAddFolder}
          onImportGitHubIssue={attach.onImportGitHubIssue}
          onAddPlugins={attach.onAddPlugins}
          onManageConnectors={attach.onManageConnectors}
          onBrowseConnectors={attach.onBrowseConnectors}
          connectors={attach.connectors}
          voiceActive={voice.active}
          voiceAvailable={voice.available}
          onVoiceToggle={() => void voice.toggle().catch(() => {})}
          inputAriaLabel="Chat message"
          notice={
            chat.pendingRestoreUndo ? (
              <ComposerNotice
                tone="info"
                icon={Undo2}
                actionLabel="Redo checkpoint"
                onAction={() => void chat.redoCheckpoint()}
                onDismiss={() => void chat.dismissRestoreUndo()}
              >
                Restore undone until you send again — redo to put the previous state back
              </ComposerNotice>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
