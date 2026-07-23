import { defineConfig } from "@playwright/test";

/**
 * Extension UI tests (Chromium + unpacked `dist`).
 * Requires a prior `npm run build`. Prefer `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  // Specs launch their own persistent context with --load-extension.
  projects: [{ name: "chromium-extension", use: { browserName: "chromium" } }],
});
