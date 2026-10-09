<p align="center">
  <img src="public/logo.png" width="160" alt="Sanatan AI logo" />
</p>

<h1 align="center">Sanatan AI</h1>

<p align="center">
  <strong>The Soul of Intelligence</strong><br />
  A bilingual, dharma-focused conversational AI built with Next.js and Google Gemini.
</p>

<p align="center">
  <a href="#getting-started">Get started</a> ·
  <a href="#features">Features</a> ·
  <a href="#configuration">Configuration</a> ·
  <a href="#desktop-companion">Desktop companion</a>
</p>

> [!NOTE]
> Sanatan AI is intended for educational and informational conversations. For consequential spiritual, medical, legal, or financial decisions, consult an appropriately qualified person.

## Overview

Sanatan AI is a full-stack chat application centred on Sanatan Dharma, spiritual inquiry, and general-purpose assistance. It pairs a React 19 and Next.js 16 interface (with the React Compiler enabled) with streaming Gemini responses, MongoDB-backed accounts and chat history, and Tavily-powered web research that the model can call on demand.

The repository contains three cooperating surfaces:

- **The chat app** at `/app`, behind sign-in. Onboarding at `/welcome` asks for a language and agreement to the terms, then offers Google OAuth or one-time-password email sign-in.
- **A public showcase site** at `/` (English) and `/hi` (Hindi), with mirrored copies under `/home` and `/home/hi`. It is a scroll-driven marketing page with a three.js mandala, GSAP animation, a product demo video, an FAQ, and structured data for search engines.
- **A desktop companion** in `desktop/`: a minimal Tauri 2 shell around the hosted site.

After sign-in, each user has persistent conversations, profile preferences, and model-managed memories. The interface is available in **Hindi and English**, adapts to light, dark, and system themes, and is installable as a web app where supported.

![Sanatan AI desktop conversation view](public/desktop.png)

## Features

### Conversation experience

- **Streaming Gemini chat.** The server calls `gemini-3.6-flash` by default and streams each reply to the browser as it is generated. Deep Think raises the requested thinking level from `medium` to `high` for a turn.
- **Dharma-oriented system guidance.** Every request carries a server-built Sanatan AI persona (guru–śiṣya tone, traditional greeting on new threads) with formatting rules for shlokas, KaTeX mathematics, Markdown, canvas blocks, buttons, Mermaid diagrams, and citations. It is also given the user's name, preferred language, the current time, saved memories, and **today's Panchanga** (tithi, month and paksha, festivals), computed on the server with `@ishubhamx/panchangam-js` using Ujjain coordinates.
- **Persistent chat sessions.** Chats are stored per user, created automatically when none exist, grouped in the sidebar as Today, Yesterday, Last 7 days, and Older, and can be deleted along with individual messages. A new chat is titled automatically from its first message by a small, separate model call.
- **Model tools.** The model can search the web (`web_search`) and read a page (`web_fetch`) through Tavily, and add or remove user memories (`set_memory`, `delete_memory`). Server-side tool chaining is capped by `MAX_TOOL_CALLS`.
- **Rich responses.** Markdown is rendered with `streamdown`, including syntax-highlighted code, KaTeX, custom Gita shloka blocks, canvas blocks, and interactive Mermaid diagrams.
- **Prompt enhancement.** A magic-wand menu in the composer rewrites a rough message into a clearer query using a lightweight model (`gemini-3.1-flash-lite`) before you send it.

### Input and personalization

- **Attachments.** Attach up to three supported files per message, including images, text, source code, PDFs, JSON/XML/YAML, and common audio/video MIME types. Files are sent inline as base64.
- **Voice input.** Uses the browser Web Speech API when supported; replies can be read aloud with speech synthesis.
- **Personal settings.** Change display name, Hindi/English preference, and light/dark/automatic theme; add a custom instruction (persona) that is kept in the browser; open a **Memories** panel to see what the AI has saved about you.
- **Responsive UI.** Includes animated placeholder prompts, mobile-friendly controls, a swipe- and tap-aware sidebar and tool menu, a particle background, skeleton loaders, notifications, and copy controls.
- **Bilingual interface.** All interface text lives in an in-house i18n dictionary (`en` and `hi`) with a typed `useT()` hook and `<Language>` component.

