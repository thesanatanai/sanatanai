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

Sanatan AI is a full-stack chat application centred on Sanatan Dharma, spiritual inquiry, and general-purpose assistance. It pairs a React 19 and Next.js 16 interface with Gemini streaming responses, MongoDB-backed accounts and chat history, and optional Tavily-powered web research.

The experience begins with terms and language selection, then supports Google OAuth or one-time-password email sign-in. After sign-in, each user has persistent conversations, profile preferences, and model-managed memories. The interface is available in **Hindi and English**, adapts to light, dark, and system themes, and is installable as a web app where supported.

![Sanatan AI desktop conversation view](public/desktop.png)

## Features

### Conversation experience

- **Streaming Gemini chat.** Responses stream from `gemini-3-flash-preview`; Deep Think raises the requested thinking level for a turn.
- **Dharma-oriented system guidance.** The server supplies a Sanatan AI persona with formatting rules for shlokas, KaTeX mathematics, Markdown, canvas-style writing, buttons, diagrams, and citations.
- **Persistent chat sessions.** Chats are stored per user, automatically created when needed, grouped in the sidebar by recency, and can be deleted along with individual messages.
- **Model tools.** The model can search the web and extract a URL through Tavily, set or remove user memories, and name a new chat. Server-side tool chaining is capped by `MAX_TOOL_CALLS`.
- **Rich responses.** Markdown rendering includes syntax-highlighted code, KaTeX, custom Gita blocks, canvas blocks, and interactive Mermaid diagrams with zoom, pan, and pinch support.

### Input and personalization

- **Attachments.** Attach up to three supported files per message, including images, text, source code, PDFs, JSON/XML/YAML, and common audio/video MIME types.
- **Voice input.** Uses the browser Web Speech API when supported.
- **Personal settings.** Change display name, Hindi/English preference, and light/dark/automatic theme; add a local custom instruction for the AI.
- **Responsive UI.** Includes animated placeholders, mobile-friendly controls, gesture-aware sidebar and tool menus, loading states, notifications, and copy controls.

### Identity, storage, and resilience

- **Two sign-in paths.** Google Identity Services OAuth or emailed one-time password verification through Resend.
- **Protected routes and signed sessions.** JWT-backed, HTTP-only authentication cookies protect the main application; the proxy redirects unauthenticated visitors to onboarding.
- **MongoDB persistence.** Stores user profiles, memories, chats, OTP records, and short-lived OTP attempt blacklist data.
- **PWA essentials.** A service worker caches static assets and provides an offline fallback page for navigation failures.
- **Desktop companion.** A small Tauri 2 shell redirects online users to the deployed application and shows an offline screen otherwise.

## Architecture

```text
Browser
  │
  ├─ Next.js App Router UI (React 19)
  │    ├─ onboarding, OAuth / OTP sign-in, preferences
  │    ├─ chat UI, attachments, speech input, Markdown / Mermaid
  │    └─ service-worker registration
  │
  └─ Next.js route handlers
       ├─ /api/chat     → Gemini streaming + tool-call loop
       ├─ /api/chats    → chat session CRUD
       ├─ /api/user     → Google OAuth, profile, sessions
       └─ /api/user/otp → Resend OTP verification
              │
              ├─ MongoDB (users, chats, OTP data)
              ├─ Google Gemini API
              ├─ Tavily (web search / extraction)
              └─ Resend (email delivery)
```

## Technology

| Area | Implementation |
| --- | --- |
| Application | Next.js 16 App Router, React 19, TypeScript |
| Model | `@google/genai` with Gemini streaming |
| Data | MongoDB with Mongoose |
| Authentication | Google OAuth, JWT cookies, Resend OTP |
| Search | Tavily |
| Rendering | `markstream-react`, KaTeX, Mermaid |
| UI | Tailwind CSS 4, custom CSS, Lucide, Lordicon |
| PWA | Web manifest and custom service worker |
| Desktop | Tauri 2 / Rust |

## Getting started

### Prerequisites

