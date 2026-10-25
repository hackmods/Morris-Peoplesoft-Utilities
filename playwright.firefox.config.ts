import { defineConfig } from "@playwright/test";

process.env.MPU_E2E_PORT ??= "4174";

/** Playwright supplies assertions/reporting only. Selenium installs and drives
 * the real Firefox WebExtension; Playwright's Firefox cannot load extensions. */
export default defineConfig({
  testDir: "tests/firefox",
  testMatch: "**/*.spec.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/firefox" }]],
  projects: [{ name: "firefox-extension" }],
});