### Identity, storage, and resilience

- **Two sign-in paths.** Google Identity Services OAuth (the ID token is verified on the server) or emailed six-digit one-time passwords sent through Resend. The Google button is hidden inside the desktop app, which uses email sign-in.
- **Protected routes and signed sessions.** A JWT is issued as an HTTP-only cookie valid for one year. `src/proxy.ts` redirects visitors without a valid session from `/app` to onboarding, and "log out of all devices" rotates the user's internal ID so existing tokens stop working.
- **OTP safeguards.** Codes are stored only as SHA-256 hashes, expire after ten minutes, and repeated wrong attempts put an email address on a short-lived blacklist.
- **MongoDB persistence.** Stores user profiles and memories, chats and messages, OTP records, and OTP attempt blacklist data.
- **PWA essentials.** A service worker caches the offline page, manifest, images, fonts, and icons, and serves an offline fallback page when a navigation fails. The web manifest includes screenshots and shortcuts.
- **Error reporting.** A global error screen lets the user reload or send the error report to the maintainer by email (production only).
- **Search visibility.** The showcase pages ship canonical and `hreflang` metadata, Open Graph tags, JSON-LD, a sitemap, and a `robots.txt` that keeps `/app` out of search results.
- **Desktop companion.** A small Tauri 2 shell opens the deployed application when online and shows an offline screen otherwise.

## Architecture

```text
Browser
  │
  ├─ Public showcase (/, /hi, /home, /home/hi)
  │    └─ typed content dictionaries → Hero, Story, Features, Demo, FAQ, JSON-LD
  │       (GSAP + Lenis scrolling, three.js mandala)
  │
  ├─ Onboarding (/welcome) → terms, language, Google OAuth or email OTP
  │
  ├─ Chat app (/app, guarded by src/proxy.ts)
  │    ├─ AllContext (theme, user profile, notifications) + PageContext (chats, history)
  │    ├─ composer: attachments, speech input, Deep Think, prompt enhancement
  │    └─ streamed JSON parser → Markdown / KaTeX / Mermaid renderer
  │
  └─ Next.js route handlers
       ├─ /api/chat          → Gemini streaming + server-side tool-call loop
       ├─ /api/chat/name     → short model call that titles a new chat
       ├─ /api/chat/v2       → prompt enhancement
       ├─ /api/chats         → chat session CRUD (GET list, OPTIONS read, PATCH new, PUT update, DELETE)
       ├─ /api/user          → Google sign-in, profile, log out everywhere
       ├─ /api/user/otp      → send (PUT) and verify (POST) email codes
       └─ /api/user/memories → read saved memories
              │
              ├─ MongoDB (users, chats, OTP data)
              ├─ Google Gemini API
              ├─ Tavily (web search / extraction)
              └─ Resend (email delivery)
```

**How one chat turn works**

1. The composer posts the new message (text plus any attachments) and the current chat ID to `/api/chat`; the request body is validated with Zod.
2. The route verifies the session cookie, loads the user and the stored conversation, and builds the system prompt from the user's name, language, memories, and today's Panchanga.
3. `generateContentStream` is called with the history, the new message, and the tool declarations. Text chunks are forwarded to the browser immediately as JSON objects.
4. If the model calls `web_search`, `web_fetch`, `set_memory`, or `delete_memory`, the server runs the tool, feeds the result back to the model, and continues, up to `MAX_TOOL_CALLS` steps.
5. When the model finishes, the server collapses the reply into a single text part and saves the updated conversation to MongoDB. Meanwhile the browser parser reassembles the JSON stream and updates the message as it grows.

