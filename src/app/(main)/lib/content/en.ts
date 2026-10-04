import type { Content } from "./types";

export const en: Content = {
  meta: {
    title: "Sanatan AI",
    description:
  "Sanatan AI is a free Hindi and English AI assistant for Sanatan Dharma. Ask questions, explore scriptures, research current sources, and discover ancient wisdom.",
    keywords: [
      "Sanatan AI",
      "Sanatan Dharma AI",
      "Sanatan chatbot",
      "Hindi AI assistant",
      "Sanatan ChatGPT",
      "Sanatan Gemini",
      "scripture AI",
      "free AI chatbot",
      "Sanatan Calendar",
      "Panchang",
    ],
    locale: "en_IN",
    ogBrand: "Sanatan AI",
    ogTagline: "The Soul of Intelligence",
    ogSub: "A free Hindi and English AI assistant for Sanatan Dharma.",
    ogAlt: "Sanatan AI: The Soul of Intelligence",
  },
  ui: {
    skip: "Skip to content",
    openApp: "Open app",
    scrollHint: "Scroll to step through",
    home: "Sanatan AI, back to top",
    external: "(opens in a new tab)",
    navLabel: "Primary",
    langLabel: "Language",
    nav: { about: "About", features: "Features", demo: "Demo", calendar: "Calendar", faq: "FAQ" },
  },
  hero: {
    a: ["We", "create"],
    b: ["the", "future"],
    brand: "Sanatan AI",
    brandSr: ": The Soul of Intelligence",
    sub: "The Soul of Intelligence",
  },
  story: {
    title: "Meet Sanatan AI, the soul of intelligence",
    body: "Ask anything. Sanatan AI weaves each answer into Sanatan Dharma, so you can move from a quick question to the ancient texts behind it. Discover them, dive deep into them, and pay nothing for it.",
    listLabel: "Where Sanatan AI brings ideas together",
    pairs: [
      ["knowledge", "wisdom"],
      ["science", "scriptures"],
      ["technology", "dharma"],
    ],
    meets: "{a} meets {b}",
  },
  features: {
    title: "Made for everyone who is curious",
    body: "One place to ask, read and reflect, whether you are on a phone, a browser or a Windows desktop.",
    items: [
      {
        id: "free",
        title: "Free of cost",
        body: "Sanatan AI is free for everyone, rich or poor. Open your mind to the idea of karma without paying for it.",
      },
      {
        id: "platform",
        title: "Cross platform",
        body: "Runs in most browsers, installs as a web app on your phone and as a desktop app on Windows.",
      },
      {
        id: "interactive",
        title: "Interactive",
        body: "An animated interface with light and dark themes, moving icons and an easy layout. Enjoy the journey to the roots of the universe.",
      },
      {
        id: "accurate",
        title: "Accurate",
        body: "Built on Google's Gemini models, so it understands what you ask and answers in your language, with web research when a question needs current sources.",
      },
    ],
  },
  marquee: [
    "Free for everyone",
    "Hindi and English",
    "Answers that stream in",
    "Shlokas, maths and diagrams",
    "Web research on demand",
    "Installs on phone and desktop",
  ],
  inside: {
    title: "Inside the app",
    body: "A chat that is built to read scripture as comfortably as it reads code.",
    items: [
      {
        title: "Answers stream in as they are written",
        body: "Watch each reply appear word by word. Turn on Deep Think when a question needs more careful reasoning.",
      },
      {
        title: "Shlokas, maths and diagrams",
        body: "Sanskrit verses, equations, code and interactive diagrams render cleanly inside the chat.",
      },
      {
        title: "Web research on demand",
        body: "When a question needs current sources, the assistant can search the web and read a page for you.",
      },
      {
        title: "Files, voice and memory",
        body: "Attach up to three files per message, dictate where your browser supports it, and pick up saved chats later.",
      },
      {
        title: "Hindi and English",
        body: "Choose your language and a light, dark or system theme, and add your own instruction for the assistant.",
      },
      {
        title: "Installs anywhere",
        body: "Use it in the browser, add it to your phone as a web app, or run the Windows desktop companion.",
      },
    ],
    chatLabel: "Illustrative conversation with Sanatan AI",
    chatNote: "Illustrative conversation. Real answers vary.",
    chatLang: "Demo language",
  },
  family: {
    title: "More from Sanatan AI",
    body: "The same care, applied to your day and to the scriptures.",
  },
  calendar: {
    name: "Sanatan Calendar",
    title: "The day's Panchang, at a glance",
    body: "A daily Panchang and festival calendar for the Hindu lunar calendar. See the tithi, nakshatra, sunrise and sunset, auspicious and inauspicious periods and the day's festivals, all calculated inside the app with no outside service to wait on.",
    points: [
      "Tithi, vara, nakshatra, yoga and karana for every day",
      "Sunrise, sunset, Rahu Kalam, Abhijit Muhurta and the Choghadiya table",
      "A month view that keeps the moon phase and festival dates in sight",
      "Today's and upcoming festivals, light and dark themes, and an offline fallback",
    ],
    note: "Calculated for Ujjain, the traditional reference point for Hindu astronomy.",
    visit: "Visit Sanatan Calendar",
    screensLabel: "Sanatan Calendar screens",
    tabs: [
      { id: "today", label: "Today", alt: "Sanatan Calendar showing the tithi, moon and the five limbs of the Panchang for today" },
      { id: "month", label: "Month", alt: "Sanatan Calendar month view with moon phases and festival dates" },
      { id: "muhurta", label: "Muhurta", alt: "Sanatan Calendar hour-by-hour view with Rahu Kalam, Choghadiya and planetary positions" },
      { id: "festivals", label: "Festivals", alt: "Sanatan Calendar list of upcoming festivals" },
    ],
    phoneAlt: "Sanatan Calendar month view on a phone",
  },
  gita: {
    name: "Bhagavad Gita",
    title: "Read the Bhagavad Gita",
    body: "A fast Gita viewer with all 18 chapters and 700+ verses, a Hindi and English interface, audio recitation, search and shareable verse images.",
    tags: ["18 chapters", "700+ verses", "Audio recitation", "Hindi and English"],
    visit: "Visit Gita",
    viewRepo: "View Gita on GitHub",
    imageAlt: "Krishna and Arjuna on the battlefield chariot, the artwork shown in the Gita app",
  },
  stack: {
    title: "Under the hood",
    body: "Sanatan AI is a full-stack, open source web app. Here is what it runs on.",
    groups: [
      { group: "Interface", items: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS 4"] },
      { group: "Intelligence", items: ["Google Gemini", "Tavily web research", "Markdown, KaTeX, Mermaid"] },
      { group: "Accounts and data", items: ["Google sign-in or email code", "MongoDB", "Resend email"] },
      { group: "Everywhere", items: ["Installable web app", "Tauri 2 desktop companion"] },
    ],
  },
  faq: {
    title: "Questions, answered",
    items: [
      {
        q: "What is Sanatan AI?",
        a: "Sanatan AI is a conversational assistant built around Sanatan Dharma. It answers questions about spirituality, scriptures and everyday topics, and connects each answer back to Sanatan Dharma.",
      },
      {
        q: "Is Sanatan AI free?",
        a: "Yes. Sanatan AI is free to use, so anyone can explore ancient texts and go deeper into them without paying.",
      },
      {
        q: "Which languages does it support?",
        a: "Hindi and English. You choose your language when you start and can change it later in settings.",
      },
      {
        q: "Which devices can I use it on?",
        a: "It runs in most modern browsers, installs as a web app on phones, and has a desktop companion app for Windows.",
      },
      {
        q: "Which AI model powers it?",
        a: "Google's Gemini models generate the answers. When a question needs current information, the assistant can also search the web through Tavily.",
      },
      {
        q: "Do I need an account?",
        a: "Yes. You sign in with Google or with a one-time code sent to your email. Your chats are saved so you can return to them.",
      },
      {
        q: "Can I rely on it for spiritual, medical, legal or financial decisions?",
        a: "Sanatan AI is meant for educational and informational conversations. AI can be mistaken or incomplete, so for consequential decisions please consult a qualified person.",
      },
      {
        q: "What is Sanatan Calendar?",
        a: "Sanatan Calendar is a daily Panchang and festival calendar. It shows the tithi, nakshatra, sunrise and sunset, auspicious periods and festivals for any day, and it opens at calendar.shivam.click.",
      },
    ],
  },
  cta: {
    title: "Ready when you are",
    body: "Ask your first question and see where the answer leads.",
    button: "Open Sanatan AI",
    code: "Read the code on GitHub",
  },
  footer: {
    disclaimer:
      "Sanatan AI is meant for educational and informational conversations. For consequential spiritual, medical, legal or financial decisions, please consult a qualified person.",
    open: "Open Sanatan AI",
    code: "Source code on GitHub",
    calendar: "Sanatan Calendar",
    gita: "Bhagavad Gita",
    madeBy: "Made by Shivam Sharma",
    rights: "Copyright © {year} Sanatan AI. All rights reserved.",
  },
};
