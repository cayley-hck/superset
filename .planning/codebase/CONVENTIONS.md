# Coding Conventions

**Analysis Date:** 2026-03-23

## Naming Patterns

**Files:**
- React components: `PascalCase.tsx` inside a matching folder (`ComponentName/ComponentName.tsx`)
- Hooks: `camelCase.ts` inside a matching folder (`useFeature/useFeature.ts`)
- Utils/helpers: `camelCase.ts` inside a matching folder (`formatData/formatData.ts`)
- Tests: `{name}.test.ts` or `{name}.test.tsx`, co-located with the source file
- Barrel exports: `index.ts` at folder root
- shadcn/ui components (exception): `kebab-case.tsx` flat files in `src/components/ui/`
- tRPC routers: `camelCase` in `src/lib/trpc/routers/{domain}/`

**Functions:**
- Regular functions and utilities: `camelCase` (e.g., `resolveFileViewerMode`, `generateId`)
- React components: `PascalCase` named exports (e.g., `export function WorkspaceListItem(...)`)
- React hooks: `use` prefix, `camelCase` (e.g., `useWorkspaceDnD`, `useTabsStore`)
- Factory functions: `create` prefix (e.g., `createFakeAuthStorage`, `createServiceHarness`)

**Variables:**
- `camelCase` throughout; top-level constants use `UPPER_SNAKE_CASE` (e.g., `BATCH_SIZE`, `MAX_SLUG_LENGTH`)

**Types / Interfaces:**
- Types and interfaces: `PascalCase` (e.g., `WorkspaceListItemProps`, `AgentLaunchResult`)
- Component prop types: `interface {ComponentName}Props { ... }`
- Zod schemas: `camelCase` with `Schema` suffix (e.g., `payloadSchema`, `agentLaunchRequestSchema`)
- Inferred Zod types: `type Foo = z.infer<typeof fooSchema>`
- Const-derived union types: `type Foo = (typeof FOO_VALUES)[number]`

**Database (Drizzle ORM):**
- Table names: `camelCase` for TS variable, `snake_case` for SQL name (e.g., `taskStatuses` → `"task_statuses"`)
- Column names: `camelCase` in TS, explicit `snake_case` string for SQL (e.g., `organizationId: uuid("organization_id")`)
- Enums: `pgEnum("snake_case_name", values)` with a `camelCase` TS export

## Code Style

**Formatter / Linter:**
- Tool: Biome 2.4.2, configured at repo root via `biome.jsonc`
- Biome runs over all files matching `**` except `**/drizzle`, `**/*.template.js`, `**/*.template.sh`
- CSS modules and Tailwind directives supported
- Recommended rules enabled by default
- To fix all issues: `bunx @biomejs/biome@2.4.2 check --write --unsafe .`
- To check only (CI): `bunx @biomejs/biome@2.4.2 check .`

**Suppression comments:**
- Use `biome-ignore lint/{rule}: {reason}` inline with a descriptive reason
- Example: `// biome-ignore lint/suspicious/noExplicitAny: migration from old schema`
- Example: `{/* biome-ignore lint/a11y/useSemanticElements: Contains nested interactive elements */}`
- Suppress sparingly; prefer fixing the underlying issue

**TypeScript strictness:**
- `strict: true`, `noUncheckedIndexedAccess: true` in `tooling/typescript/base.json`
- Target: ES2022; module resolution: Bundler
- Avoid `any`; use `unknown` or proper generics — `any` requires `biome-ignore` comment with justification
- Use `import type` for type-only imports

## Import Organization

Biome organizes imports automatically. Observed ordering:

1. External packages (alphabetical within group, e.g., `@linear/sdk`, `@superset/db`, `zod`)
2. Internal workspace packages via `@superset/*` aliases
3. App-internal path aliases (e.g., `@/env`, `renderer/...`, `main/...`, `shared/...`)
4. Relative imports (`./`, `../`)

