# Architecture

**Analysis Date:** 2026-03-23

## Pattern Overview

**Overall:** Multi-surface monorepo with layered tRPC API architecture

**Key Characteristics:**
- Single `@superset/trpc` package defines all cloud API routes, consumed by Next.js apps and the mobile app via HTTP
- Electron desktop app has a dual tRPC topology: cloud HTTP tRPC (via `@superset/trpc`) and a local IPC tRPC layer (via `trpc-electron`) served from the main process
- A standalone `@superset/host-service` Hono microservice runs per-desktop-workspace to expose local git/file operations over tRPC
- Database schema lives in `@superset/db` (Drizzle + Neon/PostgreSQL) for cloud, and `@superset/local-db` (Drizzle + SQLite) for per-device desktop state
- Authentication is centralized in `@superset/auth` using `better-auth` with Drizzle adapter

## Layers

**Cloud API Layer:**
- Purpose: Exposes all business logic to web, admin, and mobile clients
- Location: `apps/api/src/app/api/`
- Contains: Next.js route handlers for tRPC, auth (better-auth), chat (AI streaming), GitHub webhooks, Stripe/Slack/Linear integrations, ElectricSQL proxy, agent transport
- Depends on: `@superset/trpc`, `@superset/auth`, `@superset/db`
- Used by: `apps/web`, `apps/admin`, `apps/mobile`

**Shared tRPC Router:**
- Purpose: Single source of all cloud procedure definitions and router composition
- Location: `packages/trpc/src/`
- Contains: `root.ts` (appRouter), sub-routers per domain in `packages/trpc/src/router/` (admin, agent, analytics, apiKey, billing, chat, device, integration, organization, project, task, user, v2Project, v2Workspace, workspace), `trpc.ts` (publicProcedure, protectedProcedure, adminProcedure)
- Depends on: `@superset/db`, `@superset/auth`, `@superset/shared`
- Used by: `apps/api`, `apps/web` (server-side caller), `apps/desktop` (via HTTP client)

**Web App (app.superset.sh):**
- Purpose: Main authenticated SaaS dashboard
- Location: `apps/web/src/`
- Contains: Next.js App Router pages in `apps/web/src/app/`, tRPC client setup in `apps/web/src/trpc/` (`client.ts`, `react.tsx`, `server.tsx`, `query-client.ts`)
- Depends on: `@superset/trpc`, `@superset/ui`, `@superset/auth`
- Used by: End users (browser)

**Electron Desktop App:**
- Purpose: Native desktop client with git worktree management, embedded AI agents, local terminal
- Location: `apps/desktop/src/`
- Contains:
  - `src/main/` — Electron main process (Node.js): app lifecycle, IPC tRPC server, terminal, tray, auto-updater, local DB, agent hooks
  - `src/renderer/` — Electron renderer process (React + TanStack Router): UI screens, stores (Zustand), React Query hooks, TanStack Router routes
  - `src/lib/trpc/routers/` — IPC tRPC router definitions (workspaces, projects, chat, browser, filesystem, etc.)
  - `src/shared/` — Constants shared across main/renderer boundary
- Depends on: `@superset/local-db`, `@superset/agent`, `@superset/chat`, `@superset/host-service`, `@superset/workspace-fs`, `@superset/desktop-mcp`
- Used by: Desktop users (macOS)

**Electron IPC tRPC (Desktop-local):**
- Purpose: Type-safe IPC between renderer and main process using `trpc-electron`
- Location: `apps/desktop/src/lib/trpc/` (server-side), `apps/desktop/src/renderer/lib/electron-trpc.ts` (client-side)
- Contains: IPC procedures for local operations not available via cloud (git operations, terminal, file system, resource metrics, workspace init, agent session management)
- Pattern: Uses `observable` (not async generators) for subscriptions — trpc-electron requires observables
- Used by: All renderer components that need local main process operations

**Host Service:**
- Purpose: Standalone Hono+tRPC HTTP microservice for local workspace file/git operations (used by cloud agent and desktop)
- Location: `packages/host-service/src/`
- Contains: `app.ts` (Hono app factory), `serve.ts` (standalone entry), `trpc/router/` (cloud, git, github, health, project, workspace sub-routers)
- Depends on: Drizzle SQLite via `createDb`, pluggable auth (`JwtAuthProvider` or `DeviceKeyAuthProvider`), pluggable git credentials (`LocalCredentialProvider` or `CloudCredentialProvider`)
- Used by: `apps/desktop` (via `getHostServiceManager`), cloud agent sessions

