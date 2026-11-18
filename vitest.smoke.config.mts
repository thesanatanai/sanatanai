import { defineConfig } from "vitest/config";

// HTTP smoke tests against a production build (`npm run build` first).
//   npm run test:smoke                              starts `next start` itself
//   SMOKE_BASE_URL=https://example.com npm run test:smoke
//                                                   targets a running server
export default defineConfig({
  test: {
    name: "smoke",
    environment: "node",
    include: ["tests/smoke/**/*.test.ts"],
    globalSetup: ["./tests/smoke/global-setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
