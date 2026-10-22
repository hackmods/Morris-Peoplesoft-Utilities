import { test as base, expect } from "@playwright/test";
import { Key, type WebDriver } from "selenium-webdriver";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CLASSIC_COMPONENT_PATH, CLASSIC_GRID_PATH, E2E_ORIGIN, FLUID_COMPONENT_PATH,
  FLUID_FIELD_ENTRY_PATH, startFixtureServer, stopFixtureServer,
} from "../e2e/helpers/fixture-server";
import { e2eSettings } from "../e2e/helpers/extension";
import { launchFirefox, extension, seed, visible, click, fill, audit, By, navigate } from "./helpers";
import type { MpuSettings } from "../../src/storage/schema";

const test = base.extend<{ driver: WebDriver; origin: string; requests: { method: string; url: string }[] }>({
  // eslint-disable-next-line no-empty-pattern
  requests: async ({}, use) => { await use([]); },
  driver: async ({ requests }, use, testInfo) => {
    const server = await startFixtureServer((req, res) => {
      if (!req.url?.includes("/c/UTILITIES.")) return false;
      requests.push({ method: req.method || "", url: req.url });
      // Synthetic locked component: exercise real same-origin requests and
      // conservative partial-failure reporting without simulating Oracle auth.
      res.writeHead(403); res.end("Synthetic trace component is locked");
      return true;
    });
    let driver: WebDriver | undefined;
    try {
      ({ driver } = await launchFirefox());
      const capabilities = await driver.getCapabilities();
      testInfo.annotations.push({ type: "Firefox", description: capabilities.getBrowserVersion() });
      await use(driver);
    } finally {
      if (driver) {
        if (testInfo.status !== testInfo.expectedStatus) {
          await driver.switchTo().defaultContent().catch(() => undefined);
          await testInfo.attach("document", { body: await driver.getPageSource().catch(() => ""), contentType: "text/html" });
          await testInfo.attach("firefox", { body: Buffer.from(await driver.takeScreenshot().catch(() => ""), "base64"), contentType: "image/png" });
        }
        await driver.quit();
      }
      await stopFixtureServer(server);
    }
  },
  origin: async ({ driver }, use) => { await use(await extension<string>(driver, 'return browser.runtime.getURL("").slice(0, -1);')); },
});

test("extension pages, messaging, Agents, and native Firefox sidebar", async ({ driver, origin }) => {
  const manifest = await extension<{ background: { scripts: string[] }; permissions: string[] }>(driver, "return browser.runtime.getManifest();");
  expect(manifest.background.scripts).toEqual([`${origin}/background.js`]);
  expect(manifest.permissions).not.toContain("sidePanel");
  const reply = await extension<MpuSettings>(driver, 'return browser.runtime.sendMessage({ type: "mpu-get-settings" });');
  expect(reply.environments[0].label).toBe("DEV");
  await audit(driver);
  await navigate(driver, `${origin}/sidepanel.html#agents`);
  await visible(driver, "#agent-list button");
  await audit(driver);
  await navigate(driver, `${origin}/popup.html`);
  await visible(driver, "#toggle-list input");
  await audit(driver);
  // A real trusted click is required by Firefox's sidebarAction.open().
  const popup = await driver.getWindowHandle();
  await driver.switchTo().newWindow("tab");
  await navigate(driver, `${origin}/options.html`);
  const control = await driver.getWindowHandle();
  await driver.switchTo().window(popup);
  await click(driver, "#open-agents");
  await driver.switchTo().window(control);
  await expect.poll(() => extension(driver, "return browser.sidebarAction.isOpen({});")).toBe(true);
  await expect.poll(() => extension(driver, 'const tabs = await browser.tabs.query({}); return Promise.all(tabs.map(t => browser.sidebarAction.getPanel({ tabId: t.id })));')).toContain(`${origin}/sidepanel.html#agents`);
});

