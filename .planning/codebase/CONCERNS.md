# Codebase Concerns

**Analysis Date:** 2026-03-23

---

## Tech Debt

**Telemetry procedures pending removal:**
- Issue: Telemetry procedures exist as stubs (always returning `true`) after the feature was removed. The `telemetry_enabled` column needs to be dropped from the local DB schema.
- Files: `apps/desktop/src/lib/trpc/routers/settings/index.ts` (line 710), `apps/desktop/src/renderer/routes/_authenticated/settings/behavior/components/BehaviorSettings/BehaviorSettings.tsx` (line 69), `apps/desktop/src/renderer/components/TelemetrySync/TelemetrySync.tsx`
- Impact: Dead code that still ships and is referenced throughout the UI, requiring wiring of unused state queries.
- Fix approach: Drop `telemetry_enabled` column from local DB schema, remove all telemetry tRPC procedures, remove `TelemetrySync` component, and the toggle from `BehaviorSettings`.

**Test/debug UI shipping in production:**
- Issue: `HostServiceStatus` component contains a "TODO: Remove this test UI once real git views are implemented" and renders with a feature flag gate, but it is fully wired into `WorkspaceSidebarFooter`.
- Files: `apps/desktop/src/renderer/screens/main/components/WorkspaceSidebar/HostServiceStatus/HostServiceStatus.tsx`, `apps/desktop/src/renderer/screens/main/components/WorkspaceSidebar/WorkspaceSidebarFooter.tsx`
- Impact: Test UI can appear to users behind the `V2_CLOUD` feature flag. Uses `MOCK_ORG_ID` as fallback.
- Fix approach: Implement the real git diff/changes UI, then remove `HostServiceStatus`.

**Test routers shipped in host-service package:**
- Issue: `cloudRouter` and `gitRouter` in `packages/host-service` are explicitly marked as test routers to be removed.
- Files: `packages/host-service/src/trpc/router/cloud/cloud.ts`, `packages/host-service/src/trpc/router/git/git.ts`, `packages/host-service/src/trpc/router/project/project.ts`
- Impact: Dead endpoints increase surface area and maintenance burden.
- Fix approach: Remove these routers after product-led endpoints replace them.

**Deprecated `@superset/shared/claude-command` module:**
- Issue: `packages/shared/src/claude-command.ts` is a deprecated re-export wrapper kept for backward compatibility. The `buildShellEnv` function in `apps/desktop/src/main/lib/terminal/env.ts` is also marked deprecated (use `buildSafeEnv`).
- Files: `packages/shared/src/claude-command.ts`, `apps/desktop/src/main/lib/terminal/env.ts` (line 381)
- Impact: Consumers are implicitly depending on the deprecated wrapper, and it may not be immediately clear which to use.
- Fix approach: Audit callers of `@superset/shared/claude-command` and migrate to `@superset/shared/agent-command`. Remove the deprecated `buildShellEnv` export.

**`MOCK_ORG_ID` used in production component tree:**
- Issue: `MOCK_ORG_ID = "mock-org-id"` from `apps/desktop/src/shared/constants.ts` is used as a fallback org ID in multiple authenticated provider components when `SKIP_ENV_VALIDATION` is set or when no real org is available in dev mode.
- Files: `apps/desktop/src/renderer/routes/_authenticated/layout.tsx`, `apps/desktop/src/renderer/routes/_authenticated/providers/HostServiceProvider/HostServiceProvider.tsx`, `apps/desktop/src/renderer/routes/_authenticated/providers/CollectionsProvider/CollectionsProvider.tsx`
- Impact: If env validation is inadvertently skipped in non-dev builds, mock org IDs could appear in real sessions.
- Fix approach: Restrict `MOCK_ORG_ID` usage to test/dev environments with an explicit guard.

**Mobile TasksScreen refresh not implemented:**
- Issue: `TasksScreen.onRefresh` handler sets `refreshing` to true then immediately to false, with a comment "TODO: refresh task data". The screen shows a static placeholder.
- Files: `apps/mobile/screens/(authenticated)/(tasks)/tasks/TasksScreen.tsx`
- Impact: Pull-to-refresh does nothing on the tasks screen; tasks never reload.
- Fix approach: Wire up the Electric sync or tRPC query invalidation in the `onRefresh` handler.

**Large monolithic files:**
- Issue: Several files exceed 1000+ lines, violating single-responsibility. The tabs store alone is 2108 lines.
- Files:
  - `apps/desktop/src/renderer/stores/tabs/store.ts` (2108 lines)
  - `apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts` (1685 lines)
  - `apps/desktop/src/lib/trpc/routers/projects/projects.ts` (1549 lines)
  - `apps/desktop/src/main/lib/terminal-host/client.ts` (1492 lines)
  - `apps/desktop/src/lib/trpc/routers/workspaces/procedures/create.ts` (1100 lines)
  - `packages/ui/src/components/ai-elements/prompt-input.tsx` (1493 lines)
