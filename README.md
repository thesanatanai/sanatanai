<p align="center">
<img src="public/logo.png" alt="Sanatan AI" style="margin-left: auto; margin-right:auto; width: 200px;">
</p>
<h1 align="center" style="border-bottom:none;">Sanatan AI</h1>
<h3 align="center">The Soul of Intellignece</h3>
<p align="center">
<img src="https://img.shields.io/badge/version-1.0.0-blue.svg" />
<img src="https://img.shields.io/badge/license-MIT-green.svg" />
</p>

**Sanatan AI** is a powerful, AI-powered assistant designed to provide profound insights, answers, and guidance. Whether used as a deployable web application or a standalone desktop client, it integrates the power of Google's Generative AI (`gemini-3.5-flash`) with an elegant, lightning-fast React - NextJS UI.

## Preview
![Preview](public/desktop.png)

---

## ✨ Features

- **Dual Ecosystem:** Runs as a responsive Web Application (via Vercel serverless) AND an installable Desktop App (via Tauri and as PWA).
- **Intelligent Conversations:** Powered by Google's Gemini models for rapid, context-aware text and media discussions.
- **Persistent AI Memory:** Uses Mongodb to store sessions, remember user preferences, and maintain chat histories seamlessly.
- **Aware:** Utilizes the potential of tavliy API for up-to-date-data.
- **Robust Authentication:** Built-in secure Google OAuth flow for web interface and OTP verification for both web interface and the desktop client natively.
- **Native-Like UI/UX:** A React-NextJS frontend mimicking modern SPA capabilities including dynamic markdown rendering, syntax highlighting, theming (Light/Dark toggles), voice synthesis dictation, and smooth animations.
- **File Processing:** Upload text files, code, and images directly into the chat for the AI to analyze.
- **Offline Capable:** Configured with a Service Worker to support Progressive Web App (PWA) behaviors.

---

## 🛠️ Tech Stack

### Frontend (Client-Side)
- **Next.JS** The project is entirely built on nextjs, supports eslint, typescript and a bit of tailwindcss
- **KaTeX** (Math rendering) & **Mermaid.js** (Diagram generation)
- **Markstream-react** (Markdown Parsing)
- **LordIcon** (Animated interactions)

### Backend & API
- **Node.js** & **Next.js**
- **Google Generative AI API** (`@google/genai`)
- **Mongodb🌿** (`mongoose`) for database/storage layer
- **Nodemailer ** (Email notifications and otp verifications)
- **Tavliy API** `@tavliy\core` for real-time latest search.

### Desktop Wrapper (Tauri)
- **Tauri** for small and fast application package
- **PWA** for mobile and IOS enviornments

### Web Deployment
- **Vercel Serverless Functions**

---

## 📁 Project Structure

```text
Sanatan AI/
├── app/                   # Main application
│   ├── page.tsx           # Main App page
│   ├── layout.tsx         # The overall layout
│   ├── globals.css        # The global styles for app
│   ├── welcome            # The route for new users
|   └── ...
│
├── public/                # Pulic Resources
├── utils/
|   ├── gestures.ts        # App guestures
|   ├── i18n.tsx           # Language resources
|   ├── md.tsx             # Markdown rendering engine
|   ├── typed.tsx          # Typing animation
|   ├── userRefManager.ts  # Custom React - like hook
|   └── ...
├── package.json           # Dependencies and project scripts
└── ...
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have installed:
- [Node.js](https://nodejs.org/) (Version 18+ recommended)
- Git

You will also need valid API keys for:
- Google Gemini API
- Google OAuth (Client ID)
- JWT_SECRET
- Mongodb database
- Tavliy API keys

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ShivamSharma999/sanatanai.git
   cd sanatanai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add the following keys.
   ```env
   PORT=3000
   GEMINI=your_google_gemini_api_key
   CLIENT_ID=your_google_oauth_client_id
   JWT_SECRET=your_jwt_secret
   MONGO_URI=your_mongodb_uri
   TAVLIY_API=your_tavliy_api_key
   ```

4. **Run the local Development Server:**
   ```bash
   npm run dev
   ```
   *The application will boot up at `http://localhost:3000`.*

---

## 📦 Desktop Application (Tauri)

Sanatan AI can be bundled as an executable desktop application using Tauri.

To test the Tauri app locally:
```bash
cd desktop
npm run tauri dev
```

To build the executable for distribution:
```bash
cd desktop
npm run tauri build
```

Or install latest application bundle from GitHub.

---

## 🌐 Web Deployment

This application is tailored to be deployed effortlessly to **Vercel** currently serving the world at
[sanatan-next-three.vercel.app](https://sanatan-next-three.vercel.app) and will soon be available on [sanatan-ai.vercel.app](https://sanatan-ai.vercel.app)

---

## 🤝 Contributing
Contributions are always welcome. Please ensure that PRs are accompanied by clear descriptions and that you respect the architecture and idea behind creating **Sanatan AI**.

## 📝 License
Copyright © Shivam Sharma. All rights reserved. 
Use of this source code is governed by an MIT agreement.
