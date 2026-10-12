import { test as base, expect } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import type { Server } from "node:http";
import { audit } from "./helpers/accessibility";
import type { MpuSettings } from "../../src/storage/schema";
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
  test("rendered bar, flyouts, and dialogs pass browser axe including contrast", async ({ fluidPage }) => {
    test.setTimeout(60_000);
    await audit(fluidPage, "#mpu-bar");
    for (const trigger of ["#mpu-env", "#mpu-fav", "#mpu-admin", "#mpu-pagetabs"]) {
      await fluidPage.locator(trigger).click();
      await audit(fluidPage, '.mpu-flyout:not([hidden])');
      await fluidPage.locator(trigger).click();
    }
    for (const trigger of ["#mpu-pageinfo", "#mpu-pcode", "#mpu-structure", "#mpu-goto", "#mpu-help"]) {
      await fluidPage.locator(trigger).click();
      await audit(fluidPage, "#mpu-dialog");
      await fluidPage.keyboard.press("Escape");
    }
  });

  test("menu keys navigate levels and restore focus; modal Tab wraps", async ({ fluidPage }) => {
    const admin = fluidPage.locator("#mpu-admin");
    await admin.focus();
    await fluidPage.keyboard.press("ArrowDown");
    const menu = fluidPage.getByRole("menu", { name: "Admin jumps", exact: true });
    const categories = menu.locator(':scope > .mpu-menu-has-sub > button');
    await expect(categories.first()).toBeFocused();
    await fluidPage.keyboard.press("ArrowDown");
    await expect(categories.nth(1)).toBeFocused();
    await fluidPage.keyboard.press("Home");
    await expect(categories.first()).toBeFocused();
    await fluidPage.keyboard.press("ArrowRight");
    const firstChild = menu.locator(':scope > .mpu-menu-has-sub').first().getByRole("menuitem").nth(1);
    await expect(firstChild).toBeFocused();
    await fluidPage.keyboard.press("ArrowLeft");
    await expect(categories.first()).toBeFocused();
    await fluidPage.keyboard.press("Escape");
    await expect(admin).toBeFocused();
    await expect(menu).toBeHidden();
    await fluidPage.keyboard.press("ArrowUp");
    await expect(categories.last()).toBeFocused();
    await fluidPage.keyboard.press("Tab");
    await expect(menu).toBeHidden();
    await expect(fluidPage.locator("#mpu-field")).toBeFocused();

    await fluidPage.locator("#mpu-goto").click();
    const dialog = fluidPage.getByRole("dialog");
    const last = dialog.locator("button").last();
    await last.focus();
    await fluidPage.keyboard.press("Tab");
    await expect(dialog.locator("input").first()).toBeFocused();
    await fluidPage.keyboard.type("M.COMP.GBL");
    await fluidPage.keyboard.press("Escape");
    await expect(fluidPage.locator("#mpu-goto")).toBeFocused();
  });

  test("bar and dialogs reflow in a narrow viewport", async ({ fluidPage }) => {
    // 320 CSS px models the available width at 400% zoom on a 1280 px window.
    await fluidPage.setViewportSize({ width: 320, height: 600 });
    const bar = await fluidPage.locator("#mpu-bar").boundingBox();
    expect(bar!.x).toBeGreaterThanOrEqual(0);
    expect(bar!.x + bar!.width).toBeLessThanOrEqual(320);
    for (const trigger of ["#mpu-pageinfo", "#mpu-pcode", "#mpu-goto", "#mpu-help"]) {
      await fluidPage.locator(trigger).click();
      const box = await fluidPage.getByRole("dialog").boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(320);
      expect(box!.height).toBeLessThanOrEqual(600);
      await fluidPage.keyboard.press("Escape");
    }
  });

  test("rendered extension pages pass browser axe including contrast", async ({ extensionContext, extensionId }) => {
    for (const path of ["options.html", "popup.html", "sidepanel.html"]) {
      const page = await extensionContext.newPage();
      await page.goto(`chrome-extension://${extensionId}/${path}`);
      await audit(page);
      await page.close();
    }
  });

  test("disabling the host cancels shortcuts and Page Info snapshots", async ({ fluidPage, extensionContext }) => {
    const sw = extensionContext.serviceWorkers()[0];
    await sw.evaluate(async () => {
      const stored = await chrome.storage.local.get("mpuSettings");
      const s = stored.mpuSettings as MpuSettings;
      s.features.hostAllowlistEnabled = "Yes"; s.hostAllowlist = [];
      await chrome.storage.local.set({ mpuSettings: s });
    });
    await expect(fluidPage.locator("#mpu-bar")).toHaveCount(0);
    await fluidPage.keyboard.press("Alt+Shift+P");
    await fluidPage.keyboard.press("Alt+Shift+I");
    await expect(fluidPage.locator("#mpu-dialog")).toHaveCount(0);
    const snapshot = await sw.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((t) => t.url?.includes("/c/MENU.COMP.GBL"))!;
      return chrome.tabs.sendMessage(tab.id!, { type: "mpu-page-info-snapshot" });
    });
    expect(snapshot.text).toContain("disabled");
  });

  test("two open components do not keep rewriting recent history", async ({ fluidPage, extensionContext }) => {
    const second = await openPsPage(extensionContext, CLASSIC_COMPONENT_PATH);
    await expect(fluidPage.locator("#mpu-bar")).toBeVisible();
    const sw = extensionContext.serviceWorkers()[0];
    const changes = await sw.evaluate(async () => {
      let count = 0;
      const listener = (changes: Record<string, chrome.storage.StorageChange>) => { if (changes.mpuSettings) count++; };
      chrome.storage.onChanged.addListener(listener);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      chrome.storage.onChanged.removeListener(listener);
      return count;
    });
    expect(changes).toBeLessThanOrEqual(1);
    await second.close();
  });

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
