# Downloads overlay for Fly dist-patch

Older `kosmos-template:demo` runtimes predate `os.downloads@1`. Copying HEAD
`server/index.ts` onto those images crash-loops (missing `entryGate`, etc.).

This overlay:

1. Keeps the base image's `server/index.ts` shape
2. Mounts `/api/downloads/*` via `downloadsRoutes.ts`
3. Adds `torrentService` + `shared/capabilities/downloads.ts`
4. Extends the models-remote `env.ts` patch with `dataDirs.torrents`

Regenerate `server-index.ts` from a live tenant when the base image changes:

```bash
fly ssh console -a kosmos-kosmos -C "cat /app/server/index.ts" > /tmp/base-index.ts
# re-apply the torrentService import, ensureReady, route mount, and API 404
```
