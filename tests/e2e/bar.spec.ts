import { test as base, expect } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import type { Server } from "node:http";
import {
  CLASSIC_COMPONENT_PATH,
  FLUID_COMPONENT_PATH,
  startFixtureServer,
  stopFixtureServer,
} from "./helpers/fixture-server";
import {
  e2eSettings,
  launchExtensionContext,
  openPsPage,
  seedMpuSettings,
} from "./helpers/extension";

type Fixtures = {
  extensionContext: BrowserContext;
  extensionId: string;
  fluidPage: Page;
};

const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  extensionContext: async ({}, use) => {
    const server: Server = await startFixtureServer();
    const { context, extensionId } = await launchExtensionContext();
    await seedMpuSettings(context, extensionId, e2eSettings());
    await use(context);
    await context.close();
    await stopFixtureServer(server);
  },
  extensionId: async ({ extensionContext }, use) => {
    const sw = extensionContext.serviceWorkers()[0];
    const id = sw?.url().split("/")[2];
    if (!id) throw new Error("extension id missing");
    await use(id);
  },
  fluidPage: async ({ extensionContext }, use) => {
    const page = await openPsPage(extensionContext, FLUID_COMPONENT_PATH);
    await use(page);
    await page.close();
  },
});

test.describe("MPU extension UI", () => {
  test("mounts bar and Env flyout with site / portal / ToolsRel / theme / CREF", async ({
    fluidPage,
  }) => {
    const bar = fluidPage.locator("#mpu-bar");
    await expect(bar).toBeVisible();
    await expect(bar).toContainText("MPU");
    await expect(fluidPage.locator("#mpu-env")).toHaveText("DEV");

    await fluidPage.locator("#mpu-env").click();
    const flyout = fluidPage.locator("#mpu-env-flyout");
    await expect(flyout).toBeVisible();
    await expect(flyout).toContainText("Site");
    await expect(flyout).toContainText("ps");
    await expect(flyout).toContainText("Portal");
    await expect(flyout).toContainText("EMPLOYEE");
    await expect(flyout).toContainText("Node");
    await expect(flyout).toContainText("HRMS");
    await expect(flyout).toContainText("ToolsRel");
    await expect(flyout).toContainText("8.61.15");
    await expect(flyout).toContainText("Theme");
    await expect(flyout).toContainText("ptal-theme-redwood");
    await expect(flyout).toContainText("CREF path");
    await expect(flyout).toContainText("Home");
    await expect(fluidPage.locator("#mpu-env-copy")).toBeVisible();
  });

  test("Page Info dialog opens with copy actions", async ({ fluidPage }) => {
    await fluidPage.locator("#mpu-pageinfo").click();
    await expect(fluidPage.locator("#mpu-pi-title")).toHaveText("Page Information");
    await expect(fluidPage.locator("#mpu-pi-body")).toBeVisible();
    await expect(fluidPage.locator("#mpu-pi-copy")).toBeVisible();
  });

  test("Shortcuts flyout opens under the bar", async ({ fluidPage }) => {
    await fluidPage.locator("#mpu-fav").click();
    const flyout = fluidPage.locator('.mpu-flyout[aria-label="Shortcuts"]');
    await expect(flyout).toBeVisible();
    await expect(flyout).toContainText("Add to Shortcuts");
  });

  test("Classic fixture mounts classic bar", async ({ extensionContext }) => {
    const page = await openPsPage(extensionContext, CLASSIC_COMPONENT_PATH);
    await expect(page.locator("#mpu-bar")).toBeVisible();
    await expect(page.locator("#mpu-ui-mode")).toHaveText(/Classic/i);
    await page.close();
  });

  test("options and popup extension pages load", async ({ extensionContext, extensionId }) => {
    const options = await extensionContext.newPage();
    await options.goto(`chrome-extension://${extensionId}/options.html`);
    await expect(options.locator("body")).toContainText(/Morris PeopleSoft Utilities|Features|Environments/i);
    await options.close();

    const popup = await extensionContext.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(popup.locator("h1")).toContainText("Morris PeopleSoft Utilities");
    await popup.close();
  });
});