**Path Aliases (Desktop app — `apps/desktop/tsconfig.json`):**
- `renderer/` → renderer process source
- `main/` → main process source
- `shared/` → shared code between processes
- `lib/` → library code

**Path Aliases (Next.js apps):**
- `@/` → `./src/` (standard Next.js alias)

**Workspace package imports:**
- Use `@superset/{package}/{subpath}` (e.g., `@superset/ui/button`, `@superset/db/schema`)
- Packages expose named subpath exports in `package.json` `"exports"` field

## Error Handling

**tRPC routers (Electron IPC):**
- Throw `TRPCError` with a `code` and `message` for procedure failures
  ```typescript
  import { TRPCError } from "@trpc/server";
  throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
  ```

**Next.js API routes:**
- Return `Response.json({ error: "..." }, { status: 4xx })` for client errors
- Log server errors via `console.error("[module] description:", { ...context })` before returning 500
- Validate payloads with Zod's `safeParse` and return 400 on failure

**Input validation:**
- All tRPC procedure inputs validated with Zod schemas passed to `.input()`
- API route bodies validated via `z.object(...).safeParse(JSON.parse(body))`

## Logging

**Framework:** `console.error` / `console.warn` (no structured logging library at the application layer)

**Patterns:**
- Prefix log messages with a namespaced tag: `console.error("[module/submodule] description:", context)`
- Example: `console.error("[linear/callback] Membership verification failed:", { ... })`
- Use `console.error` for unexpected failures, `console.warn` for expected degraded states
- Include structured context object as second argument (not string interpolation)
- Tests mock `console.error` with `mock(() => undefined)` in `beforeEach` when testing error paths

## Comments

**When to Comment:**
- JSDoc comments on exported functions/classes when purpose is non-obvious
- Inline comments for non-obvious logic, workarounds, or browser/API quirks
- `biome-ignore` comments must always include a reason
- Test files often include block comments describing the bug/issue being reproduced (see `DeleteWorkspaceDialog.test.ts`)

**JSDoc/TSDoc:**
- Used selectively on exported utilities (e.g., `/** Generates a unique ID with the given prefix */`)
- Not required for every function

## Function Design

**Size:** No strict line limit enforced, but large files are a concern (see `store.ts` at 2108 lines). Prefer splitting by domain.

**Parameters:** Destructured object params for functions with 2+ related parameters:
```typescript
export const resolveFileViewerMode = ({
    filePath,
    diffCategory,
    viewMode,
    fileStatus,
}: { filePath: string; diffCategory?: ChangeCategory; ... }): FileViewerMode => { ... }
```

**Return Values:** Prefer explicit return types on exported functions. Nullable returns use `T | null` (not `undefined`).

## Component Design

**Structure:** One component per file, one folder per component
```
WorkspaceListItem/
├── WorkspaceListItem.tsx    # Main component
├── WorkspaceListItem.test.tsx  # (if present)
├── index.ts                 # Barrel export
├── constants.ts             # Module-level constants
├── useWorkspaceDnD.ts       # Hook used only here
├── WorkspaceIcon.tsx        # Sub-component used only within WorkspaceListItem
└── components/              # Sub-components used by 2+ siblings
    └── DeleteWorkspaceDialog/
        ├── DeleteWorkspaceDialog.tsx
        └── index.ts
```

**Props:** Use `interface {Name}Props` declared directly above the component

**className merging:** Use `cn()` from `@superset/ui/utils` for conditional class composition

**Stores:** Zustand stores follow `useXxxStore` naming; selectors are passed inline to `useXxxStore((s) => s.field)`

## Module Design

**Exports:**
- Barrel `index.ts` re-exports from implementation file; never define logic in `index.ts`
- Named exports only (no default exports for components or utilities)
- Packages expose subpath exports via `package.json` `"exports"` map

**Barrel Files:**
- Used consistently: every component/hook folder has an `index.ts`
- Barrel files only re-export, never contain implementation

---

*Convention analysis: 2026-03-23*