**Agent Layer:**
- Purpose: AI agent execution using Mastra framework
- Location: `packages/agent/src/`
- Contains: `superagent.ts` (Mastra Agent wrapping Anthropic/OpenAI), tool definitions in `packages/agent/src/tools/`
- Depends on: `mastracode` (Superset's internal fork of Mastra), `@ai-sdk/anthropic`, `@mastra/core`, `@mastra/memory`
- Used by: `packages/chat-mastra`, `apps/desktop` (chat service)

**Chat Layer:**
- Purpose: Chat protocol handling, AI model auth, slash commands, session management
- Location: `packages/chat/src/` and `packages/chat-mastra/src/`
- Contains:
  - `packages/chat/src/host/chat-service/` — chat service, auth storage, Anthropic/OpenAI OAuth
  - `packages/chat/src/host/slash-commands/` — slash command discovery from `.claude/commands`
  - `packages/chat-mastra/src/server/trpc/` — tRPC procedures for runtime lifecycle, MCP management, file search
  - `packages/chat-mastra/src/client/` — React hooks and provider for chat UI
- Used by: `apps/desktop` (desktop chat), `apps/api` (cloud chat sessions)

**MCP Integration:**
- Purpose: Model Context Protocol tools exposed to cloud agents
- Location: `packages/mcp/src/tools/` (cloud MCP) and `packages/desktop-mcp/src/` (desktop browser automation MCP)
- Contains:
  - Cloud MCP: tools for organizations, tasks, devices (workspaces), exposed over MCP protocol
  - Desktop MCP: browser automation tools (DOM inspector, console capture, screenshot) served as MCP server from desktop app

**Database Layer:**
- Purpose: Schema and query utilities for PostgreSQL (cloud) and SQLite (desktop)
- Location: `packages/db/src/` (cloud), `packages/local-db/src/` (desktop)
- Cloud schema files: `packages/db/src/schema/schema.ts` (core tables), `packages/db/src/schema/auth.ts`, `packages/db/src/schema/github.ts`, `packages/db/src/schema/enums.ts`, `packages/db/src/schema/relations.ts`
- Desktop schema: `packages/local-db/src/schema/schema.ts` (projects, workspaces as SQLite tables using integer IDs and `uuid` library)
- Pattern: Never manually edit files in `packages/db/drizzle/` or `packages/local-db/drizzle/` — auto-generated by Drizzle

**Shared Utilities:**
- Purpose: Cross-package constants, auth roles, shared types
- Location: `packages/shared/src/`
- Contains: `auth/roles/`, `auth/authorization/`, `constants.ts`, `names/`, `terminal-link-parsing/`

**UI Package:**
- Purpose: Shared React component library
- Location: `packages/ui/src/`
- Contains: `components/ui/` (shadcn/ui kebab-case single files), `components/ai-elements/`, `atoms/`, `hooks/`, `lib/`, `assets/icons/`
- Pattern: shadcn/ui components use flat kebab-case files; custom atoms use `ComponentName/ComponentName.tsx` + `index.ts` barrel

## Data Flow

**Web Client → Cloud API:**
1. React component calls `useTRPC()` hook (from `apps/web/src/trpc/react.tsx`)
2. tRPC React client sends HTTP batch stream request to `NEXT_PUBLIC_API_URL/api/trpc`
3. `apps/api/src/app/api/trpc/[trpc]/route.ts` handles request via `fetchRequestHandler`
4. `createContext` (in `apps/api/src/trpc/context.ts`) calls `auth.api.getSession()` and passes session to `createTRPCContext`
5. Matching procedure in `packages/trpc/src/router/` executes with Drizzle ORM against Neon PostgreSQL
6. Response returned via SuperJSON transformer

**Desktop Renderer → Main Process (Local IPC):**
1. Renderer component calls `electronTrpc.<router>.<procedure>.useQuery()` or similar
2. `trpc-electron` serializes call and sends via Electron IPC
3. Main process tRPC router in `apps/desktop/src/lib/trpc/routers/` handles call
4. Subscriptions use `observable` pattern (not async generators)
5. Result returned to renderer

**Desktop → Cloud (Authenticated HTTP):**
1. Desktop renderer calls cloud tRPC via `electronReactClient` which routes to cloud API URL
2. Auth session cookie is included via `credentials: include`
3. Same cloud tRPC procedures as web app

**Agent Session Flow:**
1. Desktop or cloud triggers agent launch
2. `packages/agent/src/superagent.ts` creates Mastra Agent with Anthropic/OpenAI provider
3. Agent executes tools from `packages/agent/src/tools/` and optionally via MCP servers
4. `packages/chat-mastra/src/server/trpc/utils/runtime/runtime.ts` manages runtime session lifecycle
5. Results stream back via `@durable-streams/client` or direct tRPC subscription

**ElectricSQL Real-time Sync:**
1. Client subscribes to `NEXT_PUBLIC_ELECTRIC_URL` for real-time DB rows
2. `apps/api/src/app/api/electric/[...path]/route.ts` proxies and authenticates requests
3. Auth uses JWT bearer or session cookie, extracts `organizationIds` for row-level scoping

## Key Abstractions

**appRouter (Cloud):**
- Purpose: Single composed router for all cloud tRPC procedures
- Examples: `packages/trpc/src/root.ts`
- Pattern: Domain sub-routers imported and composed into top-level `appRouter`

**createTRPCContext:**
- Purpose: Shared context factory injecting auth session into every procedure
- Examples: `packages/trpc/src/trpc.ts` (definition), `apps/api/src/trpc/context.ts` (instantiation)
- Pattern: Session-aware context with `publicProcedure`, `protectedProcedure`, `adminProcedure` tiers

**ElectronTRPCProvider:**
- Purpose: Desktop-local tRPC client provider bridging React Query with IPC tRPC
- Examples: `apps/desktop/src/renderer/providers/ElectronTRPCProvider/ElectronTRPCProvider.tsx`
- Pattern: Shared `QueryClient` for both tRPC hooks and TanStack Router loaders

**HostService createApp:**
- Purpose: Factory for Hono app with pluggable auth/credentials/db for local workspace operations
- Examples: `packages/host-service/src/app.ts`
- Pattern: Dependency injection for credentials, auth provider, db path

**Drizzle Schema (Cloud):**
- Purpose: Type-safe PostgreSQL schema as TypeScript source of truth
- Examples: `packages/db/src/schema/schema.ts`, `packages/db/src/schema/auth.ts`
- Pattern: `pgTable()` definitions with typed enums, cascade deletes, UUID primary keys

**Drizzle Schema (Desktop):**
- Purpose: Type-safe SQLite schema for local state (projects, workspaces, settings)
- Examples: `packages/local-db/src/schema/schema.ts`
- Pattern: `sqliteTable()` with integer timestamps, `.$defaultFn(() => uuidv4())`

## Entry Points

**Cloud API (apps/api):**
- Location: `apps/api/src/app/api/trpc/[trpc]/route.ts`
- Triggers: HTTP GET/POST from any tRPC client
- Responsibilities: Auth context creation, route dispatch to `appRouter`

**Web App (apps/web):**
- Location: `apps/web/src/app/layout.tsx` (root layout), `apps/web/src/trpc/react.tsx` (client provider)
- Triggers: Browser navigation
- Responsibilities: Clerk session, tRPC provider, page routing

**Electron Main Process:**
- Location: `apps/desktop/src/main/index.ts`
- Triggers: Electron app launch
- Responsibilities: Shell env setup, local DB init, tray, auto-updater, agent hooks, IPC tRPC server, MainWindow creation

**Electron Renderer:**
- Location: `apps/desktop/src/renderer/index.tsx`
- Triggers: BrowserWindow load
- Responsibilities: Sentry init, TanStack Router setup, React DOM mount with providers

**Host Service:**
- Location: `packages/host-service/src/serve.ts` (standalone), or embedded via `packages/host-service/src/app.ts`
- Triggers: Spawned per workspace session or started standalone on port 4879
- Responsibilities: Git operations, file system access, cloud sync for workspace context

**Mobile App (apps/mobile):**
- Location: `apps/mobile/app/_layout.tsx`
- Triggers: Expo app launch
- Responsibilities: Auth, navigation stack, tRPC client setup

## Error Handling

**Strategy:** Layer-specific with centralized Sentry capture at tRPC middleware level

**Patterns:**
- Cloud tRPC: `onError` handler in route.ts logs errors; Zod validation errors formatted in `trpc.ts` `errorFormatter`
- Desktop IPC tRPC: `sentryMiddleware` in `apps/desktop/src/lib/trpc/index.ts` captures `INTERNAL_SERVER_ERROR` (excluding expected `NotGitRepoError`)
- Renderer boot: `BootErrorBoundary` in `apps/desktop/src/renderer/index.tsx` catches pre-mount failures
- Auth: `protectedProcedure` throws `UNAUTHORIZED`, `adminProcedure` throws `FORBIDDEN`

## Cross-Cutting Concerns

**Logging:** `console.log/error` with bracketed prefixes (e.g., `[main]`, `[host-service]`); Sentry for error capture in desktop main process and cloud API

**Validation:** Zod schemas at tRPC procedure inputs and in `packages/db/src/schema/zod.ts`, `packages/local-db/src/schema/zod.ts`

**Authentication:**
- Cloud: `better-auth` with Drizzle adapter, Clerk for web UI auth flows, JWT tokens for machine-to-machine (ElectricSQL proxy, host-service)
- Desktop: Clerk session passed via cookie; desktop-to-cloud uses `credentials: include`; host-service uses `DeviceKeyAuthProvider` or `JwtAuthProvider`

---

*Architecture analysis: 2026-03-23*