test("Classic and Fluid toolbar, keyboard focus, dialogs and contrast", async ({ driver }) => {
  for (const path of [CLASSIC_COMPONENT_PATH, FLUID_COMPONENT_PATH]) {
    await navigate(driver, `${E2E_ORIGIN}${path}`);
    await visible(driver, "#mpu-bar");
    await audit(driver, "#mpu-bar");
    await click(driver, "#mpu-pageinfo");
    await audit(driver, "#mpu-dialog");
    await driver.actions().sendKeys(Key.ESCAPE).perform();
    expect(await driver.executeScript('return document.activeElement.id')).toBe("mpu-pageinfo");
    await click(driver, "#mpu-fav");
    await driver.actions().sendKeys(Key.ARROW_DOWN, Key.HOME, Key.END, Key.ESCAPE).perform();
    expect(await driver.executeScript('return document.activeElement.id')).toBe("mpu-fav");
  }
});

test("Field Entry preview is inert; Apply reaches same-origin frame page hooks", async ({ driver }) => {
  await seed(driver, e2eSettings({ features: { ...e2eSettings().features, fieldEntryOption: "Yes" } }));
  await navigate(driver, `${E2E_ORIGIN}${CLASSIC_COMPONENT_PATH}`);
  await visible(driver, "#mpu-bar");
  await driver.executeScript('document.getElementById("ptifrmtgtframe").src = "/mpu-fixtures/owning-frame";');
  await driver.switchTo().frame(await driver.findElement(By.css("#ptifrmtgtframe")));
  await visible(driver, '[id="JOB_DEPTID$0"]');
  await driver.switchTo().defaultContent();
  await driver.actions().keyDown(Key.ALT).keyDown(Key.SHIFT).sendKeys("e").keyUp(Key.SHIFT).keyUp(Key.ALT).perform();
  await fill(driver, "#mpu-fe-sheet-text", "JOB.DEPTID\n200");
  await click(driver, "#mpu-fe-sheet-preview");
  await audit(driver, "#mpu-dialog");
  await driver.switchTo().frame(await driver.findElement(By.css("#ptifrmtgtframe")));
  expect(await driver.findElement(By.css('[id="JOB_DEPTID$0"]')).getProperty("value")).toBe("100");
  expect(await driver.findElement(By.css("body")).getAttribute("data-changed")).toBeNull();
  await driver.switchTo().defaultContent();
  await click(driver, "#mpu-fe-elig-apply");
  await expect.poll(async () => (await driver.findElement(By.css("#mpu-live"))).getText()).toContain("Applied 1 field value");
  await driver.switchTo().frame(await driver.findElement(By.css("#ptifrmtgtframe")));
  await expect.poll(() => driver.findElement(By.css('[id="JOB_DEPTID$0"]')).getProperty("value")).toBe("200");
  await expect.poll(() => driver.findElement(By.css("body")).getAttribute("data-changed")).toBe("JOB_DEPTID$0");
  expect(await driver.findElement(By.css('[id="JOB_DEPTID$0"]')).getProperty("value")).toBe("200");
});

test("Field Entry Fluid and modal fields, missing rows, and disable cleanup", async ({ driver, origin }) => {
  const settings = e2eSettings({ features: { ...e2eSettings().features, fieldEntryOption: "Yes" } });
  await seed(driver, settings);
  for (const path of [FLUID_FIELD_ENTRY_PATH, CLASSIC_GRID_PATH]) {
    await navigate(driver, `${E2E_ORIGIN}${path}`);
    await visible(driver, "#mpu-entry");
    await driver.actions().keyDown(Key.ALT).keyDown(Key.SHIFT).sendKeys("e").keyUp(Key.SHIFT).keyUp(Key.ALT).perform();
    await fill(driver, "#mpu-fe-sheet-text", path === CLASSIC_GRID_PATH ? "JOB.DEPTID\n200\n300" : "PERSONAL_DATA.FIRST_NAME\tADDRESSES.CITY\nJamie\tToronto");
    await click(driver, "#mpu-fe-sheet-preview");
    await visible(driver, "#mpu-fe-elig-apply");
    if (path === CLASSIC_GRID_PATH) expect(await driver.findElements(By.css("#jobGridBody tr"))).toHaveLength(1);
    await click(driver, "#mpu-fe-elig-apply");
    const selector = path === CLASSIC_GRID_PATH ? '[id="JOB_DEPTID$0"]' : "#PERSONAL_DATA_FIRST_NAME";
    expect(await driver.findElement(By.css(selector)).getProperty("value")).toBe(path === CLASSIC_GRID_PATH ? "200" : "Jamie");
    if (path === FLUID_FIELD_ENTRY_PATH) expect(await driver.findElement(By.css("#ADDRESSES_CITY")).getProperty("value")).toBe("Toronto");
  }
  const page = await driver.getWindowHandle();
  await driver.switchTo().newWindow("tab");
  await navigate(driver, `${origin}/options.html`);
  settings.environments[0].active = "No";
  await seed(driver, settings);
  await driver.switchTo().window(page);
  await expect.poll(async () => (await driver.findElements(By.css("#mpu-bar"))).length).toBe(0);
});

