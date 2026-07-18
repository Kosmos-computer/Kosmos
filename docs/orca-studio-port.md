/**
 * Orca → Techno Studio port notes
 *
 * ## Phase 0 — Design Mode
 *
 * ### Desktop
 * Electron `<webview>` + IPC grab (`browserSetGrabMode` / `awaitGrab` / `captureCrop`).
 *
 * ### Browser / cloud (project previews, not the open web)
 * Studio loads previews through **`GET /api/studio/preview?url=`** (auth + `files:read`).
 * That makes the iframe same-origin and injects a Design Mode postMessage bridge.
 * The Kosmos **server** must be able to fetch the project URL (local workspace
 * port, tunnel, or cloud preview). Open-web scraping stays on `/api/search/browse`
 * (no loopback).
 *
 * Toggle: Techno Studio → Browser → **Design Mode** → click element → Send to agent.
 */
