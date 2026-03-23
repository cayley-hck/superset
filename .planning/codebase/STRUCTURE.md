# Codebase Structure

**Analysis Date:** 2026-03-23

## Directory Layout

```
superset/                         # Monorepo root
├── apps/
│   ├── web/                      # Main SaaS web app (app.superset.sh) — Next.js
│   ├── api/                      # Backend API — Next.js (tRPC, auth, webhooks, AI)
│   ├── admin/                    # Internal admin dashboard — Next.js
│   ├── marketing/                # Marketing site (superset.sh) — Next.js
│   ├── docs/                     # Documentation site — Next.js + Fumadocs
│   ├── desktop/                  # Electron desktop app (macOS)
│   ├── mobile/                   # Expo/React Native mobile app
│   └── streams/                  # Placeholder (empty, reserved)
├── packages/
│   ├── trpc/                     # Shared cloud tRPC router definitions
│   ├── db/                       # Drizzle ORM schema + client (Neon PostgreSQL)
│   ├── local-db/                 # Drizzle ORM schema + client (SQLite, desktop)
│   ├── auth/                     # better-auth config, Stripe, Resend
│   ├── ui/                       # Shared React UI components (shadcn/ui + Tailwind v4)
│   ├── shared/                   # Shared constants, auth roles, types
│   ├── agent/                    # AI agent (Mastra framework, Anthropic/OpenAI)
│   ├── chat/                     # Chat protocol, auth storage, slash commands
│   ├── chat-mastra/              # Mastra-based chat server tRPC + React client hooks
│   ├── mcp/                      # Cloud MCP server (tasks, devices, organizations)
│   ├── desktop-mcp/              # Desktop browser automation MCP server
│   ├── host-service/             # Hono+tRPC microservice for local workspace ops
│   ├── workspace-fs/             # Filesystem abstraction (host + client sides)
│   ├── macos-process-metrics/    # Native macOS process metrics (NAPI addon)
│   ├── scripts/                  # CLI tooling scripts
│   └── email/                    # Transactional email templates (React Email)
├── tooling/
│   └── typescript/               # Shared tsconfig presets (base, nextjs, electron)
├── .agents/
│   └── commands/gsd/             # Shared slash command definitions
├── .claude/                      # Claude agent configs and GSD workflows
├── .planning/
│   └── codebase/                 # Codebase analysis documents (this directory)
├── docker/                       # Docker configs for self-hosted deployment
├── docs/                         # Internal documentation, tickets, cookbook
├── scripts/                      # Root-level shell scripts (lint, release, etc.)
├── patches/                      # Patched npm dependencies (bun patchedDependencies)
├── turbo.jsonc                   # Turborepo task definitions
├── biome.json                    # Biome formatter + linter config (root-level)
├── package.json                  # Root workspace manifest (Bun workspaces)
├── Caddyfile                     # Caddy reverse proxy config for local dev
└── bun.lock                      # Bun lockfile
```

## Directory Purposes

**`apps/api/`:**
- Purpose: The central cloud backend; all HTTP endpoints
- Contains: Next.js App Router API routes only (no pages)
- Key files:
  - `apps/api/src/app/api/trpc/[trpc]/route.ts` — tRPC HTTP handler
  - `apps/api/src/app/api/auth/[...all]/route.ts` — better-auth handler
  - `apps/api/src/app/api/chat/[sessionId]/route.ts` — AI chat streaming
  - `apps/api/src/app/api/electric/[...path]/route.ts` — ElectricSQL auth proxy
  - `apps/api/src/app/api/github/webhook/route.ts` — GitHub webhook handler
  - `apps/api/src/app/api/integrations/` — Slack and Stripe webhook handlers
  - `apps/api/src/trpc/context.ts` — tRPC context factory

**`apps/web/`:**
- Purpose: Main authenticated user dashboard
- Contains: Next.js pages for settings, integrations, tasks, OAuth consent
- Key files:
  - `apps/web/src/app/(dashboard)/` — authenticated dashboard routes
  - `apps/web/src/app/(auth)/` — sign-in/sign-up (Clerk)
  - `apps/web/src/trpc/react.tsx` — TRPCReactProvider and `useTRPC` hook
  - `apps/web/src/trpc/server.tsx` — server-side tRPC caller
  - `apps/web/src/trpc/client.ts` — raw tRPC client

**`apps/admin/`:**
- Purpose: Internal admin analytics dashboard
- Contains: Next.js dashboard with metrics, charts, user management
- Key files:
  - `apps/admin/src/app/(dashboard)/` — dashboard pages with charts
  - `apps/admin/src/trpc/` — tRPC client setup (mirrors web pattern)