test("host restrictions and environment activation guard injected helpers", async ({ driver, origin }) => {
  const settings = e2eSettings();
  settings.features.hostAllowlistEnabled = "Yes";
  settings.hostAllowlist = ["https://allowed.example"];
  await seed(driver, settings);
  await navigate(driver, `${E2E_ORIGIN}${FLUID_COMPONENT_PATH}`);
  // Ask the real content script for its activation decision, not a timed absence check.
  const page = await driver.getWindowHandle();
  await driver.switchTo().newWindow("tab");
  await navigate(driver, `${origin}/options.html`);
  await expect.poll(() => extension(driver, `const tabs = await browser.tabs.query({}); const tab = tabs.find(t => t.url?.startsWith(args[0]));
    return browser.tabs.sendMessage(tab.id, { type: 'mpu-activation-status' });`, E2E_ORIGIN)).toMatchObject({ active: false });
  await driver.switchTo().window(page);
  expect(await driver.findElements(By.css("#mpu-bar"))).toHaveLength(0);
});

test("two Options tabs merge settings and sync agent preferences", async ({ driver, origin }) => {
  const first = await driver.getWindowHandle();
  await visible(driver, '#traceOption');
  await driver.switchTo().newWindow("tab");
  await navigate(driver, `${origin}/options.html`);
  await visible(driver, '#traceOption');
  const second = await driver.getWindowHandle();
  await extension(driver, `const s = (await browser.storage.local.get('mpuSettings')).mpuSettings;
    s.features.traceOption = 'Yes'; return browser.runtime.sendMessage({ type: 'mpu-write-settings', base: args[0], next: s });`, e2eSettings());
  await driver.switchTo().window(first);
  await expect.poll(() => extension(driver, "return (await browser.storage.local.get('mpuSettings')).mpuSettings.features.traceOption;")).toBe("Yes");
  await extension(driver, `const base = args[0]; const next = structuredClone(base); next.features.pageInfoOption = 'No';
    const reply = await browser.runtime.sendMessage({ type: 'mpu-write-settings', base, next }); if (!reply.ok) throw Error(reply.error);`, e2eSettings());
  await driver.switchTo().window(second);
  const settings = await extension<MpuSettings>(driver, "return (await browser.storage.local.get('mpuSettings')).mpuSettings;");
  expect(settings.features.traceOption).toBe("Yes");
  expect(settings.features.pageInfoOption).toBe("No");
  await navigate(driver, `${origin}/options.html#agents`);
  await visible(driver, "#agent-list button");
  const favorite = await driver.findElement(By.css("#agent-list button[aria-pressed]"));
  await favorite.click();
  await driver.switchTo().window(first);
  await navigate(driver, `${origin}/sidepanel.html#agents`);
  await expect.poll(async () => (await driver.findElements(By.css('#agent-list button[aria-pressed="true"]'))).length).toBe(1);
});

