# 2.4.4
- The site now uses the separate `sanatanai-api` backend (`NEXT_PUBLIC_API_URL`, and optionally `API_INTERNAL_URL` for the server) instead of this app's own `/api/*` routes. Replies now arrive as server-sent events.
- **Sessions are cookies, and the access token is only in memory.** The API sets HttpOnly `access_token` and `refresh_token` cookies that this site's server and proxy can read. Nothing is stored in `localStorage`. The server hands the access token to the page, which keeps it in a Zustand store (`src/stores/authStore.ts`) and sends it as a bearer token without cookies. A renewal is a bodiless `POST /v1/auth/refresh` that uses the refresh cookie.
- `/app` is server-rendered again: `src/app/(root)/app/page.tsx` reads the access cookie, loads the user, the chats and the latest chat from the API (`src/utils/serverData.ts`) and passes them to `ChatStoreProvider`. If the server cannot reach the API, the browser loads the same data itself.
- `src/proxy.ts` is back: it sends visitors without a session from `/app` to sign-in and signed-in visitors from `/`, `/hi` and `/welcome` to the app, and renews a session whose access token has ended before `/app` is rendered, passing the new cookies to the browser and the page. It only reads the cookies: the API checks every call.
- New `src/utils/api.ts` (API client: in-memory bearer token, one shared renewal for all calls and tabs, retry after 401, a lost renewal race is retried, end of session when the refresh token is refused) and `src/utils/sse.ts` (event-stream reader).
- `/welcome?logout=true` now really signs out (the session is revoked on the server).
- Only the name and language can be saved to the profile; email and picture come from sign-in.
- The Content Security Policy allows the API's origin in `connect-src`.
- Existing sessions (the old `token` cookie) end: everybody signs in once more.
- The old `src/app/api/**` routes are kept but unused by the browser, to be removed later.
- Tests: new API client, event-stream and sign-in tests; the store, page and smoke tests follow the new flow.

# 4.2.3
- Migrated client state management from React Context to Zustand. `AllContext` and `PageContext` are replaced by two stores in `src/stores/`: `appStore` (theme, user profile, notifications) and `chatStore` (chats, messages, settings panel, Deep Think, persona).
- Components read what they need with selectors, so they re-render only when that value changes. Chat actions (`createNewChat`, `deleteChat`, `deleteMessage`, ...) no longer take setter arguments.
- `AppBootstrap` runs start-up and the `/app` loading screen; `ChatStoreProvider` fills the chat store with the server's data once, and the store keeps its state when Next.js hides and re-shows the page.
- `setSession` moved to `src/utils/session.ts` so server components do not import the store.
- A theme the user picks in Settings is no longer overridden when the system theme changes later.
- Tests: the chat action tests now match the `/api/chats/:id` routes the client calls; added store, provider and full chat page tests.
- Migrated from npm to pnpm

# V-2.4.2
- Implemented Email component for OTP handling with countdown timer.
- Refactored Auth component to remove inline Email logic and use the new Email component.
- Updated API routes for OTP requests to handle resend logic and response messages.
- Added new translations for OTP messages in i18n.
- Enhanced CSS styles for buttons and typography.
- Introduced overrides in package.json for dependency management.

# V-2.4.1
- Fixed: deleting one saved memory wiped all of them (API), and the Memory panel then showed only the deleted item.
- Fixed: the Deep Think setting never reached Gemini (request shape and enum casing now match the server schema).
- Fixed: shloka (`<gita>`) blocks render both inline and in their own paragraph.
- Fixed: a failed chat-title request no longer puts the raw error in the sidebar.
- Fixed: `<badge type="error|neutral">` keeps its `type`, so it is styled.
- Fixed: the server HTML declares a language (`<html lang="en">`), and the Hindi page switches it to `hi` before first paint.
- Pinned TypeScript to 5.x: `typescript-eslint` does not support TypeScript 7 yet, which broke `npm run lint`.

# V-2.4.0
- Added a Vitest test suite (unit, API route, component and HTTP smoke tests) with enforced coverage thresholds for server code.
- Added GitHub Actions CI (lint, types, tests, build, smoke tests), CodeQL and Dependabot.
- `npm test` now also runs the type check and the unit tests.
- Test files are type-checked by `next build`, so the build now also catches type errors in tests.
- Introduce more custom components like Timeline, meter, badge, etc. for bot

