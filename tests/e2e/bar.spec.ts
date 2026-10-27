import { test as base, expect } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import type { Server } from "node:http";
import { audit } from "./helpers/accessibility";
import type { MpuSettings } from "../../src/storage/schema";
import { AGENT_REFERENCES } from "../../src/generated/agent-catalog";
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
  test("Help and contextual PCode references open working private Options destinations", async ({ extensionContext, extensionId, fluidPage }) => {
    await fluidPage.locator("#mpu-help").click();
    let opened = extensionContext.waitForEvent("page");
    await fluidPage.getByRole("button", { name: "Oracle documentation hub (PeopleTools version-aware)", exact: true }).click();
    let target = await opened; await expect(target.locator("#panel-docs")).toBeVisible();
    await expect(target).toHaveURL(`chrome-extension://${extensionId}/options.html?tools=8.61.15#docs`); await target.close();
    await fluidPage.keyboard.press("Escape"); await fluidPage.locator("#mpu-pcode").click();
    await expect(fluidPage.locator("#mpu-pcode-context-form")).toContainText("No field locked");
    await expect(fluidPage.getByRole("button", { name: "Copy contextual example", exact: true })).toHaveCount(0);
    for (const [name, panel] of [["Prepare a PeopleCode task with an agent", "agents"], ["Find PeopleCode API and language documentation", "docs"]]) {
      opened = extensionContext.waitForEvent("page"); await fluidPage.getByRole("button", { name, exact: true }).click();
      target = await opened; await expect(target.locator(`#panel-${panel}`)).toBeVisible(); await target.close();
    }
    await fluidPage.keyboard.press("Escape"); await fluidPage.locator("#mpu-field").click();
    await fluidPage.locator('.mpu-recfield-icon[data-mpu-field-id="JOB_EMPLID"]').click();
    await fluidPage.locator("#mpu-pcode").click();
    await fluidPage.getByLabel("Verified record name", { exact: true }).fill("JOB");
    await fluidPage.getByLabel("Verified field name", { exact: true }).fill("EMPLID");
    await fluidPage.getByLabel("Intended PeopleCode event", { exact: true }).selectOption("FieldChange");
    await fluidPage.getByLabel("Verified row/scroll context (up to 500 characters)", { exact: true }).fill("Verified current component row");
    await fluidPage.getByLabel("I verified this event and row context in App Designer", { exact: true }).check();
    await fluidPage.getByRole("button", { name: "Preview contextual example", exact: true }).click();
    const example = fluidPage.getByLabel("Contextual PeopleCode example", { exact: true });
    await expect(example).toContainText("JOB.EMPLID.FieldChange"); await expect(example).toBeFocused();
    await expect(fluidPage.getByRole("button", { name: "Copy contextual example", exact: true })).toBeEnabled();
    await audit(fluidPage, "#mpu-dialog"); await fluidPage.setViewportSize({ width: 320, height: 700 }); await audit(fluidPage, "#mpu-dialog");
    await fluidPage.getByLabel("Verified row/scroll context (up to 500 characters)", { exact: true }).fill("Changed context");
    await expect(example).toHaveText(""); await expect(fluidPage.getByRole("button", { name: "Copy contextual example", exact: true })).toBeDisabled();
    await fluidPage.keyboard.press("Escape"); await expect(fluidPage.locator("#mpu-pcode")).toBeFocused();
  });
  test("Oracle hub filters locally, handles versions, and synchronizes favorites", async ({ extensionContext, extensionId }) => {
    const options = await extensionContext.newPage();
    const panel = await extensionContext.newPage();
    const externalRequests: string[] = [];
    for (const page of [options, panel]) page.on("request", request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
    await options.goto(`chrome-extension://${extensionId}/options.html#docs`);
    await panel.goto(`chrome-extension://${extensionId}/sidepanel.html#docs`);
    await expect(options.locator(".oracle-docs-item")).toHaveCount(45);
    await options.getByLabel("Search manuals", { exact: true }).fill("fluid");
    await expect(options.locator(".oracle-docs-item")).toHaveCount(1);
    await options.locator(".oracle-docs-favorite").click();
    await expect(options.locator(".oracle-docs-favorite")).toBeFocused();
    await panel.getByLabel("Manual list").selectOption("favorites");
    await expect(panel.locator(".oracle-docs-item")).toHaveCount(1);
    await expect(panel.locator(".oracle-docs-item a")).toHaveAttribute("referrerpolicy", "no-referrer");
    await options.getByLabel("PeopleTools version", { exact: true }).fill("8.61");
    await expect(options.locator(".oracle-docs-item")).toHaveCount(1);
    await expect(options.locator(".oracle-docs-item a")).toHaveAttribute("href", /pt861tflu/);
    await options.getByLabel("PeopleTools version", { exact: true }).fill("8.62.06");
    await expect(options.locator(".oracle-docs-item")).toHaveCount(1);
    await options.getByLabel("Application manual family").selectOption("hcm");
    await expect(options.getByRole("link", { name: "Open Human Capital Management documentation index" })).toHaveAttribute("href", /human-capital-management/);
    await options.getByLabel("Search manuals", { exact: true }).fill("payroll north america");
    await expect(options.locator(".oracle-docs-item")).toHaveCount(1);
    await expect(options.locator("#oracle-docs")).toContainText("Update Image 55");
    await options.locator(".oracle-docs-favorite").click();
    await panel.getByLabel("Application manual family").selectOption("hcm");
    await expect(panel.locator(".oracle-docs-item")).toHaveCount(1);
    await options.getByLabel("Search manuals", { exact: true }).fill("");
    await options.getByLabel("Application manual family").selectOption("fscm");
    await expect(options.locator(".oracle-docs-item")).toHaveCount(60);
    await options.getByLabel("Application manual family").selectOption("cs");
    await expect(options.locator(".oracle-docs-item")).toHaveCount(19);
    await audit(options); await panel.setViewportSize({ width: 320, height: 700 }); await audit(panel);
    expect(await panel.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    expect(externalRequests).toEqual([]);
    await options.close(); await panel.close();
  });

  test("guided handoffs preserve edits and do not persist user evidence", async ({ extensionContext, extensionId }) => {
    const page = await extensionContext.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html#agents`);
    const prepare = page.locator(".agent-prepare");
    await prepare.first().click();
    await page.getByLabel("Desired outcome", { exact: true }).fill("SYNTHETIC_HANDOFF_EVIDENCE");
    await page.getByRole("button", { name: "Generate / update preview" }).click();
    await expect(page.locator("#agent-brief")).toHaveValue(/SYNTHETIC_HANDOFF_EVIDENCE/);
    await page.locator("#agent-brief").fill("SYNTHETIC_MANUAL_EDIT");
    await prepare.first().click();
    await expect(page.locator("#agent-brief")).toHaveValue("SYNTHETIC_MANUAL_EDIT");
    await prepare.nth(1).click();
    await expect(page.getByRole("group", { name: "Unsaved task brief" })).toBeVisible();
    await page.getByRole("button", { name: "Keep editing" }).click();
    await expect(page.locator("#agent-brief")).toHaveValue("SYNTHETIC_MANUAL_EDIT");
    await page.setViewportSize({ width: 320, height: 700 }); await audit(page);
    const stored = await page.evaluate(() => chrome.storage.local.get(null));
    expect(JSON.stringify(stored)).not.toMatch(/SYNTHETIC_HANDOFF_EVIDENCE|SYNTHETIC_MANUAL_EDIT/);
    await prepare.nth(1).click(); await page.getByRole("button", { name: "Discard and switch" }).click();
    await expect(page.locator("#agent-brief")).not.toHaveValue("SYNTHETIC_MANUAL_EDIT");
    await page.close();
  });

  test("Fluid debugger opens read-only structural diagnostics with accessible controls", async ({ fluidPage }) => {
    await fluidPage.locator("#mpu-structure").click();
    await fluidPage.locator("#mpu-fluid-debug").click();
    await expect(fluidPage.locator("#mpu-fluid-debug-output")).toContainText("active target:");
    await expect(fluidPage.locator("#mpu-fluid-debug-output")).toContainText("dialogs=0");
    await expect(fluidPage.locator("#mpu-fluid-debug-output")).not.toContainText("127.0.0.1");
    await audit(fluidPage, "#mpu-dialog");
    await fluidPage.keyboard.press("Escape");
    await expect(fluidPage.locator("#mpu-structure")).toBeFocused();
  });

  test("popup reports inactive on ordinary sites without requesting a page snapshot", async ({ extensionContext, extensionId }) => {
    const popup = await extensionContext.newPage();
    await popup.addInitScript(() => {
      chrome.tabs.query = (async () => [{ id: 42, url: "https://example.org/news" }]) as unknown as typeof chrome.tabs.query;
      chrome.tabs.sendMessage = (() => { throw new Error("Must not contact non-PeopleSoft page"); }) as typeof chrome.tabs.sendMessage;
    });
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(popup.locator("#activation-status")).toContainText("Inactive on this tab");
    await audit(popup);
    await popup.close();
  });

  test("search automation ignores collection controls and never replays target search actions", async ({ extensionContext }) => {
    await extensionContext.serviceWorkers()[0].evaluate(async () => {
      const { mpuSettings } = await chrome.storage.local.get("mpuSettings");
      (mpuSettings as MpuSettings).features.correctHistoryOption = "Yes";
      await chrome.storage.local.set({ mpuSettings });
    });
    const page = await extensionContext.newPage();
    await page.route("**/c/MENU.COMP.GBL", (route) => route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><body><div id="pthdr2container"></div>
        <div class="ps_box-search"></div><aside><button id="PTS_MORE_LESS_OPT" aria-expanded="false">More</button></aside>
        <iframe id="ptifrmtgtframe" srcdoc='<body class="PSSRCHPAGE"><input type="radio" id="PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C"><button id="PTS_MORE_LESS_OPT" aria-expanded="false">More options</button></body>'></iframe>
        <script>window.shellClicks=0;document.querySelector("aside button").onclick=()=>window.shellClicks++;
        document.querySelector("iframe").onload=()=>{const d=document.querySelector("iframe").contentDocument;
        window.targetClicks={correct:0,advanced:0};d.querySelector("input").onclick=()=>window.targetClicks.correct++;
        d.querySelector("button").onclick=()=>window.targetClicks.advanced++;};</script></body></html>`,
    }));
    await page.goto(`http://127.0.0.1:4173${FLUID_COMPONENT_PATH}`);
    await expect(page.locator("#mpu-bar")).toBeVisible();
    const counts = () => page.evaluate(() => {
      const state = window as unknown as { shellClicks: number; targetClicks: { correct: number; advanced: number } };
      return { shell: state.shellClicks, ...state.targetClicks };
    });
    await expect.poll(counts).toEqual({ shell: 0, correct: 1, advanced: 1 });
    await page.waitForTimeout(1400); // Cover both delayed retry windows.
    expect(await counts()).toEqual({ shell: 0, correct: 1, advanced: 1 });
    await page.close();
  });

  test("Fluid collection with global search does not trigger automatic navigation clicks", async ({ extensionContext }) => {
    await extensionContext.serviceWorkers()[0].evaluate(async () => {
      const { mpuSettings } = await chrome.storage.local.get("mpuSettings");
      (mpuSettings as MpuSettings).features.correctHistoryOption = "Yes";
      await chrome.storage.local.set({ mpuSettings });
    });
    const page = await extensionContext.newPage();
    await page.route("**/c/MENU.COMP.GBL", (route) => route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><body><div id="pthdr2container"></div><div class="ps_box-search"></div>
        <aside><button>Expand</button><button>More</button><button id="PTS_MORE_LESS_OPT" aria-expanded="false">More options</button>
        <input type="radio" id="PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C"></aside>
        <script>window.clicks=0;document.querySelector("aside").onclick=()=>window.clicks++;</script></body></html>`,
    }));
    await page.goto(`http://127.0.0.1:4173${FLUID_COMPONENT_PATH}`);
    await expect(page.locator("#mpu-bar")).toBeVisible();
    await page.waitForTimeout(1600); // Absence assertion must span retry windows.
    expect(await page.evaluate(() => (window as unknown as { clicks: number }).clicks)).toBe(0);
    await page.close();
  });

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
    await fluidPage.evaluate(() => {
      const info = document.createElement("div");
      info.id = "pt_pageinfo";
      info.setAttribute("data-menu", "MENU");
      info.setAttribute("data-component", "COMP");
      info.setAttribute("data-page", "SYNTHETIC_BEFORE");
      document.body.append(info);
    });
    await fluidPage.locator("#mpu-pi-watch-save").click();
    const baselines = fluidPage.locator("#mpu-pi-baseline");
    await expect(baselines.locator("option")).toHaveCount(2);
    const original = await baselines.inputValue();
    await fluidPage.evaluate(() => {
      const info = document.getElementById("pt_pageinfo");
      info?.setAttribute("data-page", "SYNTHETIC_AFTER");
      const fields = document.createDocumentFragment();
      for (let index = 0; index < 205; index++) {
        const field = document.createElement("input");
        field.id = `SYNTHETIC_NEWFIELD_${index}$0`;
        fields.append(field);
      }
      document.body.append(fields);
    });
    await fluidPage.locator("#mpu-pi-watch-save").click();
    await expect(baselines.locator("option")).toHaveCount(3);
    await baselines.selectOption(original);
    await fluidPage.locator("#mpu-pi-check-drift").click();
    await expect(fluidPage.locator("#mpu-pi-diff")).toContainText("# Upgrade validation handoff");
    await expect(fluidPage.locator("#mpu-pi-diff")).toContainText("SYNTHETIC\\_AFTER");
    await expect(fluidPage.locator("#mpu-pi-diff")).toContainText("current field scan is incomplete (200 retained");
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
    await expect(page.locator("#agent-list > li")).toHaveCount(AGENT_REFERENCES.length);
    await expect(page.locator("#agent-templates a")).toHaveCount(3);
    const before = await page.evaluate(() => chrome.storage.local.get("mpuSettings"));
    const search = page.getByRole("searchbox", { name: "Search prompts" });
    await search.fill("fluid accessibility");
    await expect(page.locator("#agent-list > li")).toHaveCount(1);
    await expect(search).toBeFocused();
    const link = page.locator("#agent-list a").first();
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
      if (path === "popup.html") await page.evaluate(() => {
        chrome.sidePanel.open = async () => { throw new Error("Exercise Options fallback"); };
      });
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

  test("toolbar Agents click opens the configured panel or its local fallback", async ({ extensionContext, extensionId, fluidPage }) => {
    const sw = extensionContext.serviceWorkers()[0];
    await sw.evaluate(() => {
      const open = chrome.sidePanel.open.bind(chrome.sidePanel);
      const state = globalThis as unknown as { agentOpenResult: string };
      state.agentOpenResult = "waiting";
      chrome.sidePanel.open = async (options) => {
        try { await open(options); state.agentOpenResult = "opened"; }
        catch (error) { state.agentOpenResult = "fallback"; throw error; }
      };
    });
    await fluidPage.locator("#mpu-agents").click();
    await expect.poll(() => sw.evaluate(() => (globalThis as unknown as { agentOpenResult: string }).agentOpenResult)).toMatch(/opened|fallback/);
    const state = await sw.evaluate(async () => {
      const tab = (await chrome.tabs.query({})).find((item) => item.url?.includes("/c/MENU.COMP.GBL"))!;
      return { result: (globalThis as unknown as { agentOpenResult: string }).agentOpenResult, panel: await chrome.sidePanel.getOptions({ tabId: tab.id }) };
    });
    expect(state.panel.path).toBe("sidepanel.html#agents");
    if (state.result === "fallback") await expect.poll(() => extensionContext.pages().some((page) => page.url() === `chrome-extension://${extensionId}/options.html#agents`)).toBe(true);
  });

  test("agent preferences merge across Options and side panel without saving briefs or capturing the page", async ({ extensionContext, extensionId }) => {
    const options = await extensionContext.newPage();
    const panel = await extensionContext.newPage();
    await panel.addInitScript(() => {
      Object.defineProperty(window, "pageSnapshotCalls", { value: [] });
      chrome.tabs.sendMessage = ((...args: unknown[]) => {
        (window as unknown as { pageSnapshotCalls: unknown[] }).pageSnapshotCalls.push(args);
        return Promise.reject(new Error("Unexpected snapshot"));
      }) as typeof chrome.tabs.sendMessage;
    });
    await Promise.all([
      options.goto(`chrome-extension://${extensionId}/options.html#agents`),
      panel.goto(`chrome-extension://${extensionId}/sidepanel.html#agents`),
    ]);
    await expect(panel.locator("#panel-agents")).toBeVisible();
    await expect(panel.locator("#page-info-view")).toBeHidden();
    const before = await options.evaluate(() => chrome.storage.local.get("mpuSettings"));
    const first = options.locator('[data-favorite="assist-peoplecode"]');
    const second = panel.locator('[data-favorite="review-data-correctness"]');
    await Promise.all([first.click(), second.click()]);
    await expect(panel.locator('[data-favorite="assist-peoplecode"]')).toHaveAttribute("aria-pressed", "true");
    await expect(options.locator('[data-favorite="review-data-correctness"]')).toHaveAttribute("aria-pressed", "true");
    await panel.locator("#agent-view").selectOption("favorites");
    await expect(panel.locator("#agent-list > li")).toHaveCount(2);
    await options.locator('[data-agent-task="peoplecode"]').click();
    await options.locator("#agent-list .agent-prepare").first().click();
    await options.locator("#agent-brief").fill("PRIVATE UNSAVED TEST BRIEF");
    await panel.locator("#agent-view").selectOption("recent");
    await expect(panel.locator("#agent-list > li")).toHaveCount(1);
    await panel.locator("#agent-clear-recents").click();
    await expect(panel.locator("#agent-list > li")).toHaveCount(0);
    await options.locator("#agent-dismiss-onboarding").click();
    await expect(panel.locator("#agent-onboarding")).toBeHidden();
    const saved = await options.evaluate(() => chrome.storage.local.get(null));
    expect(saved.mpuSettings).toEqual(before.mpuSettings);
    expect((saved.mpuAgentLibrary as { favoriteIds: string[] }).favoriteIds).toEqual(expect.arrayContaining(["assist-peoplecode", "review-data-correctness"]));
    expect(JSON.stringify(saved)).not.toContain("PRIVATE UNSAVED TEST BRIEF");
    expect(await panel.evaluate(() => (window as unknown as { pageSnapshotCalls: unknown[] }).pageSnapshotCalls)).toEqual([]);
    await panel.locator("#agent-view").selectOption("all");
    await panel.locator("#agent-audience").selectOption("ba");
    await expect(panel.locator("#agent-list > li").first()).toBeVisible();
    await panel.setViewportSize({ width: 320, height: 600 });
    await audit(panel);
    await panel.emulateMedia({ colorScheme: "dark" });
    await audit(panel);
    expect(await panel.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await panel.screenshot({ path: "test-results/agents-panel-dark.png", fullPage: true });
    await options.close(); await panel.close();
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
