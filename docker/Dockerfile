# syntax=docker/dockerfile:1.7

ARG TARGETPLATFORM=linux/amd64
ARG BUN_VERSION=1.3.10

# ============================================
# Base Stage: Bun runtime for amd64/x86 images
# ============================================
FROM --platform=$TARGETPLATFORM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app

RUN printf '%s\n%s\n' \
    'https://mirrors.aliyun.com/alpine/v3.22/main' \
    'https://mirrors.aliyun.com/alpine/v3.22/community' \
    > /etc/apk/repositories && \
    apk add --no-cache \
    libc6-compat \
    openssl \
    ca-certificates \
    nodejs \
    tini

# ============================================
# Builder Stage: Build all server-side apps
# ============================================
FROM base AS builder

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
ENV npm_config_registry=https://registry.npmmirror.com

# Copy full repo. Root .dockerignore already excludes node_modules/build output.
COPY . .

# Install workspace dependencies once for the whole monorepo.
# Fall back to a non-frozen install when the checked-in lockfile is stale, and
# clear Bun's cache before retrying to recover from transient tarball integrity
# failures during container builds.
RUN bun install --frozen-lockfile --ignore-scripts || \
    (rm -rf /root/.bun/install/cache && bun install --ignore-scripts) || \
    (rm -rf /root/.bun/install/cache && bun install --ignore-scripts)

# Build all runtime services that are deployed from this image.
# `required=false` lets local builds work even if no BuildKit secret is provided.
RUN --mount=type=secret,id=env,target=/tmp/build.env,required=false \
    echo "Building standalone server apps for ${TARGETPLATFORM}..." && \
    if [ -f /tmp/build.env ]; then set -a && . /tmp/build.env && set +a; fi && \
    export SKIP_ENV_VALIDATION=1 && \
    bun run --cwd apps/api build && \
    bun run --cwd apps/web build && \
    bun run --cwd apps/admin build && \
    bun run --cwd apps/marketing build && \
    bun run --cwd apps/docs build

# ============================================
# Runner Stage: Single image for all services
# ============================================
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next standalone bundles must be copied to the image root so each app keeps
# its original monorepo path, e.g. /app/apps/api/server.js.
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/marketing/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/docs/.next/standalone ./

COPY --from=builder --chown=nextjs:nodejs /app/apps/api/.next/static ./apps/api/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/marketing/.next/static ./apps/marketing/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/docs/.next/static ./apps/docs/.next/static

COPY --from=builder --chown=nextjs:nodejs /app/apps/api/public ./apps/api/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/public ./apps/admin/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/marketing/public ./apps/marketing/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/docs/public ./apps/docs/public

COPY --chown=nextjs:nodejs docker/start-all.sh /start-all.sh
RUN chmod +x /start-all.sh

USER nextjs

EXPOSE 3000 3001 3002 3003 3004

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/start-all.sh"]