- **Node.js 20+** (the project’s type definitions target Node 20).
- **npm** (a committed `package-lock.json` is provided).
- A MongoDB instance for production. During non-production runs, the app defaults to `mongodb://localhost:27017/sanatanai` when `MONGO_URI` is not supplied.
- Credentials for Gemini, Google OAuth, Tavily, and Resend if you plan to use the corresponding features.

### Install and run

```bash
git clone https://github.com/thesanatanai/sanatanai.git
cd sanatanai
npm ci
# Create .env.local with the variables below.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app starts at the onboarding flow; complete sign-in before opening the chat.

## Configuration

Set these values in `.env.local` for local development or in your hosting provider’s environment configuration for deployments:

```dotenv
# Required for authenticated, model-backed usage
GENAI=your_google_gemini_api_key
JWT_SECRET=use_a_long_random_secret
NEXT_PUBLIC_OAUTH_CLIENT_ID=your_google_oauth_web_client_id
RESEND_API=your_resend_api_key
TAVILY_API=your_tavily_api_key

# Required in production; optional locally when using the default localhost DB
MONGO_URI=mongodb+srv://username:password@cluster.example.mongodb.net/sanatanai

# Optional: maximum chained server-side model tool calls for one user turn
# Defaults to 8.
MAX_TOOL_CALLS=8
```

### Provider setup notes

- Create a **Google OAuth web client** and register the application’s local and production origins. The same public client ID is used by the browser button and the server-side ID-token verification.
- Configure **Resend** with a verified domain that is permitted to send from the addresses configured in `app/api/utils/sendMail.ts`.
- Set `MONGO_URI` on production deployments. The application opens its MongoDB connection during server initialization.
- Tavily is used only when Gemini selects the `web_search` or `web_fetch` tool. It remains part of the model tool configuration even if a given conversation does not use it.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run webpack` | Start development with webpack explicitly selected. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint across the repository’s application code. |
| `npm test` | Run linting followed by a production build. |
| `npm run trace` | Start Next.js with internal tracing enabled. |

## Project layout

```text
app/
├── (root)/                 # Authenticated chat UI, contexts, onboarding
├── api/
│   ├── chat/               # Gemini request options, stream, tools
│   ├── chats/              # Conversation CRUD and validation
│   ├── models/             # Mongoose schemas
│   ├── user/               # OAuth, profile, OTP routes
│   └── utils/              # Database, auth, mail, system prompt
├── globals.css             # Global app styles
└── manifest.ts           # Web app manifest
components/                 # Chat, menu, settings, notifications, visuals
utils/                      # Client-side chat, file, i18n, Markdown helpers
actions/                    # Server actions for chats and error reporting
css/                        # Feature-specific style sheets
public/                     # App assets, screenshots, service worker, fallback
desktop/                    # Tauri desktop companion
```

## Desktop companion

The `desktop/` project is deliberately small: it launches a Tauri window, checks browser connectivity, opens the hosted Sanatan AI site when online, and displays an offline message otherwise. It does not bundle the Next.js application or a local database.

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

## Deployment

The web app is configured for Vercel-compatible deployment through `vercel.json`. Supply all production environment variables in the deployment environment, ensure the Google OAuth origin is registered, and use a reachable MongoDB deployment. The service worker is served as `/sw.js` with no-cache headers so updated worker code can be discovered promptly.

## Limitations and security considerations

- AI output can be mistaken or incomplete; treat it as assistance rather than authoritative advice.
- Uploads are sent inline with the chat request and therefore count toward model request size and provider limits.
- The current offline behavior is an offline fallback page and static-asset caching, not offline chat or locally stored conversations.
- Local custom instructions are stored in the browser’s `localStorage`; they are not currently persisted as server-side user preferences.
- API access is designed for the first-party browser interface and authenticated sessions rather than as a public developer API.

## Contributing

Issues and pull requests are welcome. Keep changes focused, use TypeScript where applicable, run `npm test` before opening a pull request, and avoid committing credentials or local environment files.

## License

Copyright © Shivam Sharma. This project is distributed under the MIT license; see the repository’s license information for the applicable terms.
