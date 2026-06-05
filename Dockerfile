# syntax=docker/dockerfile:1

# ---- base: pin Node + pnpm once, reuse everywhere -------------------------
FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# ---- deps: install with the frozen lockfile -------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- builder: compile the standalone server bundle ------------------------
FROM base AS builder
# NEXT_PUBLIC_* values are inlined at build time, so they must be present here
# (not just at runtime). Defaults match the app's own fallbacks.
ARG NEXT_PUBLIC_REGISTRATION_MODE=Open
ENV NEXT_PUBLIC_REGISTRATION_MODE=$NEXT_PUBLIC_REGISTRATION_MODE
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- runner: minimal production image -------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# server.js (standalone) honours these; bind to all interfaces so Coolify's
# reverse proxy can reach the container.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as an unprivileged user.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# The standalone bundle ships its own trimmed node_modules + server.js.
# static/ and public/ are NOT included by the trace and must be copied in.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
