import type { PlatformConfig, PlatformKind, PlatformOs, ShellProfile } from "./types";

const MOBILE_SHELL_PROFILE: ShellProfile =
  (import.meta.env.VITE_ARCO_SHELL_PROFILE as ShellProfile | undefined) ?? "auto";

const API_BASE: string | null =
  (import.meta.env.VITE_ARCO_API_URL as string | undefined)?.replace(/\/$/, "") ?? null;

function normalizeOs(raw: string | undefined): PlatformOs {
  switch (raw) {
    case "darwin":
    case "win32":
    case "linux":
    case "android":
    case "ios":
      return raw;
    default:
      return "web";
  }
}

function shellProfileForKind(kind: PlatformKind, override?: ShellProfile): ShellProfile {
  if (override && override !== "auto") return override;
  if (MOBILE_SHELL_PROFILE !== "auto") return MOBILE_SHELL_PROFILE;
  return kind === "mobile" ? "mobile" : "auto";
}

/** Merge runtime-detected values with optional window injection + Vite env. */
export function buildPlatformConfig(partial: {
  kind: PlatformKind;
  os: string;
  version: string;
  shellProfile?: ShellProfile;
  apiBase?: string | null;
}): PlatformConfig {
  const injected = typeof window !== "undefined" ? window.__ARCO_PLATFORM__ : undefined;
  const kind = injected?.kind ?? partial.kind;
  return {
    kind,
    os: normalizeOs(injected?.os ?? partial.os),
    version: injected?.version ?? partial.version,
    shellProfile: shellProfileForKind(kind, injected?.shellProfile ?? partial.shellProfile),
    apiBase: injected?.apiBase ?? partial.apiBase ?? API_BASE,
  };
}

export function resolveApiBase(config: PlatformConfig): string | null {
  return config.apiBase;
}
