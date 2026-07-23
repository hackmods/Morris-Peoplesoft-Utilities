import { chromium, type BrowserContext, type Page, type Worker } from "@playwright/test";
import { resolve } from "node:path";
import { createDefaultSettings, type MpuSettings } from "../../../src/storage/schema";
import { E2E_ORIGIN } from "./fixture-server";

export const EXTENSION_DIST = resolve(process.cwd(), "dist");

export function e2eSettings(overrides: Partial<MpuSettings> = {}): MpuSettings {
  const base = createDefaultSettings();
  return {
    ...base,
    ...overrides,
    quietEnvPrompt: "Yes",
    features: {
      ...base.features,
      ...(overrides.features || {}),
      hostAllowlistEnabled: "No",
    },
    environments: overrides.environments ?? [
      { label: "DEV", active: "Yes", trcProfRunning: "No", color: "#2288aa" },
    ],
    urlSites: overrides.urlSites ?? {
      [E2E_ORIGIN]: {
        ps: { envId: 0 },
      },
    },
  };
}

export async function launchExtensionContext(): Promise<{
  context: BrowserContext;
  extensionId: string;
}> {
  const context = await chromium.launchPersistentContext("", {
    // Extensions require a non-headless Chromium channel in most Playwright versions.
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_DIST}`,
      `--load-extension=${EXTENSION_DIST}`,
      "--no-first-run",
      "--no-default-browser-check",
    ],
  });

  let sw: Worker | undefined = context.serviceWorkers()[0];
  if (!sw) {
    sw = await context.waitForEvent("serviceworker", { timeout: 30_000 });
  }
  const extensionId = sw.url().split("/")[2];
  if (!extensionId) {
    throw new Error(`Unable to resolve extension id from ${sw.url()}`);
  }
  return { context, extensionId };
}

export async function seedMpuSettings(
  context: BrowserContext,
  extensionId: string,
  settings: MpuSettings = e2eSettings(),
): Promise<void> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForSelector("body", { timeout: 15_000 });
  await page.evaluate(async (payload) => {
    await chrome.storage.local.set({ mpuSettings: payload });
  }, settings);
  await page.close();
}

export async function openPsPage(context: BrowserContext, path: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`${E2E_ORIGIN}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#mpu-bar", { timeout: 20_000 });
  return page;
}
