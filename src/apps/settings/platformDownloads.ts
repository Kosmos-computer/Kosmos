export type PlatformDownloadKind = "file" | "external" | "page";

export interface PlatformDownloadLink {
  id: string;
  label: string;
  description: string;
  href: string;
  download?: string;
  kind: PlatformDownloadKind;
  buildHint?: string;
}

export interface PlatformDownloadGroup {
  id: string;
  title: string;
  description: string;
  links: PlatformDownloadLink[];
}

const GITHUB_RELEASES = "https://github.com/Kosmos-computer/Kosmos/releases";

/** Platform install artifacts served from this host or linked externally. */
export function buildPlatformDownloadGroups(origin: string): PlatformDownloadGroup[] {
  const base = origin.replace(/\/$/, "");

  return [
    {
      id: "android",
      title: "Android",
      description: "Sideload APKs onto phones and tablets. No Play Store required.",
      links: [
        {
          id: "android-connect",
          label: "Connect APK (recommended)",
          description:
            "Bundled UI — enter your server URL at first run (Coolify, Tailscale, LAN, or home Mac).",
          href: `${base}/downloads/arco-connect.apk`,
          download: "arco-connect.apk",
          kind: "file",
          buildHint: "npm run mobile:bundle",
        },
        {
          id: "android-local",
          label: "Local APK (embedded backend)",
          description: "Full Kosmos on device with an embedded Node sidecar — no server URL entry.",
          href: `${base}/downloads/arco-local.apk`,
          download: "arco-local.apk",
          kind: "file",
          buildHint: "npm run mobile:local:bundle",
        },
        {
          id: "android-dev",
          label: "Dev sideload APK",
          description: "Development only — loads UI from your Mac while sharing its data directory.",
          href: `${base}/downloads/arco-os-mobile.apk`,
          download: "arco-os-mobile.apk",
          kind: "file",
          buildHint: "npm run mobile:apk",
        },
      ],
    },
    {
      id: "chromebook",
      title: "Chromebook",
      description: "Install over Wi‑Fi ADB or use the browser as a PWA.",
      links: [
        {
          id: "chromebook-zip",
          label: "ZIP download (Chromebook)",
          description:
            "Use when Chrome blocks APK downloads. Rename the file to arco-os-mobile.apk after download.",
          href: `${base}/downloads/arco-os-mobile.zip`,
          download: "arco-os-mobile.zip",
          kind: "file",
          buildHint: "npm run mobile:apk (creates APK + ZIP in public/downloads/)",
        },
        {
          id: "chromebook-install-page",
          label: "Mobile install guide",
          description: "HTTPS setup, certificate trust, and step-by-step sideload instructions.",
          href: `${base}/mobile-install.html`,
          kind: "page",
        },
        {
          id: "chromebook-pwa",
          label: "Install as PWA",
          description: "Open Kosmos in Chrome on the same network, then use Install app from the menu.",
          href: base,
          kind: "page",
        },
      ],
    },
    {
      id: "desktop",
      title: "Desktop (macOS, Windows, Linux)",
      description: "Native app with embedded backend — no separate Node install for end users.",
      links: [
        {
          id: "desktop-releases",
          label: "GitHub releases",
          description: "Download DMG/ZIP (macOS), NSIS (Windows), or AppImage (Linux) when published.",
          href: GITHUB_RELEASES,
          kind: "external",
        },
        {
          id: "desktop-build",
          label: "Build locally",
          description: "From the repo: npm run dist:desktop — artifacts land in apps/desktop/release/.",
          href: "https://github.com/Kosmos-computer/Kosmos/blob/main/README.md#macos-windows-and-linux-desktop-app",
          kind: "external",
        },
      ],
    },
    {
      id: "steamos",
      title: "SteamOS (Steam Deck)",
      description: "Desktop Mode distribution layer — sibling kosmos-steamos repo.",
      links: [
        {
          id: "steamos-repo",
          label: "kosmos-steamos",
          description: "Steam Deck / Steam Machine install scripts and upstream sync docs.",
          href: "https://github.com/Kosmos-computer/kosmos-steamos",
          kind: "external",
        },
      ],
    },
    {
      id: "self-host",
      title: "Self-host & browser",
      description: "Run the API and UI on your own server, then connect mobile clients to it.",
      links: [
        {
          id: "self-host-readme",
          label: "Hosted / server-only",
          description: "npm run build && npm start — serves :4600. See deploy/coolify for VPS setup.",
          href: "https://github.com/Kosmos-computer/Kosmos/blob/main/README.md#hosted--server-only",
          kind: "external",
        },
        {
          id: "browser-dev",
          label: "Browser (this session)",
          description: "You're running Kosmos in the browser — ideal for development on any machine with Node 22+.",
          href: base,
          kind: "page",
        },
      ],
    },
  ];
}
