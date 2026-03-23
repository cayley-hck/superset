# Testing Patterns

**Analysis Date:** 2026-03-23

## Test Framework

**Runner:**
- Bun's built-in test runner (`bun:test`) — no Jest, no Vitest
- Available globally in all packages via `bun test`

**Assertion Library:**
- Bun's built-in `expect` (Jest-compatible API)

**Run Commands:**
```bash
bun test                   # Run tests in current package
turbo test                 # Run all tests across monorepo
bun test src/path/to/file.test.ts  # Run a specific test file
```

**Coverage:** No coverage tooling configured at the repo level.

## Test File Organization

**Location:** Co-located with the source file they test — no separate `__tests__` directories.

**Naming Convention:**
- `{filename}.test.ts` for TypeScript utilities and logic
- `{filename}.test.tsx` for React component logic (rare; most component tests are `.ts`)
- Placed in the same directory as the source file

**Examples:**
- `packages/shared/src/names/names.ts` → `packages/shared/src/names/names.test.ts`
- `apps/desktop/src/renderer/stores/tabs/utils.ts` → `apps/desktop/src/renderer/stores/tabs/utils.test.ts`
- `packages/chat/src/host/chat-service/chat-service.ts` → `packages/chat/src/host/chat-service/chat-service.test.ts`

## Test Structure

**Suite Organization:**
```typescript
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

describe("featureName", () => {
    beforeEach(() => {
        // Reset mocks, set up temp dirs, clear state
    });

    afterEach(() => {
        // Clean up temp files, restore env vars, call rmSync
    });

    it("describes expected behavior in plain English", () => {
        // Arrange → Act → Assert
        const result = featureUnderTest(input);
        expect(result).toBe(expectedValue);
    });

    it("handles edge case", () => {
        expect(featureUnderTest(edgeInput)).toBeNull();
    });
});
```

**Multiple describe blocks per file:** Common when testing multiple exported functions from one module. Each describe block corresponds to one exported function.

**`it` vs `test`:** Both are used interchangeably; `it` is more common. Use whichever reads more naturally.

## Desktop App Test Setup

**Preload files** (`apps/desktop/bunfig.toml`):
```toml
[test]
preload = ["./src/main/terminal-host/xterm-env-polyfill.ts", "./test-setup.ts"]

[test.env]
NODE_ENV = "test"
SKIP_ENV_VALIDATION = "1"
```

**`apps/desktop/test-setup.ts`** provides global mocks for all desktop tests:
- Electron APIs (`app`, `dialog`, `BrowserWindow`, `ipcMain`, `shell`, `clipboard`, `screen`, `Notification`, `Menu`)
- Browser globals (`document.documentElement`, `document.head`, `document.createElement`)
- `electronTRPC` global for renderer IPC
- `@superset/local-db` and `main/lib/local-db` (SQLite not available in Bun)
- `main/lib/analytics`

**Philosophy from `test-setup.ts`:**
> "Mock EXTERNAL dependencies only. DO NOT mock internal code here — tests should use real implementations or mock at the individual test level when necessary."

## Mocking

**Framework:** `bun:test`'s `mock` function (Jest-compatible)

**Module mocking — top-level before import:**
```typescript
import { mock } from "bun:test";

mock.module("mastracode", () => ({
    createAuthStorage: createAuthStorageMock,
}));

mock.module("../auth/anthropic", () => ({
    getCredentialsFromConfig: () => anthropicConfigCredential,
    getCredentialsFromKeychain: () => anthropicKeychainCredential,
}));

// Dynamic import AFTER mock.module calls
const { ChatService } = await import("./chat-service");
```

**Function mocking:**
```typescript
const myMock = mock(() => {});
const asyncMock = mock(async () => ({}));
const typedMock: ReturnType<typeof mock<(id: string) => void>> = mock(() => {});
```

**Mock implementations (override per test):**
```typescript
fakeAuthStorage.login.mockImplementation(
    async (providerId: string, callbacks: OAuthCallbacks) => {
        callbacks.onAuth({ url: "https://..." });
        // ...
    },
);
```

**Clearing mocks between tests:**
```typescript
beforeEach(() => {
    myMock.mockClear();
    fakeAuthStorage.reload.mockClear();
    fakeAuthStorage.get.mockClear();
});
```

**What to Mock:**
- External packages that have side effects (Electron, SQLite, OAuth SDKs)
- File system helpers when you want to control behavior without disk I/O
- Module-level constants/paths using `mock.module("./paths", () => ({ BIN_DIR: TEST_BIN_DIR }))`
- `node:os.homedir()` and similar OS queries in tests that rely on home directory

**What NOT to Mock:**
- Internal implementations (per the `test-setup.ts` philosophy)
- Core business logic under test
- `node:fs` directly — use real temp directories via `mkdtempSync` / `fs.mkdtemp` instead

## Fixtures and Test Helpers

