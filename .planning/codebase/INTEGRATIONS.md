# External Integrations

**Analysis Date:** 2026-03-23

## APIs & External Services

**AI Providers:**
- Anthropic Claude - LLM for agent and chat features
  - SDK: `@anthropic-ai/sdk ^0.78.0` (api), `@ai-sdk/anthropic ^3.0.43` (desktop, packages)
  - Auth: `ANTHROPIC_API_KEY`
  - Used in: `apps/api`, `apps/desktop`, `packages/agent`, `packages/chat`
- OpenAI - Alternative LLM provider
  - SDK: `@ai-sdk/openai 3.0.36`
  - Used in: `packages/chat`, `apps/desktop`

**Web Search:**
- Tavily - AI-optimized web search
  - SDK: `@tavily/core ^0.7.1`
  - Auth: `TAVILY_API_KEY` (optional)
  - Endpoint: `apps/api/src/app/api/chat/tools/web-search/route.ts`

**Project Management Integrations:**
- Linear - Issue tracker integration
  - SDK: `@linear/sdk ^68.1.0`
  - Auth: `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET`, `LINEAR_WEBHOOK_SECRET`
  - Routes: `apps/api/src/app/api/integrations/linear/`
    - `callback/route.ts` - OAuth callback
    - `connect/route.ts` - OAuth initiation
    - `webhook/route.ts` - Webhook handler
    - `jobs/initial-sync/route.ts` - Initial data sync job
    - `jobs/sync-task/route.ts` - Single task sync job

**Communication:**
- Slack - Workspace messaging integration
  - SDK: `@slack/web-api ^7.13.0`, `@slack/types ^2.19.0`
  - Auth: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`
  - Routes: `apps/api/src/app/api/integrations/slack/`
    - `events/route.ts` - Event subscriptions handler
    - `interactions/route.ts` - Interactive components handler
    - `callback/route.ts` - OAuth callback
    - `connect/route.ts` - OAuth initiation
    - `link/route.ts` - Link sharing
    - `jobs/process-assistant-message/route.ts` - Async agent message processing
    - `jobs/process-mention/route.ts` - Async mention processing
  - Internal billing notifications: `SLACK_BILLING_WEBHOOK_URL` (incoming webhook)

**Version Control:**
- GitHub - Code repository integration and GitHub App
  - SDK: `@octokit/app ^16.1.2`, `@octokit/rest ^22.0.1`, `@octokit/webhooks ^14.2.0`
  - Auth: `GH_APP_ID`, `GH_APP_PRIVATE_KEY`, `GH_WEBHOOK_SECRET` (GitHub App)
  - Auth: `GH_CLIENT_ID`, `GH_CLIENT_SECRET` (OAuth social login)
  - Routes: `apps/api/src/app/api/github/`
    - `webhook/route.ts` - GitHub App webhook handler
    - `callback/route.ts` - App installation callback
    - `install/route.ts` - App installation initiation
    - `sync/route.ts` - Repository sync trigger
    - `jobs/initial-sync/route.ts` - Initial repository sync job
    - `octokit.ts` - Authenticated Octokit instance

## Data Storage

**Databases:**
- Neon PostgreSQL - Primary cloud database
  - SDK: `@neondatabase/serverless 1.0.2`
  - ORM: Drizzle ORM 0.45.1
  - Connection vars: `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED`
  - Schema: `packages/db/src/schema/`
  - Client: `packages/db/src/client.ts`
  - Migrations: `packages/db/drizzle/` (auto-generated, never edit manually)
  - Branch workflow: Create new Neon branches for migrations
- Local SQLite (Desktop) - Embedded local database
  - Driver: `better-sqlite3 12.6.2` + `libsql 0.5.22`
  - ORM: Drizzle ORM
  - Schema: `packages/local-db/src/schema/`
  - Generated migrations: `bun run --cwd packages/local-db generate`

**Real-time Sync:**
- ElectricSQL - Real-time Postgres sync layer
  - SDK: `@electric-sql/client 1.5.12`
  - Deployment: Fly.io (`fly.toml`, image `electricsql/electric:1.4.13`)
  - Auth: `ELECTRIC_URL`, `ELECTRIC_SECRET`, `ELECTRIC_SOURCE_ID`, `ELECTRIC_SOURCE_SECRET`
  - Auth proxy: `apps/api/src/app/api/electric/[...path]/route.ts` (JWT + session auth)
  - Client proxy: `apps/electric-proxy` (Cloudflare Worker with Wrangler)
  - Used by: `apps/desktop`, `apps/mobile` via `@tanstack/electric-db-collection`

**File Storage:**
- Vercel Blob - Cloud file storage
  - SDK: `@vercel/blob ^2.0.0`
  - Auth: `BLOB_READ_WRITE_TOKEN`
  - Used for: chat attachments (`apps/api/src/app/api/chat/[sessionId]/attachments/route.ts`)

**Caching / KV:**
- Upstash Redis - Serverless Redis (rate limiting, caching)
  - SDK: `@upstash/redis ^1.34.3`, `@upstash/ratelimit ^2.0.4`
  - Auth: `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_URL`
  - Also accessible via: `@vercel/kv ^3.0.0`

**Message Queue:**
- Upstash QStash - Serverless message queue / background jobs
  - SDK: `@upstash/qstash ^2.8.4`
  - Auth: `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
  - Used for: Slack notifications on billing events, async integration processing