**`apps/desktop/`:**
- Purpose: Electron desktop application for macOS
- Contains: Main process (Node.js), renderer process (React), shared constants
- Key directories:
  - `apps/desktop/src/main/` — Electron main process code
  - `apps/desktop/src/main/lib/` — main process services (terminal, tray, auto-updater, host-service-manager, extensions, etc.)
  - `apps/desktop/src/renderer/` — React renderer process code
  - `apps/desktop/src/renderer/routes/` — TanStack Router route tree
  - `apps/desktop/src/renderer/screens/main/components/` — feature UI (WorkspaceSidebar, WorkspaceView, etc.)
  - `apps/desktop/src/renderer/stores/` — Zustand state stores
  - `apps/desktop/src/renderer/providers/` — React providers (ElectronTRPCProvider, AuthProvider, etc.)
  - `apps/desktop/src/lib/trpc/routers/` — IPC tRPC routers served from main process
  - `apps/desktop/src/shared/` — Constants shared across main/renderer boundary

**`apps/mobile/`:**
- Purpose: React Native (Expo) mobile app
- Contains: Expo Router screens, native modules
- Key directories:
  - `apps/mobile/app/` — Expo Router route tree
  - `apps/mobile/screens/` — screen components (co-located with routes)
  - `apps/mobile/screens/(authenticated)/(home)/` — main authenticated screens (workspaces, tasks, more)
  - `apps/mobile/modules/` — native Expo modules
  - `apps/mobile/hooks/`, `apps/mobile/components/`, `apps/mobile/lib/`

**`apps/marketing/`:**
- Purpose: Public marketing website
- Contains: Next.js pages, MDX blog/changelog, static content
- Key directories:
  - `apps/marketing/content/` — MDX content (blog posts, changelog, compare pages, team bios)
  - `apps/marketing/src/app/` — Next.js pages with components co-located
  - `apps/marketing/src/app/components/` — shared marketing page components

**`apps/docs/`:**
- Purpose: Public documentation site (Fumadocs-powered)
- Contains: MDX content, Next.js App Router, content config
- Key files:
  - `apps/docs/content/docs/` — documentation MDX files
  - `apps/docs/source.config.ts` — Fumadocs source configuration

**`packages/trpc/`:**
- Purpose: Canonical definition of all cloud tRPC routes
- Contains: Router files, tRPC init, context types
- Key files:
  - `packages/trpc/src/root.ts` — composes all sub-routers into `appRouter`
  - `packages/trpc/src/trpc.ts` — `publicProcedure`, `protectedProcedure`, `adminProcedure`
  - `packages/trpc/src/router/` — domain routers (one dir per domain)

**`packages/db/`:**
- Purpose: Cloud PostgreSQL schema and Drizzle client
- Contains: Schema files, migration output (auto-generated)
- Key files:
  - `packages/db/src/schema/schema.ts` — main tables (workspaces, projects, tasks, integrations, devices)
  - `packages/db/src/schema/auth.ts` — auth tables (users, sessions, organizations)
  - `packages/db/src/schema/github.ts` — GitHub repo tables
  - `packages/db/drizzle/` — auto-generated migrations (NEVER manually edit)

**`packages/local-db/`:**
- Purpose: Desktop SQLite schema and Drizzle client
- Contains: SQLite schema, migrations
- Key files:
  - `packages/local-db/src/schema/schema.ts` — local tables (projects, workspaces, settings)
  - `packages/local-db/drizzle/` — auto-generated migrations (NEVER manually edit)

**`packages/auth/`:**
- Purpose: Centralized `better-auth` configuration shared across api and web
- Key files:
  - `packages/auth/src/server.ts` — `auth` instance (better-auth with Stripe, Expo, OAuth provider plugins)
  - `packages/auth/src/stripe.ts` — Stripe client
  - `packages/auth/src/env.ts` — auth environment variables

**`packages/ui/`:**
- Purpose: Shared design system
- Key directories:
  - `packages/ui/src/components/ui/` — shadcn/ui components (kebab-case single files, e.g. `button.tsx`)
  - `packages/ui/src/components/ai-elements/` — AI-specific UI components (shadcn convention)
  - `packages/ui/src/atoms/` — custom atoms using `ComponentName/ComponentName.tsx` + `index.ts` convention
  - `packages/ui/src/hooks/` — shared React hooks
  - `packages/ui/src/assets/icons/` — icon assets including preset icons