# V-2.3.6
- Refined web search, page extraction, and memory tools with validation and bounded results.
- Improved saved-memory management in Settings and strengthened memory persistence.
- Updated chat API methods and validation, OTP expiry storage, and user profile defaults.
- Added PWA shortcuts and improved legal pages, font loading, Markdown rendering, and UI styling.

# V-2.3.5
- Optimized terms and privacy page and simplified styles.
- Enhanced proxy handling and navigation.
- Boosted security in OTPs.
- Used app language in speech recognition.
- Move react-speech-recognition to dependencies from devDependencies.

# V-2.3.4
- Removed demo link from Header component.
- Updated Hero component styles for better responsiveness and opacity handling.
- Removed demo ID from VideoStage component.
- Simplified Page component structure by removing unnecessary fragments.
- Adjusted Google authentication component to use updated notification hook.
- Fixed typo in handleLogin function parameter name.
- Enhanced error response utility functions for better type handling.
- Deleted unused LegalPage.module.css and migrated styles to legalPage.css.
- Updated LegalPage component to use new CSS classes.
- Refactored Lordicon component for better performance.
- Improved MenuBar component to utilize language localization.
- Adjusted Notification component to simplify notification handling.
- Updated Particles component to use memoization for performance.
- Refactored Settings component to align with updated notification hook.
- Enhanced enhancePrompt utility for better error handling.
- Updated Markdown utility to improve line splitting logic.
- Refactored useFileManager utility to align with updated notification hook.
- Added FooterClient component for better footer management.

# V-2.3.3
- Updated @google/genai to version 2.30.0 and other dependencies for better performance and features.
- Removed deprecated postcss.config.mjs file and replaced it with @tailwindcss/turbopack.
- Fixed typos in push.cmd for better clarity.
- Refactored chatActions.ts to use "server-only" import and improved loadChat function.
- Enhanced styles.css and globals.css for better font handling.
- Updated PageContext.tsx to manage chat sessions more effectively.
- Improved error handling in user route and added email verification in user creation.
- Refactored utility functions for better file type handling and removed unnecessary code.
- Added Google Analytics integration through a new Analytics component.

# V-2.3.2
- Deduplicated `Lordicon` and `useRefManager`.
- Optimized site performance and compressed media files.
- Early redirect unsigned user
- Adjust feature component animations and remove unused GSAP code

# V-2.3.1
- Implemented chat button working
- Enhanced gita block
- Refined styles of code block and mermaid

# V-2.3.0
- Added Streamdown and its related plugins for enhanced markdown support.
- Removed the custom Mermaid component and replaced it with Streamdown's mermaid integration.
- Updated package.json to include new Streamdown dependencies.
- Modified global styles to accommodate new Streamdown components.
- Refactored markdown processing to utilize Streamdown's capabilities.
- Adjusted CSS for button styling and removed unused styles.

# V-2.2.4
- Improve OTP handling and brute-force protection
- Optimized chat indexing and database queries
- Improved SEO by adding Sanatan AI on top.

# V-2.2.3
- Replaced `data-label` attributes with `aria-label` for better accessibility in various components and styles.
- Updated service worker management to use `void` for asynchronous calls.
- Corrected spelling of "preferredLocale" in multiple files.
- Enhanced error handling and validation using Zod in user-related API routes.
- Improved user experience by ensuring proper redirects and cookie management.
- Removed deprecated validation logic and replaced it with Zod schemas for cleaner code.
- Fixed minor typos and improved comments for clarity.

# V-2.2.2
- Introduced new mail html for better mail reputation.
- Fixed overflow issue on mobile screens.
- Move globals to (root) folder.

# V-2.2.1
- Fixed sitemap issue
- Made welcome page mobile friendly
- Moved i18n.tsx and scene-store.ts in constants.ts
- Removed unused site.ts

# V-2.1.1
- Introduced a desktop-friendly showcase homepage for Sanatan AI, in order to maintain better SEO.

# V-1.0.0 - 1.1.1
The evolution of Sanatan AI from **v1.0.0 through v1.1.1** represents a transformation from a foundational application into a highly refined, feature-rich platform. Early releases (v1.0.0–v1.0.11) established core Next.js capabilities, legal compliance, text-to-speech support, and a Sanatan Calendar, alongside a domain migration and UI streamlining. Recent updates (v1.1.0–v1.1.1) brought significant refinement to the system by integrating real-time Panchanga data into system prompts, adding Zod API validation, introducing a Memory view component, expanding search visibility with `sitemap` and `robots.txt` support, and refactoring core messaging and prompt-enhancement pipelines for higher reliability.