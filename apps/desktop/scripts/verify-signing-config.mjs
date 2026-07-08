#!/usr/bin/env node
/**
 * Log whether macOS code signing + notarization credentials are present for CI/local publish.
 */
const hasCert = Boolean(process.env.CSC_LINK?.trim());
const hasCertPassword = Boolean(process.env.CSC_KEY_PASSWORD?.trim());
const hasAppleId = Boolean(process.env.APPLE_ID?.trim());
const hasApplePassword = Boolean(process.env.APPLE_APP_SPECIFIC_PASSWORD?.trim());
const hasTeamId = Boolean(process.env.APPLE_TEAM_ID?.trim());

const signingReady = hasCert && hasCertPassword;
const notarizeReady = signingReady && hasAppleId && hasApplePassword && hasTeamId;

if (notarizeReady) {
  console.log("[desktop-signing] Developer ID signing + notarization credentials detected");
} else if (signingReady) {
  console.warn("[desktop-signing] signing cert detected but notarization env vars are incomplete");
  console.warn("[desktop-signing] set APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID for notarized builds");
} else {
  console.warn("[desktop-signing] no CSC_LINK found — building an unsigned macOS app (dev/internal only)");
}

if (process.env.CI === "true" && !signingReady) {
  console.warn("[desktop-signing] production auto-update works best with signed + notarized builds");
}