**`packages/host-service/`:**
- Purpose: Hono-based tRPC HTTP server for local git/file operations
- Key files:
  - `packages/host-service/src/app.ts` — Hono app factory with dependency injection
  - `packages/host-service/src/serve.ts` — standalone process entry (port 4879)
  - `packages/host-service/src/trpc/router/` — sub-routers (git, github, cloud, project, workspace, health)
  - `packages/host-service/src/auth/providers/` — `JwtAuthProvider`, `DeviceKeyAuthProvider`

**`packages/agent/`:**
- Purpose: AI agent implementation using Mastra
- Key files:
  - `packages/agent/src/superagent.ts` — Mastra Agent factory with Anthropic/OpenAI support
  - `packages/agent/src/tools/` — agent tool definitions

**`packages/chat/`:**
- Purpose: Chat protocol layer (authentication, slash commands, title generation)
- Key directories:
  - `packages/chat/src/host/chat-service/` — chat service, OAuth flows for Anthropic/OpenAI
  - `packages/chat/src/host/slash-commands/` — slash command discovery
  - `packages/chat/src/host/router/` — file search, MCP overview router helpers

**`packages/chat-mastra/`:**
- Purpose: Mastra-based runtime session management for chat
- Key directories:
  - `packages/chat-mastra/src/server/trpc/` — tRPC procedures for runtime lifecycle
  - `packages/chat-mastra/src/server/trpc/utils/runtime/` — runtime session type and helpers
  - `packages/chat-mastra/src/client/` — React provider and hooks for chat UI

**`packages/mcp/`:**
- Purpose: Cloud-facing MCP server exposing Superset data as MCP tools
- Key directories:
  - `packages/mcp/src/tools/organizations/` — list members
  - `packages/mcp/src/tools/tasks/` — CRUD operations for tasks
  - `packages/mcp/src/tools/devices/` — workspace management tools

**`packages/desktop-mcp/`:**
- Purpose: Desktop browser automation MCP server
- Key files:
  - `packages/desktop-mcp/src/mcp/mcp-server.ts` — MCP server
  - `packages/desktop-mcp/src/mcp/tools/` — DOM inspector, console capture, screenshot, navigation

**`packages/workspace-fs/`:**
- Purpose: File system abstraction for workspace operations
- Key files:
  - `packages/workspace-fs/src/core/service.ts` — `FsService` interface
  - `packages/workspace-fs/src/host/service.ts` — `FsHostService` implementation
  - `packages/workspace-fs/src/client/` — client-side proxy

## Key File Locations

**Entry Points:**
- `apps/api/src/app/api/trpc/[trpc]/route.ts` — cloud tRPC handler
- `apps/api/src/app/api/auth/[...all]/route.ts` — better-auth handler
- `apps/desktop/src/main/index.ts` — Electron main process entry
- `apps/desktop/src/renderer/index.tsx` — Electron renderer entry
- `apps/mobile/app/_layout.tsx` — Expo Router root layout

**Configuration:**
- `turbo.jsonc` — Turborepo task graph
- `biome.json` — formatter and linter config (root-level, applies to all packages)
- `tooling/typescript/` — shared tsconfig presets
- `apps/desktop/electron.vite.config.ts` — electron-vite build config
- `apps/desktop/electron-builder.ts` — Electron Builder packaging config

**Core Logic:**
- `packages/trpc/src/root.ts` — entire cloud API surface
- `packages/trpc/src/trpc.ts` — procedure factories and auth guards
- `packages/db/src/schema/schema.ts` — cloud data model
- `packages/local-db/src/schema/schema.ts` — desktop data model
- `packages/auth/src/server.ts` — auth configuration
- `apps/desktop/src/lib/trpc/routers/workspaces/` — workspace/git operations
- `apps/desktop/src/lib/trpc/routers/workspaces/utils/git-client.ts` — canonical git helper (use this, not raw `execFile("git")`)

**Testing:**
- Co-located with source files: `*.test.ts` or `*.test.tsx` next to the file under test
- Examples: `packages/workspace-fs/src/host/service.test.ts`, `apps/desktop/src/lib/trpc/routers/workspaces/utils/git.test.ts`

## Naming Conventions

**Files:**
- React components: `PascalCase` folder + file + `index.ts` barrel (e.g., `WorkspaceSidebar/WorkspaceSidebar.tsx`)
- shadcn/ui components: `kebab-case` single files (e.g., `button.tsx`, `base-node.tsx`) in `components/ui/`
- Hooks: `camelCase` with `use` prefix in their own folder (e.g., `hooks/useMetrics/useMetrics.ts`)
- Utilities: `camelCase` in their own folder (e.g., `utils/formatData/formatData.ts`)
- Test files: `<name>.test.ts` or `<name>.test.tsx` co-located with source

