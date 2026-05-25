# CLI Workspace

## Test Coverage Requirements

All changes must pass `pnpm test:cli` with the following minimum coverage thresholds (defined in `vitest.config.ts`):

| Metric      | Threshold |
|-------------|-----------|
| Statements  | 70%       |
| Branches    | 60%       |
| Functions   | 60%       |
| Lines       | 70%       |

The following modules are excluded from coverage because they require OS-level or HTTP interactions that are impractical to unit-test:

- `src/infrastructure/service/linux-systemd.ts` — systemd service management
- `src/infrastructure/service/macos-launchd.ts` — macOS launchd service management
- `src/infrastructure/api/client.ts` — raw HTTP client with Node http/https
- `src/commands/home.ts` — interactive TUI dashboard
- `src/services/sync-service.ts` — complex sync orchestrator (locks, HTTP, manifest)
- `src/parsers/kiro.ts`, `src/parsers/cursor.ts`, `src/parsers/hermes.ts`, `src/parsers/opencode.ts` — parsers with complex file system operations

- Place `*.test.ts` files beside the source they cover.
- Treat `pnpm check`, `pnpm build`, and `pnpm test:cli` as required gates before merging.