## Technology

| Area | Implementation |
| --- | --- |
| Application | Next.js 16 App Router, React 19 with React Compiler, TypeScript |
| Model | `@google/genai` with Gemini streaming and function calling |
| Data | MongoDB with Mongoose |
| Validation | Zod |
| Authentication | Google OAuth, JWT cookies, Resend OTP |
| Search | Tavily |
| Panchang | `@ishubhamx/panchangam-js` |
| Rendering | `streamdown`, KaTeX, Mermaid |
| UI | Tailwind CSS 4, custom CSS, Lucide, Lordicon |
| Showcase animation | GSAP (ScrollTrigger, SplitText), Lenis, three.js |
| Analytics | Google Analytics through `@next/third-parties` |
| PWA | Web manifest and custom service worker |
| Desktop | Tauri 2 / Rust |

## Getting started

### Prerequisites

- **Node.js 20.9+** (required by Next.js 16; the project's type definitions target Node 20).
- **npm** (a committed `package-lock.json` is provided).
- A **MongoDB** database. The server throws at startup unless `MONGO_URI` is set (in development, `MONGO_DEV` takes precedence when present).
- Credentials for Gemini, Google OAuth, Tavily, and Resend if you plan to use the corresponding features.

### Install and run

```bash
git clone https://github.com/thesanatanai/sanatanai.git
cd sanatanai
npm ci
cp .env.example .env.local
# Fill in .env.local with the variables described below.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the showcase site, or go to `/welcome` to sign in. The chat lives at `/app` and requires a signed-in session.

> [!TIP]
> Lordicon animation files are licensed assets and are **not committed** (`/public/icons` is git-ignored). Without your own icon set in `public/icons/`, animated icons will not render; the rest of the app still works.

## Configuration

Set these values in `.env.local` for local development or in your hosting provider's environment configuration for deployments. `.env.example` lists the core variables.

```dotenv
# Required for authenticated, model-backed usage
GENAI=your_google_gemini_api_key
JWT_SECRET=use_a_long_random_secret
NEXT_PUBLIC_OAUTH_CLIENT_ID=your_google_oauth_web_client_id
RESEND_API=your_resend_api_key
TAVILY_API=your_tavily_api_key

# Required: the app will not start without a MongoDB connection string
MONGO_URI=mongodb+srv://username:password@cluster.example.mongodb.net/sanatanai

# Optional: used instead of MONGO_URI when NODE_ENV is "development"
MONGO_DEV=mongodb://localhost:27017/sanatanai

# Optional: maximum chained server-side model tool calls for one user turn
# Defaults to 8.
MAX_TOOL_CALLS=8

# Optional: your Google Analytics ID (defaults to Sanatan AI's own ID)
GA_ID=your_id
```

### Provider setup notes

- Create a **Google OAuth web client** and register the application's local and production origins. The same public client ID is used by the browser button and the server-side ID-token verification.
- Configure **Resend** with a verified domain that is permitted to send from the address set in `src/app/api/utils/sendMail.ts`. The OTP email uses a Resend template named `otp`, which is created automatically the first time it is needed.
- Set `MONGO_URI` on every deployment. The application opens its MongoDB connection during server initialization and reuses it across invocations.
- Tavily is used only when Gemini selects the `web_search` or `web_fetch` tool, but its client is created when the chat route loads, so keep `TAVILY_API` set.
- The public domain `sanatan.shivam.click` is written into the sitemap, `robots.txt`, page metadata, CORS headers in `vercel.json`, and the system prompt. Update those places if you host the project under another domain.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint across the repository's application code (`desktop/` is ignored). |
| `npm test` | Run linting followed by a production build. |
| `npm run trace` | Start Next.js with internal tracing enabled. |

`push.cmd` is a Windows helper that runs `npm test` and, if it passes, commits and pushes with a message you supply.

## Project layout

```text
src/
├── app/
│   ├── (main)/             # Public showcase site: components, bilingual content, metadata
│   ├── (root)/             # Chat app shell: contexts, /app, /welcome, /terms, /privacy, globals.css
│   ├── api/
│   │   ├── chat/           # Gemini request options, streaming, tools; name/ and v2/ helpers
│   │   ├── chats/          # Conversation CRUD and validation
│   │   ├── models/         # Mongoose schemas and Zod request models
│   │   ├── user/           # Google sign-in, profile, OTP, memories routes
│   │   └── utils/          # Database, auth, mail, system prompt
│   ├── types/              # Shared context and Lordicon type declarations
│   ├── manifest.ts         # Web app manifest
│   ├── robots.ts           # Crawler rules
│   └── sitemap.ts          # Sitemap
├── actions/                # Server actions: chats, Panchanga, error reporting
├── components/             # Chat, menu, settings, notifications, Mermaid, visuals
├── css/                    # Feature-specific style sheets
├── utils/                  # Client-side chat, streaming, file, i18n, Markdown helpers
└── proxy.ts                # Route guard for /app and /hi
public/                     # Logo, screenshots, demo video, fonts, service worker, offline page
desktop/                    # Tauri desktop companion
AGENTS.md, CHANGELOG.md     # Notes for coding agents and release history
```

## Desktop companion

The `desktop/` project is deliberately small: it launches a Tauri window (minimum 400 × 800), checks browser connectivity, opens the hosted Sanatan AI site when online, and displays an offline message with a retry button otherwise. It does not bundle the Next.js application or a local database. Inside the desktop window, sign-in uses the email one-time-password flow only.

The folder also contains a generated Tauri Android project under `desktop/src-tauri/gen/android`.

### Run it

Install the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your operating system, then run:

```bash
cd desktop
npm ci
npm run tauri dev
```

### Build a distributable

```bash
cd desktop
npm run tauri build
```

Windows builds are configured for both NSIS and WiX installers and download the WebView2 bootstrapper silently when needed.

## Deployment

The web app is configured for Vercel-compatible deployment through `vercel.json`, and `.vercelignore` keeps the `desktop/` folder out of the deployment. Supply all production environment variables in the deployment environment, ensure the Google OAuth origin is registered, and use a reachable MongoDB deployment. API responses are served with credentialed CORS headers limited to `https://sanatan.shivam.click`, and the service worker is served as `/sw.js` with no-cache headers so updated worker code can be discovered promptly.

## Limitations and security considerations

- AI output can be mistaken or incomplete; treat it as assistance rather than authoritative advice.
- Uploads are sent inline with the chat request and therefore count toward model request size and provider limits.
- The offline behaviour is an offline fallback page and static-asset caching, not offline chat or locally stored conversations.
- Custom instructions (the persona field) are stored in the browser's `localStorage`; they are not currently persisted as server-side user preferences.
- In Settings, "Delete all messages" and "Import chat" are not wired up yet, and "Export current chat" only shows a notification. Assistant-generated buttons render but do not yet send a reply when clicked.
- Sessions are stateless JWTs; the only server-side revocation is "log out of all devices". The server does not apply per-user rate limiting to chat requests, and OTP guessing is limited by the short-lived blacklist.
- API access is designed for the first-party browser interface and authenticated sessions rather than as a public developer API.
- Conversations are stored in plain form in MongoDB and may be processed by Google, Tavily, Vercel, and MongoDB as described in the in-app Privacy Policy.

## Contributing

Issues and pull requests are welcome. Keep changes focused, use TypeScript where applicable, run `npm test` before opening a pull request, and avoid committing credentials or local environment files. This project uses a recent Next.js release whose APIs may differ from older versions; check the guides in `node_modules/next/dist/docs/` before changing framework-level code. Notable changes are recorded in `CHANGELOG.md`.

## License

Copyright © Shivam Sharma. A license file is not currently included in this repository; add one (for example, MIT) to state the terms under which others may use the code.