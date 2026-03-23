# Technology Stack

**Analysis Date:** 2026-03-23

## Languages

**Primary:**
- TypeScript 5.9.x - All apps and packages (strict mode via shared tooling configs)

**Secondary:**
- CSS - TailwindCSS v4 utility classes, `packages/ui/src/globals.css`

## Runtime

**Environment:**
- Node.js - Next.js apps (`apps/web`, `apps/api`, `apps/admin`, `apps/marketing`, `apps/docs`)
- Bun 1.3.6 - Monorepo task runner, test runner, native package management
- Electron 40.2.1 - Desktop app (`apps/desktop`)
- React Native 0.83.1 - Mobile app (`apps/mobile` via Expo ~55)
- Cloudflare Workers - Electric proxy (`apps/electric-proxy` via Wrangler)

**Package Manager:**
- Bun 1.3.6
- Lockfile: `bun.lock` (present)
- Config: `bunfig.toml` (uses `isolated` linker to prevent native module hoisting issues)

## Frameworks

**Core (Web/API/Admin):**
- Next.js ^16.0.10 - Apps: `apps/web`, `apps/api`, `apps/admin`, `apps/marketing`, `apps/docs`
  - Note: Next.js 16 uses `proxy.ts` instead of `middleware.ts` for request interception
  - `output: "standalone"` on api and web for Docker deployments
  - React Compiler enabled (`babel-plugin-react-compiler`, `reactCompiler: true`)

**Desktop:**
- Electron 40.2.1 - Main process
- Electron Vite ^4.0.0 - Build tooling for Electron
- Electron Builder ^26.4.0 - Packaging and release
- electron-updater ^6.7.3 - Auto-update
- Vite ^7.1.3 - Renderer bundler
- TanStack Router ^1.147.3 (`@tanstack/react-router`) - Client-side routing in desktop renderer

**Mobile:**
- Expo ~55.0.0-beta - Mobile app framework
- Expo Router ~55.0.0-preview.6 - File-based routing
- React Native 0.83.1

**Agent/AI:**
- Mastra (fork) - `mastracode ^0.4.0` from private GitHub release
  - Fork URL: `https://github.com/superset-sh/mastra`
  - Packages: `mastracode`, `@mastra/core`, `@mastra/memory`
  - Used in: `packages/agent`, `packages/chat`, `packages/chat-mastra`, `apps/desktop`
- Vercel AI SDK v6 (`ai ^6.0.0`) - Streaming AI responses
  - `@ai-sdk/anthropic ^3.0.43` - Anthropic provider
  - `@ai-sdk/openai 3.0.36` - OpenAI provider
  - `@ai-sdk/react ^3.0.0` - React streaming hooks

**Testing:**
- Bun test runner - Used in `apps/desktop` (`"test": "bun test"`)

**Build/Dev:**
- Turborepo ^2.8.7 - Monorepo task orchestration (`turbo.jsonc`)
- Biome 2.4.2 - Formatting + linting at root level (`biome.jsonc`)
- Caddy - Local reverse proxy for dev (`Caddyfile`)

## Key Dependencies

**Critical:**
- `@trpc/server ^11.7.1` + `@trpc/client ^11.7.1` - Type-safe API layer across all apps
- `@tanstack/react-query ^5.90.19` - Server state management
- `drizzle-orm 0.45.1` - Database ORM (pinned exact version across all packages)
- `better-auth 1.4.18` - Authentication (pinned exact version)
- `zod ^4.3.5` - Schema validation everywhere
- `@electric-sql/client 1.5.12` - Real-time sync from ElectricSQL (pinned exact)
- `@tanstack/db 0.5.31` + `@tanstack/react-db 0.1.75` + `@tanstack/electric-db-collection 0.2.39` - Client-side reactive DB

**UI:**
- `@radix-ui/*` - Headless primitives (full suite in `packages/ui`)
- `@rn-primitives/*` - React Native equivalents for mobile
- TailwindCSS ^4.1.18 - Utility CSS
- shadcn/ui pattern - Components in `packages/ui/src/components/ui/` (kebab-case single files)
- `framer-motion ^12.23.26` / `motion ^12.23.26` - Animation
- `@tiptap/*` - Rich text editor (desktop)
- `@codemirror/*` - Code editor with multi-language support (desktop)
- `@xterm/xterm 6.1.0-beta.148` - Terminal emulator (desktop)
- `lucide-react ^0.563.0` - Icon library

**Infrastructure:**
- `@neondatabase/serverless 1.0.2` - Neon PostgreSQL client (pinned exact)
- `@upstash/redis ^1.34.3` - Redis via Upstash REST API
- `@upstash/ratelimit ^2.0.4` - Rate limiting
- `@upstash/qstash ^2.8.4` - Message queue / background jobs
- `@vercel/blob ^2.0.0` - Blob storage
- `@vercel/kv ^3.0.0` - KV storage
- `@durable-streams/client ^0.2.1` - Durable event streaming (patched: `@durable-streams/state@0.2.1`)
- `node-pty 1.1.0` - Terminal PTY for desktop shell
- `better-sqlite3 12.6.2` - Local SQLite (desktop)
- `libsql 0.5.22` - LibSQL client (desktop)
- `@modelcontextprotocol/sdk ^1.26.0` - MCP protocol SDK

**Desktop Native:**
- `@ast-grep/napi ^0.41.0` - AST-based code search
- `@parcel/watcher ^2.5.6` - File system watcher
- `@pierre/diffs ^1.0.10` - Diff computation
- `node-addon-api ^7.1.0` - Native addons
- `pidusage ^4.0.1` - Process resource monitoring
- `simple-git ^3.30.0` - Git operations (via wrapper in `apps/desktop/src/lib/trpc/routers/workspaces/utils/git-client.ts`)
- `execa ^9.6.0` - Process spawning
- `puppeteer-core ^24.37.3` - Browser automation (desktop-mcp)

**Serialization:**
- `superjson ^2.2.5` - JSON with extra types (used in tRPC transport)

## Configuration

**Environment:**
- Single root `.env` file consumed by all apps via `dotenv-cli`
- Apps load: `dotenv -e ../../.env -- <command>`
- Type-safe env: `@t3-oss/env-nextjs` and `@t3-oss/env-core` per app/package
- Key categories: DATABASE, ELECTRIC, AUTH, STRIPE, GITHUB, LINEAR, SLACK, ANTHROPIC, UPSTASH, RESEND, POSTHOG, SENTRY, VERCEL, TAVILY, DURABLE_STREAMS

**Build:**
- `turbo.jsonc` - Task graph and caching config
- `tooling/typescript/` - Shared tsconfig bases: `base.json`, `next.json`, `electron.json`, `internal-package.json`
- `biome.jsonc` - Root-level lint/format config (excludes `**/drizzle`, template files)

## Platform Requirements

**Development:**
- Bun 1.3.6+
- macOS recommended for desktop development (native modules: `@superset/macos-process-metrics`)
- Caddy for local reverse proxy

**Production:**
- `apps/web`, `apps/api`: Docker (`output: "standalone"`) or Vercel
- `apps/electric-proxy`: Cloudflare Workers
- ElectricSQL: Fly.io (`fly.toml`, `electricsql/electric:1.4.13`)
- `apps/desktop`: Electron desktop app distributed via electron-builder
- `apps/mobile`: Expo / React Native (iOS + Android)

---

*Stack analysis: 2026-03-23*