- Impact: Hard to navigate, high merge-conflict risk, and difficult to test individual behaviors.
- Fix approach: Split by concern — e.g., tabs store into layout, pane state, and migration sub-modules.

---

## Known Bugs / Incomplete Features

**Linear webhook silently skips issues with unknown workflow states:**
- Symptoms: When Linear creates a new workflow state that hasn't been synced yet, incoming webhooks for issues with that state are silently dropped with a `console.warn`.
- Files: `apps/api/src/app/api/integrations/linear/webhook/route.ts` (line 136)
- Trigger: Linear org admin creates a new workflow state after the last `syncWorkflowStates` run.
- Workaround: None automatic — requires manual re-sync.
- Ticket: `SUPER-237`

**Deprecated Chrome Extension Manifest v2:**
- Symptoms: React DevTools extension uses Manifest v2, which is deprecated. A `console.warn` suppression silences the warning.
- Files: `apps/desktop/src/lib/electron-app/factories/app/setup.ts`, `apps/desktop/src/main/lib/extensions/index.ts`
- Impact: Will eventually break as Chrome/Electron drops MV2 support.
- Fix approach: Update to a MV3-compatible React DevTools extension or suppress loading it in production.

---

## Security Considerations

**`webviewTag: true` in Electron main window:**
- Risk: The `<webview>` tag is enabled in the main BrowserWindow. Webview tags have historically been a source of Electron security vulnerabilities (privilege escalation if CSP or navigation restrictions are inadequate).
- Files: `apps/desktop/src/main/windows/main.ts` (line 121)
- Current mitigation: `setWindowOpenHandler` denies all popups. URL sanitization is applied before `loadURL` calls in `usePersistentWebview`.
- Recommendations: Add explicit CSP headers on the webview's loaded content; audit all `webview.loadURL` call sites for injection risks. Consider whether `<webview>` can be replaced with a BrowserView/WebContentsView.

**`dangerouslySetInnerHTML` with user-sourced content:**
- Risk: HTML is injected without sanitization in `code-block.tsx` (syntax-highlighted output) and in marketing team bios (`apps/marketing`).
- Files:
  - `packages/ui/src/components/ai-elements/code-block.tsx` (lines 111, 115) — uses Shiki-generated HTML from agent responses
  - `apps/marketing/src/app/team/[id]/page.tsx` (line 149) — injects `person.bio` directly
  - `apps/marketing/src/app/team/page.tsx` (line 118) — same
- Current mitigation: Shiki output is from a library, but bio HTML comes from CMS data.
- Recommendations: Sanitize the bio HTML through DOMPurify or similar before rendering. Audit Shiki output for injection vectors if agent-controlled input reaches code blocks.

**No rate limiting on most API routes:**
- Risk: Only the `/api/chat/tools/web-search` route and the `invitationRateLimit` in auth have explicit rate limits. All other API routes (chat session, agent transport, github sync, etc.) are unprotected.
- Files: `apps/api/src/app/api/chat/[sessionId]/route.ts`, `apps/api/src/app/api/agent/[transport]/route.ts`, `apps/api/src/app/api/github/sync/route.ts`
- Current mitigation: Auth is required via `requireAuth()` for most endpoints.
- Recommendations: Add per-user rate limits on agent/chat routes to prevent runaway LLM costs.

**Stripe webhook handling via QStash (no direct Stripe signature verification):**
- Risk: Stripe events are delivered to `/api/integrations/stripe/jobs/notify-slack` via Upstash QStash (which does its own signature check), but the Stripe event payload itself is not verified against Stripe's webhook signature.
- Files: `apps/api/src/app/api/integrations/stripe/jobs/notify-slack/route.ts`
- Current mitigation: QStash receiver signature is verified.
- Recommendations: Add `stripe.webhooks.constructEvent()` signature verification if Stripe ever delivers directly rather than via QStash.

**Raw `process.env` access in desktop code (bypassing env validation):**
- Risk: Several desktop source files read `process.env` directly rather than through the validated env module, meaning misconfiguration won't be caught at startup.
- Files:
  - `apps/desktop/src/shared/constants.ts` (`NEXT_PUBLIC_DOCS_URL`)
  - `apps/desktop/src/lib/trpc/routers/changes/workers/git-task-handlers.ts` (`SUPERSET_WORKER_DEBUG`)
  - `apps/desktop/src/lib/trpc/routers/changes/workers/git-task-runner.ts` (`SUPERSET_WORKER_DEBUG`)
  - `apps/desktop/src/lib/trpc/routers/terminal/terminal.ts` (`SUPERSET_TERMINAL_DEBUG`)
