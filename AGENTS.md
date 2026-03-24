# Repository Guidelines

## Project Structure & Module Organization

`tokens-burned` is a pnpm monorepo with two workspaces. `cli/` contains the TypeScript Commander CLI: keep command entry points in `cli/src/commands`, sync and aggregation logic in `cli/src/services` and `cli/src/domain`, tool-specific ingestion in `cli/src/parsers`, and config/API/filesystem code in `cli/src/infrastructure`. Built files land in `cli/dist/`. `web/` is a Next.js App Router app: routes live in `web/app`, shared UI in `web/components/ui`, hooks in `web/hooks`, helpers in `web/lib`, and static assets in `web/public`. Do not edit generated output such as `.next/` or `dist/`.

## Build, Test, and Development Commands

- `pnpm install` — install all workspace dependencies; use Node 20+.
- `pnpm dev:cli` — run the CLI via `tsx`; for explicit args, use `pnpm --filter ./cli dev -- --help`.
- `pnpm dev:web` — start the Next.js dev server.
- `pnpm build` — build both workspaces.
- `pnpm lint:cli` / `pnpm lint:web` — run Biome checks.
- `pnpm format:cli` / `pnpm format:web` — apply Biome formatting.
- `pnpm check` — run the same lint + format steps enforced by the Husky pre-commit hook.

## Coding Style & Naming Conventions

Use TypeScript + ESM throughout. Biome enforces 2-space indentation, double quotes, semicolons, and import organization. Keep CLI filenames kebab-case (`session-extractor.ts`, `claude-code.ts`); export React components in PascalCase. In `web/`, prefer the `@/` path alias for local imports. All web components should use shadcn/ui patterns. Add new UI components with `pnpm dlx shadcn@latest add [component]` from the repo root instead of hand-rolling base primitives in `web/components/ui`. Keep parsing and business logic in `domain/`, `services/`, or `parsers/`; keep terminal/UI rendering in command handlers or React components.

## Testing Guidelines

There is no committed test runner yet. Until one is added, treat `pnpm check` and `pnpm build` as required gates. For CLI changes, include a manual smoke test such as `pnpm --filter ./cli dev -- status` or `pnpm --filter ./cli dev -- --help`. When adding automated tests, place `*.test.ts` or `*.test.tsx` beside the code they cover and add the matching workspace script in the same PR.

## Commit & Pull Request Guidelines

Follow the Conventional Commit style used in history: `feat: ...`, `feat(cli): ...`, `chore(web): ...`. Keep scopes tied to the workspace you changed. PRs should include a short summary, touched areas (`cli`, `web`, or both), validation commands, linked issues, and screenshots for UI updates.

## Security & Configuration Tips

Never commit API keys, `.env*`, or user config. The CLI stores local config in `~/.tokens-burned/`; set `TOKENS_BURNED_DEV=1` for a separate dev config. Read `web/AGENTS.md` before making significant Next.js changes.