**Test Data Factory Functions:** Common pattern — create factory functions at the top of the test file:
```typescript
function createFakeAuthStorage(): FakeAuthStorage {
    const credentials = new Map<string, Credential>();
    return {
        get: mock((providerId: string) => credentials.get(providerId)),
        set: mock((providerId: string, credential: Credential) => {
            credentials.set(providerId, credential);
        }),
        clear: () => { credentials.clear(); },
    };
}

function createRuntime(): RuntimeSession {
    return {
        sessionId: SESSION_ID,
        harness: {
            abort: mock(() => {}),
            respondToToolApproval: mock(async (payload: unknown) => payload),
        } as unknown as RuntimeSession["harness"],
    };
}
```

**Local factory helpers inside describe blocks:**
```typescript
describe("resolveActiveTabIdForWorkspace", () => {
    const createTab = ({ id, workspaceId }: { id: string; workspaceId: string }): Tab => {
        return { id, name: id, workspaceId, layout: `${id}-pane`, createdAt: 0 };
    };
    // ...
});
```

**Temp directories:** Use `mkdtempSync` / `fs.mkdtemp` for any test requiring disk I/O:
```typescript
const testDirectories: string[] = [];

function makeTempDirectory(prefix: string): string {
    const directory = mkdtempSync(join(tmpdir(), prefix));
    testDirectories.push(directory);
    return directory;
}

afterEach(() => {
    for (const directory of testDirectories.splice(0)) {
        rmSync(directory, { recursive: true, force: true });
    }
});
```

**Location:** Fixtures and helpers are defined inline in the test file (no shared fixture files found).

## Coverage

**Requirements:** None enforced — no coverage thresholds configured at repo or package level.

**View Coverage:**
```bash
bun test --coverage   # Bun built-in coverage (experimental)
```

## Test Types

**Unit Tests:**
- The primary test type in this repo
- Test a single function, class, or module in isolation
- Located at `packages/*/src/**/*.test.ts` and `apps/desktop/src/**/*.test.ts`
- 132 test files total across the monorepo

**Integration Tests:**
- Some tests exercise real file system interactions (e.g., `packages/workspace-fs/src/fs.test.ts`, `packages/chat/src/host/slash-commands/resolver.test.ts`)
- These use real temp directories but mock external services

**E2E Tests:** Not found — no Playwright/Cypress configuration detected.

**React Component Tests:** Very limited. Most component-adjacent tests (`DeleteWorkspaceDialog.test.ts`) test logic (focus management, timing) rather than rendering. No React Testing Library found.

## Common Patterns

**Environment variable cleanup:**
```typescript
const originalValue = process.env.MY_VAR;

beforeEach(() => {
    delete process.env.MY_VAR;
});

afterEach(() => {
    if (originalValue) {
        process.env.MY_VAR = originalValue;
    } else {
        delete process.env.MY_VAR;
    }
});
```

**Async Error Testing:**
```typescript
await expect(chatService.startOpenAIOAuth()).rejects.toThrow(
    "Timed out while waiting for OpenAI OAuth URL",
);
```

**Error Testing (sync):**
```typescript
expect(() => buildMultiPaneLayout([])).toThrow("Cannot build layout with zero panes");
```

**Testing with real class instances (avoiding over-mocking):**
```typescript
it("uses standalone createAuthStorage and reuses it across calls", async () => {
    const chatService = new ChatService();

    await chatService.setOpenAIApiKey({ apiKey: " test-key " });
    await chatService.getOpenAIAuthStatus();
    await chatService.clearOpenAIApiKey();

    expect(createAuthStorageMock).toHaveBeenCalledTimes(1);
    expect(fakeAuthStorage.set).toHaveBeenCalledWith("openai-codex", {
        type: "api_key",
        key: "test-key",
    });
});
```

**Accessing private state for testing (casting through `unknown`):**
```typescript
const timeoutSlot = ChatService as unknown as { OAUTH_URL_TIMEOUT_MS: number };
timeoutSlot.OAUTH_URL_TIMEOUT_MS = 1;
```

**Testing async timelines (no timer mocks — use real Promise microtasks):**
```typescript
const timeline: string[] = [];
simulateContextMenuSelect(() => {
    deferDeleteDialogOpen(() => {
        timeline.push("dialog:open-requested");
    });
});
timeline.push("contextmenu:close-auto-focus");
await Promise.resolve(); // flush microtask queue
expect(timeline).toEqual([
    "contextmenu:close-auto-focus",
    "dialog:open-requested",
]);
```

## Package-Level Test Configuration

Each package runs `bun test` with no additional config unless it has a `bunfig.toml`:
- `apps/desktop/bunfig.toml` — preloads `xterm-env-polyfill.ts` and `test-setup.ts`, sets `NODE_ENV=test` and `SKIP_ENV_VALIDATION=1`
- `bunfig.toml` (root) — sets `linker = "isolated"` (install only, not test-specific)

Packages with test scripts (`"test": "bun test"`):
- `packages/shared`
- `packages/chat`
- `packages/workspace-fs`
- `packages/chat-mastra`
- `apps/desktop`

---

*Testing analysis: 2026-03-23*