test("shared settings backups download and restore; unknown properties cannot be imported", async ({ driver, origin }) => {
  await navigate(driver, `${origin}/options.html#favorites`);
  const downloads = resolve("test-results/firefox-downloads", new URL(origin).hostname);
  const backupPath = resolve(downloads, "mpu-settings-backup.json");
  await click(driver, "#export-json");
  await expect.poll(() => existsSync(backupPath)).toBe(true);
  const backup = JSON.parse(readFileSync(backupPath, "utf8"));
  expect(backup.environments[0].label).toBe("DEV");
  const before = await extension(driver, "return browser.storage.local.get(null);");
  const invalidPath = resolve(downloads, "invalid.json");
  writeFileSync(invalidPath, JSON.stringify({ ...backup, unrecognizedProperty: "must not be saved" }));
  await driver.findElement(By.css("#import-json")).sendKeys(invalidPath);
  await expect.poll(() => driver.findElement(By.css("#toast")).getText()).toBe("Invalid settings file");
  expect(await extension(driver, "return browser.storage.local.get(null);")).toEqual(before);
  backup.environments[0].label = "Imported Firefox DEV";
  const validPath = resolve(downloads, "chrome-compatible-settings.json");
  writeFileSync(validPath, JSON.stringify(backup));
  await driver.findElement(By.css("#import-json")).sendKeys(validPath);
  await expect.poll(() => extension(driver, "return (await browser.storage.local.get('mpuSettings')).mpuSettings.environments[0].label;")).toBe("Imported Firefox DEV");
  const restored = await extension<MpuSettings>(driver, "return (await browser.storage.local.get('mpuSettings')).mpuSettings;");
  expect(restored.environments[0].label).toBe("Imported Firefox DEV");
  expect(restored).not.toHaveProperty("unrecognizedProperty");
});

test("clipboard uses a trusted click; trace honors consent and never reports a failed stop as stopped", async ({ driver, origin, requests }) => {
  const settings = e2eSettings({ features: { ...e2eSettings().features, traceOption: "Yes" } });
  settings.environments[0].classification = "production";
  settings.environments[0].trcProfRunning = "Yes";
  await seed(driver, settings);
  await navigate(driver, `${E2E_ORIGIN}${FLUID_COMPONENT_PATH}`);
  await click(driver, "#mpu-pageinfo");
  await click(driver, "#mpu-pi-copy");
  await expect.poll(() => driver.findElement(By.css("#mpu-live")).getText()).toBe("Page information copied");
  await driver.actions().sendKeys(Key.ESCAPE).perform();
  await click(driver, "#mpu-trace");
  await audit(driver, "#mpu-dialog");
  await click(driver, "#mpu-trace-on");
  await visible(driver, "#mpu-production-cancel");
  expect(requests).toEqual([]);
  await click(driver, "#mpu-production-cancel");
  await click(driver, "#mpu-trace");
  await click(driver, "#mpu-trace-off");
  await expect.poll(() => requests.length).toBe(2);
  expect(requests.every((request) => request.method === "GET" && new URL(request.url, E2E_ORIGIN).origin === E2E_ORIGIN)).toBe(true);
  await expect.poll(() => driver.findElement(By.css("#mpu-live")).getText()).toContain("Trace request incomplete");
  await navigate(driver, `${origin}/options.html`);
  const after = await extension<MpuSettings>(driver, "return (await browser.storage.local.get('mpuSettings')).mpuSettings;");
  expect(after.environments[0].trcProfRunning).toBe("Yes");
  expect(after.environments[0].traceRequest?.status).toBe("incomplete");
});

