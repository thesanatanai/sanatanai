Sanatan AI is a bilingual, Dharma-focused conversational app. This repository contains the Next.js web experience, public showcase, and Tauri desktop shell. Authentication, user data, chats, memories, and AI responses are provided by the separate [Sanatan AI API](https://github.com/thesanatanai/sanatanai-api).

## What the app includes

- **Chat in Hindi and English**, with persistent conversations, streaming answers, file attachments, prompt enhancement, voice input, and optional Deep Think.
- **Personalization**, including display name, language, theme, custom instructions, and AI-managed memories.
- **Google and email sign-in.** Google OAuth and one-time email codes are verified and managed by the API.
- **A bilingual public site** at `/` and `/hi`, plus `/home` aliases, with product information, a chat demo, calendar showcase, FAQ, and search metadata.
- **Installable web app** with a service worker, static asset caching, and an offline fallback page.
- **Desktop companion** built with Tauri 2. It opens the hosted web app and uses email sign-in.

AI output is informational and may be incorrect. Do not rely on it as a substitute for qualified spiritual, medical, legal, or financial advice.

## How the web app and API work together

```text
Browser
  ├─ Next.js public site, onboarding, and chat UI
  ├─ /app server page loads the initial profile and chat from the API
  └─ API client calls the separate service for sign-in, profile, chats, memories,
     prompt enhancement, and streaming Gemini responses

Sanatan AI API
  ├─ owns authentication, sessions, profiles, memories, and chat history
  ├─ runs Gemini, web search, page reading, and Panchanga tools
  └─ stores users and chats in MongoDB (or an in-memory store for local development)
```

The API sets HttpOnly access and refresh cookies during browser sign-in. The site reads the access cookie on the server and keeps the access token in memory in the browser; it is not saved in `localStorage`. The site's proxy renews an expired access token before rendering `/app`. Browser API calls use bearer authorization, and replies stream as server-sent events.

The API is maintained and deployed separately. Its endpoints, environment variables, storage, and deployment instructions are documented in the [API repository](https://github.com/thesanatanai/sanatanai-api).

## Run locally

### Requirements

- Node.js 20.9 or newer for this Next.js app.
- pnpm (the package manager is enforced by the project).
- A running Sanatan AI API. For a minimal local API setup, follow its README; it supports an in-memory store and console email mode for development.

### Start the web app

```bash
git clone https://github.com/thesanatanai/sanatanai.git
cd sanatanai
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Set the frontend values in `.env.local`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_OAUTH_CLIENT_ID` | For Google sign-in | Google OAuth web client ID. It must match `GOOGLE_CLIENT_ID` configured on the API. |
| `NEXT_PUBLIC_API_URL` | Yes | API origin used by the browser. Set it before building the app. Defaults in `.env.example` to `http://localhost:8080`. |
| `API_INTERNAL_URL` | No | Optional server-to-server API address for a private network or container. Defaults to `NEXT_PUBLIC_API_URL`. |
| `GA_ID` | No | Google Analytics ID. Defaults to Sanatan AI's configured property. |

Make sure the API allows the web app origin in `CORS_ORIGINS`. For local development, start the API on its documented default port, then run:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The public showcase is available without an API session; `/welcome` handles sign-in and `/app` is the chat experience.

The API and site need to be on the same site for browser cookies. In production, use hosts such as `example.com` and `api.example.com`, and configure the API's `COOKIE_DOMAIN` accordingly. `localhost` works across ports. For other hosting arrangements, consult the API's cookie and deployment guidance.

## Project structure

```text
src/
├── app/
│   ├── (main)/             Public showcase pages and content
│   └── (root)/             Chat app, onboarding, and app styles
├── components/             Chat UI, settings, menus, and shared visuals
├── stores/                 Zustand app, auth, and chat state
├── utils/                  API client, API URLs, cookies, SSE, i18n, and UI helpers
└── css/                    Feature-specific styles
tests/
├── unit/                   API client, server data, cookies, proxy, and utilities
├── dom/                    Components, hooks, and stores
└── smoke/                  HTTP checks against a production server
desktop/                    Tauri desktop companion
public/                     Icons, fonts, screenshots, service worker, and offline page
```

The public pages use GSAP, Lenis, and three.js. The chat experience uses React, Zustand, Tailwind CSS, Streamdown, KaTeX, and Mermaid.

## Tests and checks

The frontend test suite does not require live credentials, a database, or a running API.

```bash
pnpm lint
pnpm typecheck
pnpm test:unit       # unit and component tests
pnpm build
pnpm test:smoke      # requires a production build; starts next start
```

`pnpm test:coverage` runs the unit and component tests with coverage thresholds. `pnpm test` runs linting, type checking, unit tests, and a production build. See [tests/README.md](tests/README.md) for test layout and conventions.

## Desktop companion

Install the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/), then run:

```bash
cd desktop
npm ci
npm run tauri dev
```

Build a distributable with `npm run tauri build`. The desktop shell does not bundle the web app or a local database; it loads the hosted site when online and displays an offline screen otherwise.

## Deployment

Deploy this Next.js app and the API as separate services. The frontend is configured for Vercel-compatible deployment. Set `NEXT_PUBLIC_API_URL` before building, allow the deployed site origin in the API's `CORS_ORIGINS`, and configure the API's cookies for the domain arrangement you use. `API_INTERNAL_URL` can point the Next.js server at a private API address without changing the browser-facing API URL.

The API must support long-lived, unbuffered HTTP responses for chat streaming. Its README documents supported storage and mailer modes, production environment validation, health checks, and hosting requirements.

## Privacy and limitations

- Conversations and profile data are stored by the API. Depending on the deployment and enabled tools, requests may be processed by MongoDB, Google Gemini, Tavily, and the hosting providers.
- Files are sent with chat requests and are subject to API and model provider size limits.
- Offline mode provides a fallback page and cached static assets, not offline chat or local conversation storage.
- Custom instructions are currently stored in the browser.
- Some chat actions shown in the interface are not implemented yet; for example, importing a chat and deleting all messages.
- The API is designed for the first-party application and authenticated sessions, not as a public developer API.

## Contributing

Focused issues and pull requests are welcome. Use pnpm for the web app, run the relevant checks before submitting changes, and do not commit credentials or local environment files. Next.js APIs in this repository may differ from older releases; consult the version-matched guides under `node_modules/next/dist/docs/` before changing framework-level code.