**Event Streaming:**
- Durable Streams - Custom durable event streaming service
  - SDK: `@durable-streams/client ^0.2.1`
  - Auth: `DURABLE_STREAMS_URL`, `DURABLE_STREAMS_SECRET`
  - Used in: `apps/api`, `apps/desktop`

## Authentication & Identity

**Auth Provider:**
- better-auth 1.4.18 - Primary authentication framework
  - Implementation: `packages/auth/src/server.ts`
  - Drizzle adapter: `better-auth/adapters/drizzle`
  - Session storage: database (30-day expiry, 5-min cookie cache)
  - Cross-subdomain cookies: `NEXT_PUBLIC_COOKIE_DOMAIN`
  - Plugins: `apiKey`, `jwt` (RS256, 1h expiry), `oauthProvider`, `expo`, `organization`, `bearer`, `customSession`, `stripe`

**Social OAuth Providers:**
- GitHub OAuth - `GH_CLIENT_ID`, `GH_CLIENT_SECRET`
- Google OAuth - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

**OAuth Server:**
- better-auth `oauthProvider` plugin - Superset acts as OAuth server (for MCP/third-party clients)
  - Dynamic client registration enabled
  - Login: `{WEB_URL}/sign-in`, Consent: `{WEB_URL}/oauth/consent`

**JWT:**
- JOSE `^6.1.3` - JWT signing/verification
- RS256 algorithm, 1h token expiry
- JWT contains: `sub`, `email`, `organizationIds`

**API Keys:**
- better-auth `apiKey` plugin - prefix `sk_live_`

**Mobile Auth:**
- `@better-auth/expo 1.4.18` - Expo-compatible auth adapter

## Billing

**Payment Processing:**
- Stripe - Subscription billing
  - SDK: `stripe ^20.2.0`
  - Auth: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - Plans: `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_YEARLY_PRICE_ID`, `STRIPE_ENTERPRISE_YEARLY_PRICE_ID`
  - Integration: `@better-auth/stripe 1.4.18` plugin
  - Client: `packages/auth/src/stripe.ts`
  - Webhook handler: Managed by better-auth stripe plugin
  - Features: seat-based billing, proration, billing portal, promotional codes
  - Internal bypass: `INTERNAL_TEAM=true` disables Stripe, grants pro automatically

## Email

**Email Sending:**
- Resend - Transactional email
  - SDK: `resend ^4.0.1`
  - Auth: `RESEND_API_KEY`
  - From: `noreply@superset.sh`
  - Templates: React Email components in `packages/email/src/emails/`
  - Templates include: `organization-invitation`, `member-added`, `member-removed`, `subscription-started`, `subscription-cancelled`, `payment-failed`
  - Library: `@react-email/components 1.0.1` + `@react-email/tailwind 2.0.3`

## Monitoring & Observability

**Error Tracking:**
- Sentry - Error monitoring across all web apps and desktop
  - SDK: `@sentry/nextjs ^10.36.0` (web, api, admin, marketing), `@sentry/electron ^7.7.0` (desktop), `@sentry/vite-plugin ^4.7.0`
  - Auth: `SENTRY_AUTH_TOKEN`
  - Config: Per-app `sentry.server.config.ts`, `sentry.edge.config.ts`
  - DSN env vars: `NEXT_PUBLIC_SENTRY_DSN_API`, `NEXT_PUBLIC_SENTRY_DSN_WEB`, `NEXT_PUBLIC_SENTRY_DSN_MARKETING`
  - Org: `superset-sh`

**Analytics:**
- PostHog - Product analytics
  - SDK: `posthog-node ^5.24.7` (server), `posthog-js 1.310.1` (browser), `posthog-react-native ^4.23.0` (mobile)
  - Auth: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
  - API: `POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID`
  - Server client: `apps/api/src/lib/analytics.ts`

