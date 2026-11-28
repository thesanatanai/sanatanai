# Frontend tests

```bash
pnpm test:unit
pnpm test:watch
pnpm test:coverage
pnpm build && pnpm test:smoke
```

The tests cover the Next.js frontend and its integration with the separate Sanatan AI API. They require no API credentials, database, or live network access.

## Layout

| Directory | Environment | Purpose |
| --- | --- | --- |
| `unit/` | Node | API client, server data loading, cookies, proxy, stream parsing, utilities, i18n, content and SEO. |
| `dom/` | jsdom | React components, hooks and Zustand stores (Testing Library). |
| `smoke/` | Node | HTTP checks against `next start` or `SMOKE_BASE_URL`; configured by `vitest.smoke.config.mts`. |
| `helpers/`, `setup/` | | Shared API and store fixtures plus per-run setup. |

## Conventions

- **Fake the edges, run the logic.** API requests, cookies, browser APIs and Next.js boundaries are mocked so frontend behavior is tested without starting the backend.
- **Test behaviour, not implementation.** Assert on responses, saved data and what the user would see.
- **Imported packages must be declared.** `unit/dependencies.test.ts` fails if source or tests import a package that is not in `package.json` (it would only work while another dependency happens to install it).
- **Test files are type-checked by `next build`.** A type error in a test breaks the production build, so run `pnpm typecheck` before pushing.
- **A `beforeEach` callback must not return a mock.** Vitest treats a returned function as cleanup and calls it. Use braces: `beforeEach(() => { mock.mockReset(); })`.

## Known bugs are tracked with `it.fails`

When a test documents a real bug, it is written to assert the **correct** behaviour and marked `it.fails(...)`, with a comment explaining the bug. CI stays green while the bug exists. As soon as someone fixes it, that test starts passing, Vitest reports it as a failure, and the fix is complete once `.fails` is removed. Search for `KNOWN BUG` / `KNOWN GAP` to list them.

There are no open known bugs at the moment.