**Directories:**
- Components: `PascalCase` matching component name (e.g., `WorkspaceSidebar/`)
- Feature sub-components: nested `components/` sub-directory inside the parent component folder
- Route groups: parenthesized lowercase (e.g., `(dashboard)/`, `(auth)/`, `(authenticated)/`)
- Dynamic routes: bracketed (e.g., `[slug]/`, `[trpc]/`, `[...path]/`)

**Package Names:**
- Internal packages: `@superset/<name>` (e.g., `@superset/trpc`, `@superset/ui`)

## Where to Add New Code

**New Cloud API Procedure:**
- Add sub-router procedure in `packages/trpc/src/router/<domain>/<domain>.ts`
- Register in `packages/trpc/src/root.ts` if it's a new domain router
- No changes needed in `apps/api/` unless adding a new HTTP route

**New REST/Webhook API Route:**
- Add route handler in `apps/api/src/app/api/<feature>/route.ts`

**New Web Dashboard Page:**
- Add page in `apps/web/src/app/(dashboard)/<feature>/page.tsx`
- Co-locate components in `apps/web/src/app/(dashboard)/<feature>/components/<ComponentName>/`

**New Desktop IPC Procedure:**
- Add procedure to existing router in `apps/desktop/src/lib/trpc/routers/<domain>/`
- Or create new router file and register in `apps/desktop/src/lib/trpc/routers/index.ts`
- For subscriptions, use `observable` pattern (not async generators — trpc-electron limitation)
- Use `apps/desktop/src/lib/trpc/routers/workspaces/utils/git-client.ts` for all git operations

**New Desktop UI Component:**
- Feature-specific: `apps/desktop/src/renderer/screens/main/components/<ComponentName>/<ComponentName>.tsx` + `index.ts`
- Shared: `apps/desktop/src/renderer/components/<ComponentName>/<ComponentName>.tsx`
- Shared across apps: `packages/ui/src/atoms/<ComponentName>/<ComponentName>.tsx` + `index.ts`

**New Database Table (Cloud):**
- Add to `packages/db/src/schema/schema.ts` or create a new schema file
- Export from `packages/db/src/schema/index.ts`
- Ask user to run `bunx drizzle-kit generate --name="<migration_name>"`; never manually edit `packages/db/drizzle/`

**New Database Table (Desktop):**
- Add to `packages/local-db/src/schema/schema.ts`
- Run `bun run --cwd packages/local-db generate`

**New Shared Utility:**
- If used in 2+ packages: `packages/shared/src/<feature>.ts`
- If used only in one app: co-locate in that app's `utils/` or `lib/` directory

**New Email Template:**
- Add to `packages/email/src/emails/<template-name>.tsx`
- Import in `packages/auth/src/server.ts` or relevant package

**New MCP Tool (Cloud):**
- Add tool directory in `packages/mcp/src/tools/<domain>/<tool-name>/`

## Special Directories

**`apps/desktop/src/shared/`:**
- Purpose: Constants and types shared between Electron main and renderer (must be importable by both)
- Generated: No
- Committed: Yes

**`packages/db/drizzle/`:**
- Purpose: Auto-generated Drizzle migration SQL files and metadata
- Generated: Yes (by `drizzle-kit generate`)
- Committed: Yes — NEVER manually edit

**`packages/local-db/drizzle/`:**
- Purpose: Auto-generated Drizzle migration SQL files for desktop SQLite
- Generated: Yes
- Committed: Yes — NEVER manually edit

**`apps/desktop/src/renderer/routeTree.gen.ts`:**
- Purpose: Auto-generated TanStack Router route tree
- Generated: Yes (by `@tanstack/router-plugin/vite`)
- Committed: Yes — NEVER manually edit

**`.agents/commands/gsd/`:**
- Purpose: Shared slash command definitions for all AI agents (Claude, Cursor, OpenCode)
- Generated: No
- Committed: Yes — `.claude/commands` and `.cursor/commands` are symlinks to `../.agents/commands`

**`.planning/codebase/`:**
- Purpose: Codebase analysis documents for GSD planning workflow
- Generated: Yes (by GSD map-codebase agent)
- Committed: No (typically gitignored)

---

*Structure analysis: 2026-03-23*
