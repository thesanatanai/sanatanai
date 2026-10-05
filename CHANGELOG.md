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