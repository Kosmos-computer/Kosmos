/**
 * useComposerAttach — wires every "+" menu action for Studio and Chat:
 * file/folder pickers, GitHub issue import, MCP connectors, and APIs/
 * Settings deep-links. Hosts pass options for workspace-specific behavior.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import type { ComposerConnector } from "./ComposerAttachMenu";
import { ImportGitHubIssueModal } from "./ImportGitHubIssueModal";
import { openApisApp } from "../../apps/apis/apisNavStore";
import { openSettingsApp } from "../../apps/settings/settingsStore";
import { useMcpServers } from "../../hooks/useMcpServers";
import { api } from "../../lib/api";
import { openShellWindow } from "../../os/shellNavigation";
import { systemAppTitle } from "../../os/systemAppTitles";
import { primeComposer } from "../../apps/chat/composerBus";
import type { ReactNode } from "react";

export interface UseComposerAttachOptions {
  /** Studio: open the Files drawer after uploading. */
  onOpenFilesPanel?: () => void;
  /** Studio: attach a local folder as the workspace root. */
  onOpenFolder?: (path: string) => Promise<void> | void;
  /** Append text into the current draft (preferred over primeComposer when available). */
  onInsertDraft?: (text: string) => void;
}

export function useComposerAttach(options: UseComposerAttachOptions = {}) {
  const { onOpenFilesPanel, onOpenFolder, onInsertDraft } = options;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [githubOpen, setGithubOpen] = useState(false);
  const { servers, setEnabled } = useMcpServers();

  const connectors: ComposerConnector[] = useMemo(
    () =>
      servers.map((server) => ({
        id: server.config.id,
        label: server.config.name,
        enabled: server.config.enabled,
        onEnabledChange: (enabled) => {
          void setEnabled(server.config.id, enabled).catch(() => {});
        },
      })),
    [servers, setEnabled],
  );

  const appendDraft = useCallback(
    (text: string) => {
      if (onInsertDraft) {
        onInsertDraft(text);
        return;
      }
      primeComposer({ text, submit: false });
    },
    [onInsertDraft],
  );

  const onAddFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFilesSelected = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        try {
          const entry = await api.uploadDriveFile(file);
          uploaded.push(`@drive/${entry.name}`);
        } catch {
          uploaded.push(`(failed to upload ${file.name})`);
        }
      }
      onOpenFilesPanel?.();
      const line =
        uploaded.length === 1
          ? `Attached file: ${uploaded[0]}`
          : `Attached files:\n${uploaded.map((name) => `- ${name}`).join("\n")}`;
      appendDraft(line);
    },
    [appendDraft, onOpenFilesPanel],
  );

  const onAddFolder = useCallback(() => {
    void (async () => {
      try {
        const { path } = await api.nativePickFolder();
        if (onOpenFolder) {
          await onOpenFolder(path);
          return;
        }
        // Chat / no workspace: open Studio so the user can work in the folder.
        openShellWindow({ type: "system", app: "studio" }, systemAppTitle("studio"));
        appendDraft(`Open workspace folder: ${path}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not pick folder";
        // Browser / non-desktop: fall back to Files app.
        if (/native|unavailable|not supported|404|501/i.test(message)) {
          openShellWindow({ type: "system", app: "files" }, systemAppTitle("files"));
          return;
        }
        window.alert(message);
      }
    })();
  }, [onOpenFolder, appendDraft]);

  const onImportGitHubIssue = useCallback(() => setGithubOpen(true), []);

  const onManageConnectors = useCallback(() => openSettingsApp("mcp"), []);
  const onBrowseConnectors = useCallback(() => openApisApp("marketplace"), []);
  const onAddPlugins = useCallback(() => openApisApp("marketplace"), []);

  const fileInput: ReactNode = (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      accept="*/*"
      hidden
      onChange={(e) => {
        const list = e.target.files;
        e.target.value = "";
        void onFilesSelected(list);
      }}
    />
  );

  const githubModal: ReactNode = (
    <ImportGitHubIssueModal
      open={githubOpen}
      onClose={() => setGithubOpen(false)}
      onImport={(markdown) => appendDraft(markdown)}
    />
  );

  return {
    connectors,
    onAddFile,
    onAddFolder,
    onImportGitHubIssue,
    onManageConnectors,
    onBrowseConnectors,
    onAddPlugins,
    onFilesDropped: onFilesSelected,
    fileInput,
    githubModal,
  };
}
