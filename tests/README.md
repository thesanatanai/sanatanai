# Tests

```bash
npm run test:unit        # unit, route-handler and component tests (fast, offline)
npm run test:watch       # the same, re-running on change
npm run test:coverage    # with coverage; fails below the thresholds in vitest.config.mts
npm run build && npm run test:smoke   # HTTP checks against a production server
```

Nothing here needs real credentials, network access or a database. `tests/setup/env.ts` provides fake environment values, and MongoDB, Gemini, Tavily, Resend and Google sign-in are replaced with fakes in each test.

## Layout

| Directory | Environment | Purpose |
| --- | --- | --- |
| `unit/` | Node | Pure logic: utilities, Zod schemas, request building, the streaming/tool loop, i18n, content, SEO, Mongoose schema validation (in memory). |
| `routes/` | Node | API route handlers called directly with `NextRequest`, plus the `/app` proxy. |
| `dom/` | jsdom | React components, hooks and context providers (Testing Library). |
| `smoke/` | Node | Real HTTP requests to `next start` (or to `SMOKE_BASE_URL`). Configured by `vitest.smoke.config.mts`. |
| `helpers/`, `setup/` | | Shared builders (`request.ts`, `stream.ts`, `contexts.tsx`, `tools.ts`) and per-run setup. |

## Conventions

- **Fake the edges, run the logic.** Models, the Gemini client, Tavily and `next/headers` are mocked; everything between them (validation, auth, prompts, tool loop, streaming) runs for real. `tests/routes/otp.test.ts` uses a small stateful fake database so lockout logic is tested across several requests.
- **Test behaviour, not implementation.** Assert on responses, saved data and what the user would see.
- **Security-relevant rules get explicit tests:** ownership checks (a user can only touch their own chats), dropped fields on profile updates, OTP lockout, token validation.
- **Imported packages must be declared.** `unit/dependencies.test.ts` fails if source or tests import a package that is not in `package.json` (it would only work while another dependency happens to install it).
- **Test files are type-checked by `next build`.** A type error in a test breaks the production build, so run `npm run typecheck` before pushing.
- **A `beforeEach` callback must not return a mock.** Vitest treats a returned function as cleanup and calls it. Use braces: `beforeEach(() => { mock.mockReset(); })`.

## Known bugs are tracked with `it.fails`

When a test documents a real bug, it is written to assert the **correct** behaviour and marked `it.fails(...)`, with a comment explaining the bug. CI stays green while the bug exists. As soon as someone fixes it, that test starts passing, Vitest reports it as a failure, and the fix is complete once `.fails` is removed. Search for `KNOWN BUG` / `KNOWN GAP` to list them.

There are no open known bugs at the moment.