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