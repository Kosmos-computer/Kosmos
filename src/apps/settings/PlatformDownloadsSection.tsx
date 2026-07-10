/**
 * Settings → Downloads — links to Kosmos builds across platforms.
 */
import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { getPlatformBridge } from "@arco/platform-bridge";
import {
  SettingsAlert,
  SettingsEmpty,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsRow,
  SettingsRowActions,
  SettingsSection,
  SettingsStack,
  SettingsSubhead,
} from "../../components/patterns";
import { Button, Chip } from "../../components/ui";
import {
  buildPlatformDownloadGroups,
  type PlatformDownloadKind,
  type PlatformDownloadLink,
} from "./platformDownloads";

type Availability = "unknown" | "ready" | "missing";

async function probeFile(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

function linkIcon(kind: PlatformDownloadKind) {
  return kind === "external" ? <ExternalLink size={14} /> : <Download size={14} />;
}

function DownloadLinkRow({
  link,
  availability,
}: {
  link: PlatformDownloadLink;
  availability: Availability;
}) {
  const isFile = link.kind === "file";
  const ready = !isFile || availability === "ready";
  const missing = isFile && availability === "missing";

  return (
    <SettingsRow className="arco-settings-download-row">
      <div className="arco-settings-download-row__copy">
        <span className="arco-settings-download-row__label">{link.label}</span>
        <span className="arco-settings-download-row__desc">{link.description}</span>
        {missing && link.buildHint ? (
          <span className="arco-settings-download-row__hint">
            Not on this server yet — build with <code>{link.buildHint}</code>
          </span>
        ) : null}
      </div>
      <SettingsRowActions>
        {isFile ? (
          <Chip active={ready} aria-pressed={ready}>
            {availability === "unknown" ? "Checking…" : ready ? "Ready" : "Not built"}
          </Chip>
        ) : null}
        <Button
          variant={ready ? "primary" : "ghost"}
          disabled={isFile && !ready}
          onClick={() => {
            if (link.kind === "external" || link.kind === "page") {
              window.open(link.href, "_blank", "noopener,noreferrer");
              return;
            }
            const anchor = document.createElement("a");
            anchor.href = link.href;
            if (link.download) anchor.download = link.download;
            anchor.rel = "noopener noreferrer";
            anchor.click();
          }}
        >
          {linkIcon(link.kind)}
          {link.kind === "external" ? "Open" : link.kind === "page" ? "Open" : "Download"}
        </Button>
      </SettingsRowActions>
    </SettingsRow>
  );
}

export function PlatformDownloadsSection() {
  const bridge = getPlatformBridge();
  const groups = useMemo(
    () => buildPlatformDownloadGroups(typeof window !== "undefined" ? window.location.origin : ""),
    [],
  );
  const [availability, setAvailability] = useState<Record<string, Availability>>({});

  useEffect(() => {
    let cancelled = false;
    const fileLinks = groups.flatMap((group) =>
      group.links.filter((link) => link.kind === "file"),
    );

    void (async () => {
      const next: Record<string, Availability> = {};
      await Promise.all(
        fileLinks.map(async (link) => {
          const ok = await probeFile(link.href);
          if (!cancelled) next[link.id] = ok ? "ready" : "missing";
        }),
      );
      if (!cancelled) setAvailability(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [groups]);

  if (bridge.config.kind === "mobile") {
    return (
      <SettingsPage>
        <SettingsSection intro="Install links for other platforms. You're already running Kosmos on this device.">
          <SettingsEmpty>Switch to the browser or desktop app to download builds for other platforms.</SettingsEmpty>
        </SettingsSection>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage>
      <SettingsSection intro="Download Kosmos for Android, Chromebook, desktop, SteamOS, or self-host your own instance.">
        <SettingsAlert tone="muted">
          File downloads are served from this Kosmos instance. Build artifacts with the npm scripts noted when a
          file is not available yet.
        </SettingsAlert>
        <SettingsStack>
          {groups.map((group) => (
            <SettingsPanel key={group.id}>
              <SettingsPanelHeader>
                <SettingsSubhead>{group.title}</SettingsSubhead>
              </SettingsPanelHeader>
              <p className="arco-settings-panel__desc">{group.description}</p>
              <SettingsPanelBody>
                {group.links.map((link) => (
                  <DownloadLinkRow
                    key={link.id}
                    link={link}
                    availability={availability[link.id] ?? (link.kind === "file" ? "unknown" : "ready")}
                  />
                ))}
              </SettingsPanelBody>
            </SettingsPanel>
          ))}
        </SettingsStack>
      </SettingsSection>
    </SettingsPage>
  );
}