test("Scheduler excerpts retain cited uncertainty, require review, export locally and clear without storage writes", async ({ driver, origin }) => {
  await navigate(driver, `${origin}/options.html#scheduler`);
  const before = await extension(driver, "return browser.storage.local.get(null);");
  const files = await visible(driver, "#mpu-scheduler-files");
  await files.sendKeys([resolve("tests/fixtures/scheduler-investigation/scheduler.txt"), resolve("tests/fixtures/scheduler-investigation/distribution.txt")].join("\n"));
  await fill(driver, "#mpu-scheduler-pack", "Process Instance: 90002\nUser: PRIVATE-USER");
  const report = await visible(driver, "#mpu-scheduler-report");
  expect(await report.getAttribute("value")).toBe(""); expect(await driver.findElement(By.css("#mpu-scheduler-download")).isEnabled()).toBe(false);
  await click(driver, "#mpu-scheduler-preview");
  await expect.poll(() => report.getAttribute("value")).toContain("Source 1:L3 | Parent 90001 -> Instance 90002");
  const text = await report.getAttribute("value");
  expect(text).toContain("Conflicting parent labels"); expect(text).not.toMatch(/PRIVATE-USER|SYNTHETIC-SECRET|SYNTHETIC-SENSITIVE|SYNTHETIC-TOKEN/);
  expect(await driver.executeScript("return document.activeElement.id")).toBe("mpu-scheduler-report");
  await driver.findElement(By.css("#mpu-scheduler-reviewed")).click();
  await driver.actions().sendKeys(Key.TAB).perform(); expect(await driver.executeScript("return document.activeElement.id")).toBe("mpu-scheduler-copy");
  await driver.actions().sendKeys(Key.ENTER).perform();
  await expect.poll(() => driver.findElement(By.css("#mpu-scheduler-status")).getText()).toBe("Reviewed Scheduler report copied.");
  await click(driver, "#mpu-scheduler-download");
  const downloaded = resolve("test-results/firefox-downloads", new URL(origin).hostname, "mpu-scheduler-investigation.txt");
  await expect.poll(() => existsSync(downloaded)).toBe(true); expect(readFileSync(downloaded, "utf8")).toBe(text);
  await audit(driver, "#panel-scheduler"); await driver.manage().window().setRect({ width: 390, height: 844 }); await audit(driver, "#panel-scheduler");
  expect(await driver.executeScript("return document.documentElement.scrollWidth <= window.innerWidth")).toBe(true);
  await fill(driver, "#mpu-scheduler-pack", "changed"); expect(await report.getAttribute("value")).toBe("");
  expect(await driver.findElement(By.css("#mpu-scheduler-download")).isEnabled()).toBe(false);
  await click(driver, "#mpu-scheduler-clear");
  const invalidPath = resolve("test-results/firefox-downloads", new URL(origin).hostname, "PRIVATE-FILENAME.log"); writeFileSync(invalidPath, Buffer.from([0xff]));
  await files.sendKeys(invalidPath); await click(driver, "#mpu-scheduler-preview");
  await expect.poll(() => driver.findElement(By.css("#mpu-scheduler-status")).getText()).toContain("Cannot prepare");
  expect(await report.getAttribute("value")).toBe(""); expect(await driver.findElement(By.css("#mpu-scheduler-status")).getText()).not.toContain("PRIVATE-FILENAME");
  await click(driver, "#mpu-scheduler-clear"); expect(await files.getAttribute("value")).toBe("");
  expect(await extension(driver, "return browser.storage.local.get(null);")).toEqual(before);
  expect(await extension(driver, "return performance.getEntriesByType('resource').filter(e => /^https?:/.test(e.name)).length;")).toBe(0);
  await driver.navigate().refresh(); expect(await (await visible(driver, "#mpu-scheduler-report")).getAttribute("value")).toBe("");
  await driver.manage().window().setRect({ width: 1280, height: 900 });
  await navigate(driver, `${E2E_ORIGIN}${FLUID_COMPONENT_PATH}`);
  await visible(driver, "#mpu-pageinfo");
  await driver.executeScript("const span = document.createElement('span'); span.id='PRCSINSTANCE'; span.textContent='90002'; document.body.append(span);");
  await click(driver, "#mpu-pageinfo"); await visible(driver, "#mpu-pi-scheduler");
  await audit(driver, "#mpu-dialog");
  const handles = await driver.getAllWindowHandles(); await click(driver, "#mpu-pi-scheduler");
  await driver.wait(async () => (await driver.getAllWindowHandles()).length > handles.length, 15_000);
  const opened = (await driver.getAllWindowHandles()).find(handle => !handles.includes(handle))!; await driver.switchTo().window(opened);
  await driver.wait(async () => await driver.getCurrentUrl() === `${origin}/options.html#scheduler`, 15_000);
  expect(await (await visible(driver, "#mpu-scheduler-pack")).getAttribute("value")).toBe("");
  expect(await driver.findElement(By.css("#mpu-scheduler-report")).getAttribute("value")).toBe("");
});