- Current mitigation: These are debug/optional vars, so missing values are handled by `=== "1"` guards.
- Recommendations: Move debug flags into the validated env module or a clearly documented debug-flags module.

---

## Performance Bottlenecks

**`queue.sort()` on every pump iteration in terminal attach scheduler:**
- Problem: The attach scheduler calls `queue.sort()` inside a while loop on every pump, which is O(n log n) per attach event.
- Files: `apps/desktop/src/renderer/screens/main/components/WorkspaceView/ContentView/TabsContent/Terminal/attach-scheduler.ts` (line 31)
- Cause: Simple array-sort approach with no priority queue data structure.
- Impact: Low in practice (queue is capped at ~3 concurrent + small backlog), but scales poorly if many terminal panes are opened simultaneously.
- Improvement path: Use a min-heap or insert-in-sorted-order approach if queue sizes grow.

**No pagination on several DB queries:**
- Problem: Multiple tRPC queries call `findMany` without `limit`/`offset`, meaning they could return unbounded result sets as data grows.
- Files:
  - `packages/trpc/src/router/organization/organization.ts` (`allMembers` queries lines 328, 457)
  - `packages/trpc/src/router/analytics/analytics.ts` (`dbUsers` query line 244)
  - `packages/auth/src/server.ts` (multiple `findMany` calls lines 109, 185, 560)
- Cause: Queries written for small data sets early in the product lifecycle.
- Improvement path: Add cursor-based or limit/offset pagination; add DB-side indexes where missing.

**`setBackgroundThrottling(false)` on macOS:**
- Problem: Disabled background throttling prevents GPU compositor layer corruption on macOS Sequoia+ but increases CPU/GPU usage when the window is in the background.
- Files: `apps/desktop/src/main/windows/main.ts` (line 135)
- Impact: Higher energy usage for macOS users running other apps in the foreground.
- Improvement path: Investigate whether the underlying Electron bug is fixed in newer versions; re-enable throttling if safe.

---

## Fragile Areas

**Tabs store (Zustand) with in-band schema migrations:**
- Files: `apps/desktop/src/renderer/stores/tabs/store.ts`
- Why fragile: The store is 2108 lines and contains 7+ sequential schema version migrations inline in the `persist` config. Any mistake in migration logic silently corrupts persisted tab state for users on upgrade.
- Safe modification: Always bump the `version` number when changing the persisted state shape. Test migrations against real persisted snapshots.
- Test coverage: Some migration logic is tested in `apps/desktop/src/renderer/stores/tabs/utils.test.ts` but the migration block itself is not unit-tested independently.

**Terminal attach scheduler — global singleton state:**
- Files: `apps/desktop/src/renderer/screens/main/components/WorkspaceView/ContentView/TabsContent/Terminal/attach-scheduler.ts`
- Why fragile: `inFlight`, `queue`, `pendingByPaneId`, `runningByPaneId`, and `waitingByPaneId` are module-level singletons. In React 18 Strict Mode (double-invocations), tasks can pile up and exhaust the concurrency limit. There's custom logic to handle StrictMode double-runs, which is inherently brittle.
- Safe modification: Changes to concurrency limits or queue logic require careful Strict Mode testing.
- Test coverage: Throttle logic is tested in `useTerminalLifecycle.test.ts`, but the scheduler module itself has no dedicated tests.

**`simple-git` used directly in changes router:**
- Files: `apps/desktop/src/lib/trpc/routers/changes/git-operations.ts`, `apps/desktop/src/lib/trpc/routers/changes/utils/apply-numstat.ts`, `apps/desktop/src/lib/trpc/routers/changes/utils/parse-status.ts`, `apps/desktop/src/lib/trpc/routers/changes/workers/git-task-handlers.ts`, `apps/desktop/src/lib/trpc/routers/changes/branches.ts`, `apps/desktop/src/lib/trpc/routers/changes/file-contents.ts`
- Why fragile: These files import `SimpleGit` from `simple-git` as a type (not for runtime init). However, if any of them ever import the runtime `simpleGit()` constructor directly, it would bypass the shell-derived PATH/env from `git-client.ts`, breaking git on systems where git is not in the default PATH.
- Safe modification: Never call `simpleGit()` directly in these files; always receive `SimpleGit` instances from callers who obtained them via `getSimpleGitWithShellPath`.
- Test coverage: Covered by `apps/desktop/src/lib/trpc/routers/workspaces/utils/git.test.ts`.

