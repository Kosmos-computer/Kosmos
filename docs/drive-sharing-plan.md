# Drive + Sharing Plan

> Execution plan for completing Kosmos Drive and safe external sharing.
> Written 2026-07-07. Builds on `office-suite-plan.md` Stage 1 and the
> Nextcloud-inspired share model (opaque tokens, isolated public surface).

## Goals

1. **Drive is complete** — browse, create, rename, move, upload, download,
   trash/restore, search, starred/recent, live refresh, open-with editors.
2. **Sharing is safe** — external recipients get **one file or folder subtree**
   via an opaque token. No access to the OS shell, bridge, agent workspace,
   or other Drive files.
3. **Agents participate** — share intents and tools use the same contract as
   the Drive UI; writes default to confirm.

## Current state (baseline)

| Layer | Status |
|-------|--------|
| `os.files@1` + `filesService` | Shipped — SQLite metadata, on-disk blobs |
| `/api/drive/*` REST | Shipped — CRUD, content, blob |
| Agent `docs_*` tools | Shipped — contract-level file ops |
| Shell Drive (`src/apps/files/`) | Partial — list/create/star/trash; **no** rename/move/upload/download/share/live refresh |
| Tier-3 `core.drive` (`apps/drive/`) | Partial — rename/move via intents; simpler UI |
| Sharing | **Not started** |

**Canonical app:** `system:files` (`FilesApp`) is what users open from the
Dock. `core.drive` remains the contract-pure reference; converge features
into the shell app first.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Authenticated Kosmos (session + files:read/write)          │
│  FilesApp ──► /api/drive/* ──► filesService                   │
│  Agent    ──► bridge intents ──► filesService / shareService  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Public share surface (token only — NO session, NO bridge)    │
│  GET /s/:token              minimal HTML viewer               │
│  GET /public/shares/:token  JSON metadata                     │
│  GET /public/shares/:token/content | /blob | /children        │
└─────────────────────────────────────────────────────────────┘
```

Shares are **first-class records** in `shareService`, not “public file ids.”

## Phase 1 — Drive completion (shell app)

| # | Feature | API | UI |
|---|---------|-----|-----|
| 1.1 | Live refresh on `files.changed` | SSE → `app_event` | `useDrive` subscribes via `onAppEvent` |
| 1.2 | Rename | `PATCH /api/drive/entries/:id` | Preview pane + row menu |
| 1.3 | Move | `PATCH` parentId | Move dialog (folder picker) |
| 1.4 | Upload files | `POST` with `contentBase64` | Toolbar upload button |
| 1.5 | Download | `GET /api/drive/blob/:id` | Preview download button |
| 1.6 | Image preview | blob URL | `FilePreviewPane` img tag |
| 1.7 | Drag-move (optional) | same as 1.3 | Defer if dialog ships first |

**Exit:** All Drive sidebar locations work; agent-created files appear without
manual refresh; rename/move/upload/download round-trip.

## Phase 2 — Sharing MVP (`os.shares@1`)

### Contract intents (authenticated only)

| Intent | Access | Purpose |
|--------|--------|---------|
| `shares.create` | write | Create link for `fileId` |
| `shares.list` | read | List shares (optional `fileId` filter) |
| `shares.revoke` | write | Invalidate link |
| `shares.update` | write | Password, expiry, mode |

### Share modes (v1)

| Mode | Public can |
|------|------------|
| `download` | Read metadata + download bytes (default) |
| `view` | Read metadata; download disabled when `allowDownload: false` |

Deferred: `upload` (file-request folders), `edit`, federated shares.

### Share record

```ts
interface Share {
  id: string;
  token: string;       // 32-byte random, base64url — public identifier
  fileId: string;
  createdBy: string;
  mode: "download" | "view";
  allowDownload: boolean;
  passwordHash?: string;
  expiresAt?: string;
  label?: string;
  revokedAt?: string;
  createdAt: string;
  accessCount: number;
}
```

### Public routes (no `requireCap`)

| Route | Purpose |
|-------|---------|
| `GET /s/:token` | Minimal HTML viewer (password form, file list, download) |
| `GET /public/shares/:token` | JSON entry metadata |
| `GET /public/shares/:token/content` | Text/JSON content |
| `GET /public/shares/:token/blob` | Binary download |
| `GET /public/shares/:token/children` | Folder children only |

Password: `X-Share-Password` header or `?password=` query on public routes.

### Security rules

1. Never put internal file UUIDs in public URLs — only `token`.
2. Public handlers resolve token → scoped `fileId`; **no** `files.list`,
   `files.search`, or parent traversal above shared root.
3. Agent workspace (`/api/files`) is outside the share system entirely.
4. Revoke is immediate (`revokedAt` set).
5. Expired shares return 410.
6. Rate-limit failed password attempts (defer: log + 429).

## Phase 3 — Drive Share UI

| # | Work |
|---|------|
| 3.1 | `ShareLinkModal` — create link, copy URL, optional password/expiry |
| 3.2 | Wire preview pane Share button |
| 3.3 | List active shares per file; revoke |
| 3.4 | Agent tools: `share_create`, `share_list`, `share_revoke` |

Public URL shape: `https://host/s/{token}`

## Phase 4 — Polish (later)

- Upload-only folder shares (Nextcloud file-request)
- View-only office render (HTML export, no raw JSON)
- Storage quota in sidebar
- Drag-and-drop move in grid view
- `core.drive` feature parity or deprecation note
- Nextcloud backend provider delegating `shares.*` to OCS

## Implementation order (this sprint)

1. `shared/capabilities/shares.ts`
2. `server/services/shareService.ts`
3. `server/routes/shareRoutes.ts` + mount in `server/index.ts`
4. Registry + agent tools
5. `useDrive` gaps + `ShareLinkModal` + public viewer
6. Manual test checklist below

## Test checklist

- [ ] Create folder + doc from Drive New menu
- [ ] Rename and move file via preview pane
- [ ] Upload a PDF; download it back
- [ ] Trash → restore → delete forever
- [ ] Agent creates file; Drive updates live without refresh
- [ ] Create share link; open in incognito `/s/:token`
- [ ] Password-protected share rejects wrong password
- [ ] Revoked share returns 404/410
- [ ] Folder share lists children only; cannot access parent
- [ ] Share URL does not expose other files or `/api/drive`

## Related docs

- `office-suite-plan.md` — Stage 1 Drive, typed mimes
- `app-platform-plan.md` — contracts, bridge, provider registry
- [Nextcloud OCS Share API](https://docs.nextcloud.com/server/stable/developer_manual/client_apis/OCS/ocs-share-api.html)