test("IB evidence keeps stages distinct, omits payload by default, requires fresh review and opens an empty guarded workspace", async ({ driver, origin }) => {
  await navigate(driver, `${origin}/options.html#ib`); const before = await extension(driver, "return browser.storage.local.get(null);");
  await click(driver, "#ib-investigation-workspace summary");
  const files = await visible(driver, "#mpu-ib-files");
  await files.sendKeys([resolve("tests/fixtures/ib-investigation/operation.json"), resolve("tests/fixtures/ib-investigation/contract.json")].join("\n"));
  const report = await visible(driver, "#mpu-ib-report"); expect(await report.getAttribute("value")).toBe("");
  expect(await driver.findElement(By.css("#mpu-ib-include-payload")).isSelected()).toBe(false);
  await click(driver, "#mpu-ib-preview"); await expect.poll(() => report.getAttribute("value")).toContain("serviceOperation | Source 1:L6");
  expect(await report.getAttribute("value")).toContain("publication-contract"); expect(await report.getAttribute("value")).not.toMatch(/SYNTHETIC-BUSINESS-CONTEXT|9007199254740993|PRIVATE/);
  expect(await driver.executeScript("return document.activeElement.id")).toBe("mpu-ib-report");
  await click(driver, "#mpu-ib-reviewed"); await click(driver, "#mpu-ib-include-payload"); expect(await report.getAttribute("value")).toBe("");
  expect(await driver.findElement(By.css("#mpu-ib-reviewed")).isSelected()).toBe(false); expect(await driver.findElement(By.css("#mpu-ib-download")).isEnabled()).toBe(false);
  await click(driver, "#mpu-ib-preview"); await expect.poll(() => report.getAttribute("value")).toContain("SYNTHETIC-BUSINESS-CONTEXT");
  const text = await report.getAttribute("value"); expect(text).toContain("9007199254740993"); expect(text).not.toMatch(/PRIVATE|\/password|\/employeeId|\/credentials|synthetic.invalid/);
  await click(driver, "#mpu-ib-reviewed"); await driver.actions().sendKeys(Key.TAB).perform(); expect(await driver.executeScript("return document.activeElement.id")).toBe("mpu-ib-copy");
  await driver.actions().sendKeys(Key.ENTER).perform(); await expect.poll(() => driver.findElement(By.css("#mpu-ib-status")).getText()).toBe("Reviewed IB report copied.");
  await click(driver, "#mpu-ib-download"); const downloads = resolve("test-results/firefox-downloads", new URL(origin).hostname); const downloaded = resolve(downloads, "mpu-ib-investigation.txt");
  await expect.poll(() => existsSync(downloaded)).toBe(true); expect(readFileSync(downloaded, "utf8")).toBe(text);
  await audit(driver, "#panel-ib"); await driver.manage().window().setRect({ width: 390, height: 844 }); await audit(driver, "#panel-ib");
  expect(await driver.executeScript("return document.documentElement.scrollWidth <= window.innerWidth")).toBe(true);
  await click(driver, "#mpu-ib-clear"); expect(await files.getAttribute("value")).toBe(""); expect(await report.getAttribute("value")).toBe("");
  const invalidPath = resolve(downloads, "PRIVATE-FILENAME.json");
  for (const content of [Buffer.from('{"format":"mpu-ib-evidence","version":1,"records":[{"payload":{"safe":"PRIVATE-CANARY","safe":true}}]}'), Buffer.from([0xff])]) {
    writeFileSync(invalidPath, content); await files.sendKeys(invalidPath); await click(driver, "#mpu-ib-preview");
    await expect.poll(() => driver.findElement(By.css("#mpu-ib-status")).getText()).toContain("Cannot prepare"); expect(await report.getAttribute("value")).toBe("");
    expect(await driver.findElement(By.css("#mpu-ib-status")).getText()).not.toMatch(/PRIVATE-FILENAME|PRIVATE-CANARY/); await click(driver, "#mpu-ib-clear");
  }
  expect(await extension(driver, "return browser.storage.local.get(null);")).toEqual(before);
  expect(await extension(driver, "return performance.getEntriesByType('resource').filter(e => /^https?:/.test(e.name)).length;")).toBe(0);
  await driver.navigate().refresh(); expect(await (await visible(driver, "#mpu-ib-report")).getAttribute("value")).toBe("");
  await driver.manage().window().setRect({ width: 1280, height: 900 }); await navigate(driver, `${E2E_ORIGIN}${FLUID_COMPONENT_PATH}`); await visible(driver, "#mpu-pageinfo");
  await driver.executeScript("const span = document.createElement('span'); span.id='IB_SERVICE_OPR'; span.textContent='SYNTHETIC_OPERATION'; document.body.append(span);");
  await click(driver, "#mpu-pageinfo"); await visible(driver, "#mpu-pi-ib"); await audit(driver, "#mpu-dialog");
  const handles = await driver.getAllWindowHandles(); await click(driver, "#mpu-pi-ib"); await driver.wait(async () => (await driver.getAllWindowHandles()).length > handles.length, 15_000);
  const opened = (await driver.getAllWindowHandles()).find(handle => !handles.includes(handle))!; await driver.switchTo().window(opened);
  await driver.wait(async () => await driver.getCurrentUrl() === `${origin}/options.html#ib`, 15_000);
  expect(await (await visible(driver, "#mpu-ib-report")).getAttribute("value")).toBe(""); expect(await driver.findElement(By.css("#mpu-ib-files")).getAttribute("value")).toBe("");
});