**`usePersistentWebview` managing Electron webview lifecycle:**
- Files: `apps/desktop/src/renderer/screens/main/components/WorkspaceView/ContentView/TabsContent/TabView/BrowserPane/hooks/usePersistentWebview/usePersistentWebview.ts`
- Why fragile: Uses React refs to manage imperative Electron webview lifecycle (attach, detach, URL navigation). State synchronization between React and the webview is manual and event-driven. Any render cycle mismatch can cause the webview to navigate away or lose state.
- Safe modification: Changes to URL handling must use the `sanitizeUrl` wrapper. Test attach/detach flows in both dev and production builds.
- Test coverage: No dedicated tests found for this hook.

---

## Scaling Limits

**In-memory Stripe mock proxy in `packages/auth/src/stripe.ts`:**
- Current capacity: Works for development (`INTERNAL_TEAM=true`).
- Limit: The Proxy object returns fake IDs (`internal_${Date.now()}`) for all Stripe operations. If any code path relies on consistent Stripe subscription IDs across calls, the mock will produce inconsistent results.
- Scaling path: Replace with a proper Stripe test mode for integration testing; keep the mock only for local development.

---

## Dependencies at Risk

**React DevTools using deprecated Chrome Manifest v2:**
- Risk: Electron will eventually drop MV2 support in line with Chromium's roadmap.
- Impact: React DevTools extension will stop loading in the desktop app.
- Migration plan: Switch to a MV3-compatible version of React DevTools when available.

**Upstash QStash as sole job queue:**
- Risk: All async integration jobs (Slack, Linear, GitHub, Stripe notifications) depend on QStash. There is no fallback or retry strategy beyond what QStash provides (retries: 3).
- Impact: QStash outage stops all integration job processing.
- Migration plan: Add dead-letter queue handling or a secondary processing path for critical flows.

---

## Missing Critical Features

**No rate limiting on LLM/agent endpoints:**
- Problem: The `/api/agent/[transport]` and `/api/chat/[sessionId]` routes have no per-user request rate limits. High-frequency clients (or compromised tokens) can exhaust LLM API budgets.
- Blocks: Cost control for cloud-hosted agent sessions.

**Linear webhook does not sync new workflow states automatically:**
- Problem: When Linear introduces new workflow states, webhooks for issues in those states are silently dropped until a manual re-sync is triggered (ticket SUPER-237).
- Blocks: Reliable real-time Linear sync.

**Mobile tasks screen is a stub:**
- Problem: `TasksScreen` shows a static placeholder with no data loading. The pull-to-refresh does nothing.
- Blocks: Mobile task management feature.

---

## Test Coverage Gaps

**Web and API apps have zero test files:**
- What's not tested: All Next.js route handlers in `apps/web/src/app`, `apps/api/src/app/api`, and `apps/admin/src/app`. Auth flows, integration webhook handlers, Stripe billing logic, and tRPC routes have no unit or integration tests.
- Files: All files under `apps/web/src`, `apps/api/src`, `apps/admin/src`
- Risk: Regressions in auth, billing, and integration handlers go undetected.
- Priority: High

**`usePersistentWebview` hook (Electron webview lifecycle):**
- What's not tested: URL sanitization, attach/detach lifecycle, navigation event handling.
- Files: `apps/desktop/src/renderer/screens/main/components/WorkspaceView/ContentView/TabsContent/TabView/BrowserPane/hooks/usePersistentWebview/usePersistentWebview.ts`
- Risk: Silent regressions in browser pane navigation.
- Priority: High

**Terminal attach scheduler module:**
- What's not tested: The `scheduleTerminalAttach` module-level singleton is not tested in isolation; only the throttle behavior in `useTerminalLifecycle` is tested.
- Files: `apps/desktop/src/renderer/screens/main/components/WorkspaceView/ContentView/TabsContent/Terminal/attach-scheduler.ts`
- Risk: Queue ordering and concurrency bugs in multi-terminal scenarios.
- Priority: Medium

**Tabs store schema migrations:**
- What's not tested: The `migrate` function inside the Zustand `persist` config is not tested independently. Only downstream state utilities are tested.
- Files: `apps/desktop/src/renderer/stores/tabs/store.ts` (lines 1981–2025)
- Risk: Silent data corruption on upgrade for users with existing persisted tab state.
- Priority: High

**Mobile app screens (beyond TasksScreen):**
- What's not tested: No test files exist anywhere under `apps/mobile/screens/`.
- Files: All files under `apps/mobile/screens/`
- Risk: UI regressions on mobile go undetected before release.
- Priority: Medium

---

*Concerns audit: 2026-03-23*
