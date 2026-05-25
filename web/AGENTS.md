<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Test Coverage Requirements

All changes must pass `pnpm test:web` with the following minimum coverage thresholds (defined in `vitest.config.ts`):

| Metric      | Threshold |
|-------------|-----------|
| Statements  | 75%       |
| Branches    | 70%       |
| Functions   | 75%       |
| Lines       | 75%       |

- Place `*.test.ts` or `*.test.tsx` files beside the source they cover.
- Treat `pnpm check`, `pnpm build`, and `pnpm test:web` as required gates before merging.
