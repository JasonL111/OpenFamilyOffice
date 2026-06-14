# Build the API. Run from the repo root: docker build -f apps/api/Dockerfile .
FROM node:20-slim AS base
RUN corepack enable
WORKDIR /repo

# Install deps (workspace-aware)
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile=false

# Copy source + build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @fo/shared build && \
    pnpm --filter @fo/api db:generate && \
    pnpm --filter @fo/api build

EXPOSE 4000
WORKDIR /repo/apps/api
CMD ["sh", "-c", "pnpm db:deploy && node dist/index.js"]
