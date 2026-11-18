import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// `server-only` throws when imported outside a React Server Components build.
// Tests run in plain Node, so it is replaced by an empty module.
const serverOnly = fileURLToPath(
  new URL("./tests/helpers/server-only.ts", import.meta.url),
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolves the "@/*" alias from tsconfig.json.
    tsconfigPaths: true,
    alias: { "server-only": serverOnly },
  },
  test: {
    setupFiles: ["./tests/setup/env.ts"],
    // Generous so a cold, slow CI runner does not fail on first-import time.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    projects: [
      {
        // Server code: route handlers, utilities, schemas, the proxy, ...
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["tests/unit/**/*.test.ts", "tests/routes/**/*.test.ts"],
        },
      },
      {
        // React components and hooks.
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["tests/dom/**/*.test.{ts,tsx}"],
          setupFiles: ["./tests/setup/dom.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        // Marketing/animation code (three.js, GSAP): exercised by the smoke
        // tests against the built site, not by unit tests. "[(]" matches a
        // literal "(" because parentheses are special in glob patterns.
        "src/app/[(]main[)]/components/**",
        "src/app/[(]main[)]/hooks/**",
        "src/app/[(]main[)]/**/page.tsx",
        "src/app/[(]main[)]/**/layout.tsx",
        // Next.js file-convention entry points that only compose other code.
        "src/app/**/layout.tsx",
        "src/app/**/page.tsx",
        "src/app/**/*.d.ts",
      ],
      // `npm run test:coverage` fails when coverage drops below these. Server
      // code (API routes, server actions, the proxy) is held to a high bar;
      // the rest has a floor that catches large regressions. Raise the floor
      // as UI tests are added, never lower it to make a build pass.
      thresholds: {
        "src/app/api/**": { statements: 95, branches: 90, functions: 95, lines: 95 },
        "src/actions/**": { statements: 95, branches: 90, functions: 95, lines: 95 },
        "src/proxy.ts": { statements: 95, branches: 90, functions: 95, lines: 95 },
        statements: 65,
        branches: 58,
        functions: 55,
        lines: 65,
      },
    },
  },
});
