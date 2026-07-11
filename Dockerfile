# Multi-stage so Mac/arm64 hosts can produce linux/amd64 images without
# running Vite/esbuild under QEMU (that path OOMs / crashes).
# Build stage uses the builder's native arch; runtime is the deploy target.

FROM --platform=$BUILDPLATFORM node:22-bookworm-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY model-manager/package.json model-manager/
COPY packages/app-sdk/package.json packages/app-sdk/
COPY packages/editor-kit/package.json packages/editor-kit/
COPY apps/desktop/package.json apps/desktop/
COPY apps/docs/package.json apps/docs/

ENV ARCO_SKIP_POSTINSTALL=1
RUN npm ci --ignore-scripts

COPY . .

ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm rebuild better-sqlite3
RUN npm run setup -- --skip-npm && npm run build

# ── runtime (target platform, e.g. linux/amd64 on Fly) ───────────────────────
FROM node:22-bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app /app

ENV ARCO_SKIP_POSTINSTALL=1
# Native addons from the build stage are host-arch; rebuild for the target.
RUN npm rebuild better-sqlite3

ENV NODE_ENV=production
ENV PORT=4600
ENV ARCO_DATA_DIR=/data

EXPOSE 4600

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4600) + '/api/system/install-status').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

VOLUME ["/data"]

CMD ["npm", "start"]
