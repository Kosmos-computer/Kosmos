---
name: arco-versioning
description: Enforce Arco OS desktop version tracking across VERSION, package.json, git tags, and CI releases. Use when bumping versions, preparing desktop releases, editing apps/desktop/VERSION or package.json version fields, fixing version drift, or setting up code signing for desktop builds.
---

# Arco Desktop Versioning

## Source of truth

| File | Role |
|------|------|
| `apps/desktop/VERSION` | Canonical desktop semver (single line, e.g. `0.1.0`) |
| `package.json` (root) | Must match `VERSION` |
| `apps/desktop/package.json` | Must match `VERSION` — baked into the Electron app via `app.getVersion()` |
| Git tag `desktop-vX.Y.Z` | Created by CI after each successful release |

**Never edit `package.json` version fields directly.** Always update via sync:

```bash
npm run version:sync -- --set 0.2.0   # writes VERSION + syncs package.json files
npm run version:check                 # CI/local guard — fails on drift
```

## Release automation

Desktop releases are fully automated on push to `main` when desktop-relevant paths change.

1. CI computes next semver from latest `desktop-v*` tag (patch bump by default)
2. Syncs `apps/desktop/VERSION` + package.json files
3. Commits `chore(desktop): release vX.Y.Z [skip desktop]` — **`[skip desktop]` prevents release loops**
4. Builds, signs (when secrets present), publishes to GitHub Releases
5. Pushes commit + `desktop-vX.Y.Z` tag

Manual release: **Actions → Publish desktop app** (choose patch/minor/major).

Skip a release: commit message includes `[skip desktop]`.

## Code signing (macOS)

Set these GitHub repo secrets for signed + notarized builds:

| Secret | Purpose |
|--------|---------|
| `DESKTOP_CSC_LINK` | Base64-encoded `.p12` Developer ID certificate |
| `DESKTOP_CSC_KEY_PASSWORD` | Certificate password |
| `DESKTOP_APPLE_ID` | Apple ID email |
| `DESKTOP_APPLE_APP_PASSWORD` | App-specific password |
| `DESKTOP_APPLE_TEAM_ID` | Apple Developer Team ID |

electron-builder config (`apps/desktop/package.json` → `build.mac`):
- `hardenedRuntime: true`
- `entitlements`: `build/entitlements.mac.plist`
- `notarize: true`

CI logs signing readiness via `apps/desktop/scripts/verify-signing-config.mjs`. Unsigned builds still publish but are dev/internal only.

## Auto-update behavior

Packaged apps use `electron-updater` (GitHub Releases feed).

| User action | Behavior |
|-------------|----------|
| **Remind me later** | Snoozed for 24 hours in `update-preferences.json` — modal reappears after that, or immediately from Settings → Check for updates |
| **Skip this version** | Persisted in `update-preferences.json` — never prompts for that version again |

Settings → **Software updates** always shows pending downloads and exposes **Restart to update**, **Remind me later**, and **Skip this version**.

## Agent checklist

Before merging desktop release changes:

- [ ] Run `npm run version:check`
- [ ] Do not hand-edit package.json versions — use `version:sync --set`
- [ ] If bumping locally for testing, sync all three version files together
- [ ] Release commits from CI must include `[skip desktop]`
- [ ] After adding signing secrets, verify next CI release logs "signing + notarization credentials detected"

## Key scripts

| Command | Purpose |
|---------|---------|
| `npm run version:sync` | Read `VERSION` → update package.json files |
| `npm run version:check` | Fail if VERSION ≠ package.json |
| `npm run release:should-ship -w @arco/desktop` | Would CI release on current diff? |
| `npm run release:version -w @arco/desktop` | Print next patch version from tags |
| `npm run dist:desktop:publish` | Local publish (needs `GH_TOKEN` + signing env) |

## Do not

- Bump root/desktop package.json versions independently
- Remove `[skip desktop]` from CI version-bump commits
- Tag releases manually without syncing `apps/desktop/VERSION` first
- Expect production auto-update to work reliably without signed macOS builds