**User Monitoring:**
- Outlit - Session recording / user monitoring
  - SDK: `@outlit/browser ^1.4.3` (web, desktop), `@outlit/node ^1.4.3` (desktop)
  - Auth: `NEXT_PUBLIC_OUTLIT_KEY`
  - Used in: `apps/web`, `apps/marketing`, `apps/desktop`

## CI/CD & Deployment

**Hosting:**
- Vercel - `apps/web`, `apps/api`, `apps/admin`, `apps/marketing`, `apps/docs` (inferred from Sentry `automaticVercelMonitors: true` and `VERCEL` env pass-through)
- Fly.io - ElectricSQL server (`fly.toml`)
- Cloudflare Workers - `apps/electric-proxy` (wrangler)
- Docker - Available for self-hosted (`docker/`, `docker-compose.yml`, `docker-compose.prod.yml`)

**CI Pipeline:**
- GitHub Actions (inferred from `CI` env pass-through in turbo and Sentry config)

**Desktop Releases:**
- electron-builder - Build and sign desktop app
- `./apps/desktop/create-release.sh` - Desktop release script (`bun run release:desktop`)
- `./scripts/release-canary.sh` - Canary release (`bun run release:canary`)

## Protocol & Developer Integrations

**MCP (Model Context Protocol):**
- `@modelcontextprotocol/sdk ^1.26.0` - MCP server/client SDK
- `packages/mcp` - Shared MCP server utilities
- `packages/desktop-mcp` - Desktop MCP server binary (`puppeteer-core` for browser automation)
- `apps/mobile` - `EXPO_UNSTABLE_MCP_SERVER=1 expo start` enables mobile MCP

## Webhooks & Callbacks

**Incoming:**
- `apps/api/src/app/api/github/webhook/route.ts` - GitHub App webhook events
- `apps/api/src/app/api/integrations/linear/webhook/route.ts` - Linear webhook events
- `apps/api/src/app/api/integrations/slack/events/route.ts` - Slack Events API
- `apps/api/src/app/api/integrations/slack/interactions/route.ts` - Slack interactive components
- `apps/api/src/app/api/integrations/stripe/jobs/notify-slack/route.ts` - Stripe billing events (via QStash)

**Outgoing:**
- Slack billing webhook: `SLACK_BILLING_WEBHOOK_URL` - Billing event notifications to internal Slack channel
- QStash job publishing for async processing of billing events and integration sync jobs

## Environment Configuration

**Required server env vars (api):**
- `DATABASE_URL`, `DATABASE_URL_UNPOOLED` - Neon PostgreSQL
- `ELECTRIC_URL`, `ELECTRIC_SECRET` - ElectricSQL
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob
- `GH_CLIENT_ID`, `GH_CLIENT_SECRET` - GitHub OAuth
- `GH_APP_ID`, `GH_APP_PRIVATE_KEY`, `GH_WEBHOOK_SECRET` - GitHub App
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `BETTER_AUTH_SECRET` - Auth signing secret
- `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET`, `LINEAR_WEBHOOK_SECRET`
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`
- `ANTHROPIC_API_KEY`
- `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
- `RESEND_API_KEY`
- `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_URL`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_YEARLY_PRICE_ID`
- `SLACK_BILLING_WEBHOOK_URL`
- `SECRETS_ENCRYPTION_KEY`
- `DURABLE_STREAMS_URL`, `DURABLE_STREAMS_SECRET`

**Optional server env vars:**
- `TAVILY_API_KEY` - Web search (optional feature)
- `SENTRY_AUTH_TOKEN`
- `ELECTRIC_SOURCE_ID`, `ELECTRIC_SOURCE_SECRET`
- `INTERNAL_TEAM=true` - Bypasses Stripe billing for internal dev

**Public client vars:**
- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_ADMIN_URL`, `NEXT_PUBLIC_MARKETING_URL`
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_OUTLIT_KEY`
- `NEXT_PUBLIC_COOKIE_DOMAIN`
- `NEXT_PUBLIC_SENTRY_DSN_API`, `NEXT_PUBLIC_SENTRY_DSN_WEB`, `NEXT_PUBLIC_SENTRY_DSN_MARKETING`
- `NEXT_PUBLIC_ELECTRIC_URL`

**Secrets location:**
- Single root `.env` file (not committed)
- All apps load env from `../../.env` relative to app directory

---

*Integration audit: 2026-03-23*
