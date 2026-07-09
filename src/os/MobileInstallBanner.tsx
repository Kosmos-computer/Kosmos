/**
 * Web-only prompt to download the Android APK (Chromebook / phone sideload).
 */
import type { CSSProperties } from "react";
import { Download } from "lucide-react";
import { getPlatformBridge } from "@arco/platform-bridge";

export function MobileInstallBanner({ floating = false }: { floating?: boolean }) {
  const bridge = getPlatformBridge();
  if (bridge.config.kind !== "web") return null;

  const style: CSSProperties = floating
    ? {
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 16px",
        borderRadius: "999px",
        background: "var(--arco-surface-raised, #18181b)",
        border: "1px solid var(--arco-border-subtle, #27272a)",
        color: "var(--arco-accent)",
        textDecoration: "none",
        fontSize: "var(--arco-text-sm)",
        fontWeight: 600,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }
    : {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "10px 14px",
        margin: "0 12px 8px",
        borderRadius: "var(--arco-radius-md, 10px)",
        background: "var(--arco-surface-raised, #18181b)",
        border: "1px solid var(--arco-border-subtle, #27272a)",
        color: "var(--arco-accent)",
        textDecoration: "none",
        fontSize: "var(--arco-text-sm)",
        fontWeight: 600,
      };

  return (
    <a href="/mobile-install.html" className="arco-mobile-install-banner" style={style} target="_blank" rel="noreferrer">
      <Download size={16} />
      Download Android app (APK)
    </a>
  );
}