test("IB case builder, explicit comparison, findings and inert SOAP subset work in the installed Firefox extension", async ({ driver, origin }) => {
  await navigate(driver, `${origin}/options.html#ib`); const before = await extension(driver, "return browser.storage.local.get(null);");
  const choose = async (selector: string, value: string) => { await (await visible(driver, `${selector} option[value="${value}"]`)).click(); };
  await driver.findElement(By.xpath("//summary[text()='Prepare evidence records without writing JSON']")).click();
  await fill(driver, "#mpu-ib-entry-serviceOperation", "EXAMPLE"); await fill(driver, "#mpu-ib-entry-environmentLabel", "TEST"); await fill(driver, "#mpu-ib-entry-operationVersion", "v1");
  await fill(driver, "#mpu-ib-entry-observedAt", "2026-10-21T10:00:00Z"); await choose("#mpu-ib-entry-format", "json");
  const downloads = resolve("test-results/firefox-downloads", new URL(origin).hostname); const payloadPath = resolve(downloads, "PRIVATE-PAYLOAD.json"); writeFileSync(payloadPath, '{"amount":9007199254740993,"flag":true}');
  await driver.findElement(By.css("#mpu-ib-payload-file")).sendKeys(payloadPath); expect(await driver.findElement(By.css("#mpu-ib-entry-payload")).getAttribute("value")).toBe("");
  await click(driver, "#mpu-ib-load-payload"); await expect.poll(() => driver.findElement(By.css("#mpu-ib-entry-payload")).getAttribute("value")).toContain("9007199254740993"); await click(driver, "#mpu-ib-add-record");
  await fill(driver, "#mpu-ib-entry-observedAt", "2026-10-21T10:00:01Z"); await fill(driver, "#mpu-ib-entry-payload", '{"amount":9007199254740994,"flag":"true"}'); await click(driver, "#mpu-ib-add-record");
  await click(driver, "#mpu-ib-preview"); const report = await visible(driver, "#mpu-ib-report"); await expect.poll(() => report.getAttribute("value")).toContain("explicitly prepared draft");
  await driver.findElement(By.xpath("//summary[text()='Compare two explicitly selected records']")).click(); await choose("#mpu-ib-compare-left", "1:1"); await choose("#mpu-ib-compare-right", "1:2");
  await driver.findElement(By.xpath("//summary[text()='Case findings and follow-up']")).click(); await fill(driver, "#mpu-ib-case-caseLabel", "Example support case"); await fill(driver, "#mpu-ib-case-owner", "Support team"); await choose("#mpu-ib-check-errors", "needs-follow-up"); await fill(driver, "#mpu-ib-note-errors", "Source 1 record 2; obtain original error evidence");
  await click(driver, "#mpu-ib-include-payload"); await click(driver, "#mpu-ib-preview"); await expect.poll(() => report.getAttribute("value")).toContain("9007199254740993 -> 9007199254740994");
  expect(await report.getAttribute("value")).toContain("type differs"); expect(await report.getAttribute("value")).toContain("errors | needs-follow-up"); expect(await report.getAttribute("value")).not.toContain("PRIVATE-PAYLOAD");
  await audit(driver, "#panel-ib"); await driver.manage().window().setRect({ width: 390, height: 844 }); await audit(driver, "#panel-ib"); expect(await driver.executeScript("return document.documentElement.scrollWidth <= window.innerWidth")).toBe(true);
  await click(driver, "#mpu-ib-reviewed"); await click(driver, "#mpu-ib-download"); const outputPath = resolve(downloads, "mpu-ib-investigation.txt"); await expect.poll(() => existsSync(outputPath)).toBe(true); expect(readFileSync(outputPath, "utf8")).toBe(await report.getAttribute("value"));
  await fill(driver, "#mpu-ib-note-errors", "edited"); expect(await report.getAttribute("value")).toBe(""); expect(await driver.findElement(By.css("#mpu-ib-download")).isEnabled()).toBe(false);
  await click(driver, "#mpu-ib-remove-0"); expect(await driver.executeScript("return document.activeElement.id")).toBe("mpu-ib-remove-0"); await click(driver, "#mpu-ib-clear"); expect(await driver.findElements(By.css("#mpu-ib-draft-records li"))).toHaveLength(0);
  await driver.manage().window().setRect({ width: 1280, height: 900 });
  await driver.findElement(By.css("#mpu-ib-files")).sendKeys(resolve("tests/fixtures/ib-investigation/soap-v2.json")); await click(driver, "#mpu-ib-include-payload"); await click(driver, "#mpu-ib-preview");
  await expect.poll(() => report.getAttribute("value")).toContain("decoded XML opening-tag L3"); expect(await report.getAttribute("value")).not.toMatch(/SYNTHETIC-PRIVATE|Authorization|schemas.xmlsoap.org/);
  await choose("#mpu-ib-entry-format", "xml"); await fill(driver, "#mpu-ib-entry-payload", '<!DOCTYPE r SYSTEM "https://example.invalid/external.dtd"><r/>'); await click(driver, "#mpu-ib-add-record"); expect(await driver.findElement(By.css("#mpu-ib-draft-status")).getText()).toContain("Cannot add"); expect(await driver.findElements(By.css("#mpu-ib-draft-records li"))).toHaveLength(0);
  await fill(driver, "#mpu-ib-entry-payload", "<Root><Value>sanitized XML</Value></Root>"); await click(driver, "#mpu-ib-add-record"); await click(driver, "#mpu-ib-preview"); await expect.poll(() => report.getAttribute("value")).toContain("sanitized XML");
  expect(await extension(driver, "return browser.storage.local.get(null);")).toEqual(before); expect(await extension(driver, "return performance.getEntriesByType('resource').filter(e => /^https?:/.test(e.name)).length;")).toBe(0);
  await driver.navigate().refresh(); expect(await (await visible(driver, "#mpu-ib-report")).getAttribute("value")).toBe(""); expect(await driver.findElements(By.css("#mpu-ib-draft-records li"))).toHaveLength(0);
});
