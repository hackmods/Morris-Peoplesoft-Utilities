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
  test("two Options tabs preserve independent edits and report conflicting environment drafts", async ({ extensionContext, extensionId }) => {
    test.setTimeout(120_000);
    const first = await extensionContext.newPage();
    const second = await extensionContext.newPage();
    const url = `chrome-extension://${extensionId}/options.html`;
    await Promise.all([first.goto(url), second.goto(url)]);
    await first.locator("#greetingOption").uncheck();
    await second.locator("#traceOption").check();
    await Promise.all([first.locator("#save-features").click(), second.locator("#save-features").click()]);
    const read = () => extensionContext.serviceWorkers()[0].evaluate(async () => (await chrome.storage.local.get("mpuSettings")).mpuSettings as MpuSettings);
    await expect.poll(async () => (await read()).features.greetingOption).toBe("No");
    await expect.poll(async () => (await read()).features.traceOption).toBe("Yes");
    await first.getByRole("tab", { name: "Environments", exact: true }).click();
    await second.getByRole("tab", { name: "Environments", exact: true }).click();
    await first.getByRole("textbox", { name: "Environment 1 name" }).fill("DEV A");
    await second.getByRole("textbox", { name: "Environment 1 name" }).fill("DEV B");
    await first.locator("#env-list").getByRole("button", { name: "Save", exact: true }).click();
    await expect.poll(async () => (await read()).environments[0].label).toBe("DEV A");
    await second.locator("#env-list").getByRole("button", { name: "Save", exact: true }).click();
    await expect(second.locator("#toast")).toContainText("Settings changed in another tab");
    expect((await read()).environments[0].label).toBe("DEV A");
    await first.close(); await second.close();
  });

  test("diagnostics are previewed before export and upgrade baselines retain selectable history", async ({ fluidPage }) => {
    test.setTimeout(120_000);
    await fluidPage.locator("#mpu-pageinfo").click();
    await fluidPage.locator("#mpu-pi-diagnostics").click();
    const preview = fluidPage.getByRole("textbox", { name: "Diagnostic report", exact: true });
    await expect(preview).toBeFocused();
    const contents = await preview.inputValue();
    expect(JSON.parse(contents).report).toBe("MPU local diagnostics");
    for (const excluded of ["127.0.0.1", "ICSID", "JOB_EMPLID", "EMPLOYEE/HRMS"]) expect(contents).not.toContain(excluded);
    await audit(fluidPage, "#mpu-dialog");
    await preview.fill(`${contents}\nReviewed reproduction: synthetic test only.`);
    const downloaded = fluidPage.waitForEvent("download");
    await fluidPage.locator("#mpu-diagnostic-download").click();
    expect((await downloaded).suggestedFilename()).toBe("mpu-diagnostics.txt");
    await fluidPage.locator("#mpu-pi-watch-save").click();
    const baselines = fluidPage.locator("#mpu-pi-baseline");
    await expect(baselines.locator("option")).toHaveCount(2);
    const original = await baselines.inputValue();
    await fluidPage.evaluate(() => { const field = document.createElement("input"); field.id = "SYNTHETIC_NEWFIELD$0"; document.body.append(field); });
    await fluidPage.locator("#mpu-pi-watch-save").click();
    await expect(baselines.locator("option")).toHaveCount(3);
    await baselines.selectOption(original);
    await fluidPage.locator("#mpu-pi-check-drift").click();
    await expect(fluidPage.locator("#mpu-pi-diff")).toContainText("# Upgrade validation handoff");
    await expect(fluidPage.locator("#mpu-pi-diff")).toContainText("SYNTHETIC");
    await expect(fluidPage.locator("#mpu-pi-copy-handoff")).toBeVisible();
    await audit(fluidPage, "#mpu-dialog");
    await fluidPage.setViewportSize({ width: 320, height: 600 });
    await audit(fluidPage, "#mpu-dialog");
    await fluidPage.keyboard.press("Escape");
    await expect(fluidPage.locator("#mpu-pageinfo")).toBeFocused();
  });

  test("trace shows request evidence and closes its action dialog when disabled", async ({ extensionContext, fluidPage }) => {
    test.setTimeout(120_000);
    const sw = extensionContext.serviceWorkers()[0];
    await sw.evaluate(async () => {
      const settings = (await chrome.storage.local.get("mpuSettings")).mpuSettings as MpuSettings;
      settings.features.traceOption = "Yes";
      settings.environments[0].traceRequest = { origin: "http://127.0.0.1:4173", site: "ps", at: Date.now(), target: "on", status: "confirmed" };
      await chrome.storage.local.set({ mpuSettings: settings });
    });
    await expect(fluidPage.locator("#mpu-trace")).toContainText("last ON");
    await fluidPage.locator("#mpu-trace").click();
    await expect(fluidPage.locator("#mpu-trace-evidence")).toContainText("not a live server query");
    await audit(fluidPage, "#mpu-dialog");
    await fluidPage.keyboard.press("Escape");
    await expect(fluidPage.locator("#mpu-trace")).toBeFocused();
    await fluidPage.locator("#mpu-trace").click();
    await sw.evaluate(async () => {
      const settings = (await chrome.storage.local.get("mpuSettings")).mpuSettings as MpuSettings;
      settings.features.traceOption = "No";
      await chrome.storage.local.set({ mpuSettings: settings });
    });
    await expect(fluidPage.locator("#mpu-trace-title")).toHaveCount(0);
    await expect(fluidPage.locator("#mpu-trace")).toHaveCount(0);
    await fluidPage.goto(`${fluidPage.url()}?cmd=logout`);
    await expect.poll(() => sw.evaluate(async () => ((await chrome.storage.local.get("mpuSettings")).mpuSettings as MpuSettings).environments[0].traceRequest?.status)).toBe("unknown");
  });

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
      await page.emulateMedia({ colorScheme: "dark" });
      await audit(page);
      await page.close();
    }
  });

  test("Agents library filters locally, preserves keyboard navigation and passes rendered axe", async ({ extensionContext, extensionId }) => {
    test.setTimeout(60_000);
    const page = await extensionContext.newPage();
    const externalRequests: string[] = [];
    page.on("request", (request) => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
    await page.goto(`chrome-extension://${extensionId}/options.html#agents`);
    await expect(page.getByRole("tab", { name: "Agents", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#agent-list > li")).toHaveCount(24);
    await expect(page.locator("#agent-templates a")).toHaveCount(3);
    const before = await page.evaluate(() => chrome.storage.local.get("mpuSettings"));
    const search = page.getByRole("searchbox", { name: "Search prompts" });
    await search.fill("fluid accessibility");
    await expect(page.locator("#agent-list > li")).toHaveCount(1);
    await expect(search).toBeFocused();
    const link = page.locator("#agent-list a");
    await expect(link).toHaveAttribute("href", "https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/review-fluid-accessibility/AGENT.md");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await page.getByRole("button", { name: "Prepare task brief for PeopleSoft Fluid and Classic accessibility reviewer" }).click();
    const brief = page.getByRole("textbox", { name: "Task brief", exact: true });
    await expect(brief).toBeFocused();
    await expect(brief).toHaveValue(/ps-review-fluid-accessibility/);
    expect(await brief.evaluate((element) => {
      const area = element as HTMLTextAreaElement;
      return { caret: area.selectionStart, scroll: area.scrollTop };
    })).toEqual({ caret: 0, scroll: 0 });
    expect(await brief.inputValue()).not.toContain("127.0.0.1");
    await page.getByRole("button", { name: "Copy task brief", exact: true }).click();
    await expect(page.locator("#agent-brief-status")).toContainText(/copied|selected/);
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => { throw new Error("Synthetic clipboard denial"); } },
    }));
    await page.getByRole("button", { name: "Copy task brief", exact: true }).click();
    await expect(page.locator("#agent-brief-status")).toContainText("The brief is selected");
    await expect(brief).toBeFocused();
    expect(await brief.evaluate((element) => {
      const area = element as HTMLTextAreaElement;
      return area.selectionEnd - area.selectionStart;
    })).toBe((await brief.inputValue()).length);
    await audit(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await audit(page);
    await page.setViewportSize({ width: 320, height: 600 });
    await audit(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await search.fill("nonexistent");
    await expect(page.locator("#agent-results")).toContainText("No prompts match");
    await page.locator("#tab-agents").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#tab-about")).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("#tab-agents")).toBeFocused();
    const after = await page.evaluate(() => chrome.storage.local.get("mpuSettings"));
    expect(after).toEqual(before);
    expect(externalRequests).toEqual([]);
    await page.close();
  });

  test("popup and side panel reference the local library; Help exposes only public documentation", async ({ extensionContext, extensionId, fluidPage }) => {
    for (const path of ["popup.html", "sidepanel.html"]) {
      const page = await extensionContext.newPage();
      await page.goto(`chrome-extension://${extensionId}/${path}`);
      await expect(page.locator("#open-agents")).toHaveAttribute("href", `chrome-extension://${extensionId}/options.html#agents`);
      const [library] = await Promise.all([extensionContext.waitForEvent("page"), page.locator("#open-agents").click()]);
      await expect(library.locator("#panel-agents")).toBeVisible();
      await library.close();
      await page.close();
    }
    await fluidPage.locator("#mpu-help").click();
    const link = fluidPage.locator("#mpu-agent-help a");
    await expect(link).toHaveAttribute("href", "https://github.com/hackmods/Morris-Peoplesoft-Utilities/tree/main/agents");
    await expect(link).toHaveAttribute("referrerpolicy", "no-referrer");
    await audit(fluidPage, "#mpu-dialog");
    await fluidPage.keyboard.press("Escape");
    await expect(fluidPage.locator("#mpu-help")).toBeFocused();
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
