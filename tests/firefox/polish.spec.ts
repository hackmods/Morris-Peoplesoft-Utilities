import { test as base, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Key, type WebDriver } from "selenium-webdriver";
import { E2E_ORIGIN, FLUID_COMPONENT_PATH, startFixtureServer, stopFixtureServer } from "../e2e/helpers/fixture-server";
import { e2eSettings } from "../e2e/helpers/extension";
import { audit, By, click, extension, fill, launchFirefox, navigate, seed, visible } from "./helpers";

const test = base.extend<{ driver: WebDriver; origin: string }>({
  // eslint-disable-next-line no-empty-pattern
  driver: async ({}, use) => {
    const server = await startFixtureServer();
    const { driver } = await launchFirefox();
    try { await use(driver); }
    finally { await driver.quit(); await stopFixtureServer(server); }
  },
  origin: async ({ driver }, use) => {
    await use(await extension<string>(driver, 'return browser.runtime.getURL("").slice(0, -1);'));
  },
});

async function openReferencePanel(driver: WebDriver, origin: string, buttonXpath: string, panel: "docs" | "agents"): Promise<void> {
  const before = await driver.getAllWindowHandles();
  await driver.findElement(By.xpath(buttonXpath)).click();
  await driver.wait(async () => (await driver.getAllWindowHandles()).length > before.length, 15_000, `Open Options ${panel} tab`);
  const opened = (await driver.getAllWindowHandles()).find(handle => !before.includes(handle));
  if (!opened) throw new Error(`Options ${panel} tab was not created`);
  await driver.switchTo().window(opened);
  await driver.wait(async () => (await driver.getCurrentUrl()).startsWith(`${origin}/options.html`) && (await driver.getCurrentUrl()).includes(`#${panel}`), 15_000, `Options ${panel} route`);
  await visible(driver, `#panel-${panel}`);
  expect(await driver.findElement(By.css(`#tab-${panel}`)).getAttribute("aria-selected")).toBe("true");
}

async function selectValue(driver: WebDriver, selector: string, value: string): Promise<void> {
  await driver.executeScript(`const control = document.querySelector(arguments[0]);
    control.value = arguments[1]; control.dispatchEvent(new Event('change', { bubbles: true }));`, selector, value);
}

test("investigation screens expose the same compact steps and keyboard guidance in Firefox", async ({ driver, origin }) => {
  for (const [route, selector] of [["scheduler", ".mpu-scheduler"], ["ib", ".mpu-ib-investigation"], ["configuration", ".mpu-config-comparison"], ["tracesql", ".mpu-tracesql"]]) {
    await navigate(driver, `${origin}/options.html#${route}`);
    await visible(driver, selector);
    const headings = await driver.findElements(By.css(`${selector} > .mpu-investigation-step > h3`));
    expect(await Promise.all(headings.map(heading => heading.getText()))).toEqual(["1. Choose sources", "2. Preview and investigate", "3. Review and export"]);
    const guidance = await driver.findElement(By.css(`${selector} > .mpu-investigation-guidance`));
    expect(await guidance.getAttribute("open")).toBeNull();
    await driver.manage().window().setRect({ width: 480, height: 800 });
    const summary = await driver.findElement(By.css(`${selector} > .mpu-investigation-guidance > summary`));
    await driver.executeScript("arguments[0].focus()", summary);
    await driver.actions().sendKeys(Key.ENTER).perform();
    expect(await guidance.getAttribute("open")).not.toBeNull();
    await audit(driver, selector);
    expect(await driver.executeScript("return document.documentElement.scrollWidth <= innerWidth")).toBe(true);
  }
});

test("Oracle PDF lists cover Tools releases and application families with isolated favorites", async ({ driver, origin }) => {
  await navigate(driver, `${origin}/options.html#docs`);
  await visible(driver, "#oracle-docs h2");
  const count = () => driver.findElements(By.css(".oracle-docs-item")).then(items => items.length);
  expect(await count()).toBe(45);
  await fill(driver, '#oracle-docs input[type="text"]', "8.61.06");
  await fill(driver, '#oracle-docs input[type="search"]', "fluid");
  await expect.poll(count).toBe(1);
  expect(await driver.findElement(By.css(".oracle-docs-item a")).getAttribute("href")).toContain("pt861tflu");
  await click(driver, ".oracle-docs-favorite");
  await selectValue(driver, '#oracle-docs select[aria-label="Manual list"]', "favorites");
  await fill(driver, '#oracle-docs input[type="text"]', "8.62");
  await expect.poll(count).toBe(0);
  await selectValue(driver, '#oracle-docs select[aria-label="Manual list"]', "all");
  await fill(driver, '#oracle-docs input[type="search"]', "");
  for (const [family, expected] of [["hcm", 71], ["fscm", 60], ["cs", 19]] as const) {
    await selectValue(driver, "#oracle-docs label select", family);
    await expect.poll(count).toBe(expected);
    expect(await driver.findElement(By.css('#oracle-docs input[type="text"]')).isEnabled()).toBe(false);
  }
  await selectValue(driver, "#oracle-docs label select", "hcm");
  await fill(driver, '#oracle-docs input[type="search"]', "payroll north america");
  await expect.poll(count).toBe(1);
  await click(driver, ".oracle-docs-favorite");
  await expect.poll(() => driver.findElement(By.css(".oracle-docs-favorite")).getAttribute("aria-pressed")).toBe("true");
  await audit(driver, "#panel-docs");
  await driver.manage().window().setRect({ width: 480, height: 800 });
  await audit(driver, "#panel-docs");
});

test("Help and PCode references open their actual Options panels; inspected field context is required for a fresh PeopleCode preview", async ({ driver, origin }) => {
  const settings = e2eSettings({ features: { ...e2eSettings().features, pageInfoOption: "Yes", recFieldInfoOption: "Yes" } });
  await seed(driver, settings);
  const settingsHandle = await driver.getWindowHandle();
  await driver.switchTo().newWindow("tab");
  const pageHandle = await driver.getWindowHandle();
  await navigate(driver, `${E2E_ORIGIN}${FLUID_COMPONENT_PATH}`);
  await visible(driver, "#mpu-bar");

  await click(driver, "#mpu-help");
  await audit(driver, "#mpu-dialog");
  await openReferencePanel(driver, origin,
    "//button[normalize-space(.)='Oracle documentation hub (PeopleTools version-aware)']", "docs");
  await visible(driver, "#oracle-docs h2");
  await driver.close();
  await driver.switchTo().window(pageHandle);
  await driver.actions().sendKeys(Key.ESCAPE).perform();

  await click(driver, "#mpu-pcode");
  await audit(driver, "#mpu-dialog");
  await visible(driver, "#mpu-pcode-context-form");
  expect(await driver.findElement(By.css("#mpu-pcode-context-form")).getText()).toContain("No field locked");
  expect(await driver.findElements(By.xpath("//button[normalize-space(.)='Copy contextual example']"))).toHaveLength(0);
  await openReferencePanel(driver, origin,
    "//button[normalize-space(.)='Find PeopleCode API and language documentation']", "docs");
  await visible(driver, "#oracle-docs h2");
  await driver.close();
  await driver.switchTo().window(pageHandle);
  await openReferencePanel(driver, origin,
    "//button[normalize-space(.)='Prepare a PeopleCode task with an agent']", "agents");
  await visible(driver, "#agent-list .agent-prepare");
  await driver.close();
  await driver.switchTo().window(pageHandle);
  await driver.actions().sendKeys(Key.ESCAPE).perform();

  await click(driver, "#mpu-field");
  const icon = await visible(driver, '.mpu-recfield-icon[data-mpu-field-id="JOB_EMPLID"]');
  await icon.click();
  await visible(driver, '.mpu-recfield-area[data-mpu-locked="true"]');
  await click(driver, "#mpu-pcode");
  await visible(driver, "#mpu-pcode-context-form");
  expect(await driver.findElement(By.css("#mpu-dialog")).getText()).toContain("Locked DOM field: JOB_EMPLID");
  await fill(driver, "#mpu-pcode-record", "JOB");
  await fill(driver, "#mpu-pcode-field", "EMPLID");
  await selectValue(driver, "#mpu-pcode-event", "FieldChange");
  await fill(driver, "#mpu-pcode-context", "Level 0 component row for the current employee; verify the buffer in App Designer.");
  await driver.findElement(By.css("#mpu-pcode-context-confirmed")).click();
  await click(driver, "#mpu-pcode-context-form button");
  const code = await visible(driver, '[aria-label="Contextual PeopleCode example"]');
  await expect.poll(() => code.getText()).toContain("JOB.EMPLID.FieldChange");
  await expect.poll(() => code.getText()).toContain("Developer-supplied row/scroll context (unverified)");
  const copy = await driver.findElement(By.xpath("//button[normalize-space(.)='Copy contextual example']"));
  expect(await copy.isEnabled()).toBe(true);
  await audit(driver, "#mpu-dialog");
  await driver.manage().window().setRect({ width: 390, height: 844 });
  await audit(driver, "#mpu-dialog");
  expect(await driver.executeScript("return document.documentElement.scrollWidth <= window.innerWidth")).toBe(true);
  await fill(driver, "#mpu-pcode-context", "Changed context; preview must be regenerated.");
  await expect.poll(() => code.getText()).toBe("");
  expect(await copy.isEnabled()).toBe(false);
  await audit(driver, "#mpu-dialog");

  await driver.close();
  await driver.switchTo().window(settingsHandle);
});

test("dirty runbooks require a choice for New and Reload, restore keyboard focus, and reload the latest saved revision", async ({ driver, origin }) => {
  // Installation seeded settings after its first Options document initialized.
  // Start a fresh document so this test uses those configured environments.
  await driver.switchTo().newWindow("tab");
  await navigate(driver, `${origin}/options.html#environments`);
  await visible(driver, "#environment-runbooks");
  const firstTab = await driver.getWindowHandle();
  const selectedName = "Support procedure — DEV / MENU.COMPONENT";
  await fill(driver, '#environment-runbooks [data-runbook-focus="editor-component"]', "MENU.COMPONENT");
  await fill(driver, '#environment-runbooks [data-runbook-focus="editor-title"]', "Support procedure");
  await fill(driver, '#environment-runbooks [data-runbook-focus="editor-notes"]', "Initial saved notes.");
  await fill(driver, '#environment-runbooks [data-runbook-focus="editor-links"]', "Approved guide | https://support.example.org/procedure");
  expect(await driver.findElement(By.css('[data-runbook-focus="editor-environment"]')).getProperty("value")).toBe("DEV");
  await driver.findElement(By.xpath("//button[normalize-space(.)='Save runbook']")).click();
  await expect.poll(() => driver.findElement(By.css("#environment-runbooks [aria-live='polite']")).getText()).toBe("Runbook saved on this device.");
  await driver.wait(async () => (await driver.findElements(By.xpath(`//button[normalize-space(.)='${selectedName}']`))).length > 0, 15_000, "Saved runbook is listed");
  await driver.findElement(By.xpath(`//button[normalize-space(.)='${selectedName}']`)).click();
  await expect.poll(() => driver.findElement(By.css('#environment-runbooks [data-runbook-focus="editor-notes"]')).getProperty("value")).toBe("Initial saved notes.");
  await expect.poll(() => driver.findElement(By.xpath(`//button[normalize-space(.)='${selectedName}']`)).getAttribute("aria-pressed")).toBe("true");
  const selectedFirst = await driver.findElement(By.xpath(`//button[normalize-space(.)='${selectedName}']`));
  expect(await driver.executeScript("return document.activeElement === arguments[0]", selectedFirst)).toBe(true);

  await driver.switchTo().newWindow("tab");
  const staleTab = await driver.getWindowHandle();
  await navigate(driver, `${origin}/options.html#environments`);
  await driver.wait(async () => (await driver.findElements(By.xpath(`//button[normalize-space(.)='${selectedName}']`))).length > 0, 15_000, "Saved runbook appears in second Options view");
  await driver.findElement(By.xpath(`//button[normalize-space(.)='${selectedName}']`)).click();
  await fill(driver, '#environment-runbooks [data-runbook-focus="editor-notes"]', "Stale draft to preserve until reload.");

  await driver.switchTo().window(firstTab);
  await fill(driver, '#environment-runbooks [data-runbook-focus="editor-notes"]', "Updated by first view.");
  await driver.findElement(By.xpath("//button[normalize-space(.)='Save changes']")).click();
  await expect.poll(() => driver.findElement(By.css("#environment-runbooks [aria-live='polite']")).getText()).toBe("Runbook saved on this device.");
  await driver.switchTo().window(staleTab);
  await driver.findElement(By.xpath("//button[normalize-space(.)='Save changes']")).click();
  await expect.poll(() => driver.findElement(By.css("#environment-runbooks [aria-live='polite']")).getText()).toContain("changed in another view");
  await driver.findElement(By.xpath("//button[normalize-space(.)='Reload runbooks (discard unsaved edits)']")).click();
  await visible(driver, '[role="group"][aria-label="Unsaved runbook draft"]');
  await audit(driver, "#panel-environments");
  const reloadDiscard = await driver.findElement(By.xpath("//button[normalize-space(.)='Discard draft and reload runbooks']"));
  await driver.executeScript("arguments[0].focus()", reloadDiscard);
  await driver.actions().sendKeys(Key.ENTER).perform();
  await driver.wait(async () => await driver.findElement(By.css('#environment-runbooks [data-runbook-focus="editor-notes"]')).getProperty("value") === "Updated by first view.", 15_000, "Reloaded latest saved notes");
  expect(await driver.executeScript("return document.activeElement.textContent")).toBe("Reload runbooks");

  await driver.switchTo().window(firstTab);
  await fill(driver, '#environment-runbooks [data-runbook-focus="editor-notes"]', "Unsaved draft for Keep editing.");
  await driver.findElement(By.xpath("//button[normalize-space(.)='New runbook']")).click();
  await visible(driver, '[role="group"][aria-label="Unsaved runbook draft"]');
  const keepEditing = await driver.findElement(By.xpath("//button[normalize-space(.)='Keep editing']"));
  await driver.executeScript("arguments[0].focus()", keepEditing);
  await driver.actions().sendKeys(Key.ENTER).perform();
  await expect.poll(() => driver.executeScript("return document.activeElement.dataset.runbookFocus")).toBe("editor-notes");
  expect(await driver.findElement(By.css('#environment-runbooks [data-runbook-focus="editor-notes"]')).getProperty("value")).toBe("Unsaved draft for Keep editing.");

  await driver.findElement(By.xpath("//button[normalize-space(.)='New runbook']")).click();
  await visible(driver, '[role="group"][aria-label="Unsaved runbook draft"]');
  const discardDraft = await driver.findElement(By.xpath("//button[normalize-space(.)='Discard draft and start a new runbook']"));
  await driver.executeScript("arguments[0].focus()", discardDraft);
  await driver.actions().sendKeys(Key.ENTER).perform();
  await expect.poll(() => driver.executeScript("return document.activeElement.dataset.runbookFocus")).toBe("editor-title");
  expect(await driver.findElement(By.css('#environment-runbooks [data-runbook-focus="editor-title"]')).getProperty("value")).toBe("");
});

test("ProcessPack refuses ambiguous rows and rechecks a changed selection before copy", async ({ driver }) => {
  await navigate(driver, `${E2E_ORIGIN}${FLUID_COMPONENT_PATH}`); await visible(driver, "#mpu-bar");
  await driver.executeScript(() => {
    const table = document.createElement("table"); table.id = "synthetic-process-rows";
    table.innerHTML = '<tbody><tr><td><span id="PRCSINSTANCE$0">101</span></td></tr><tr><td><span id="PRCSINSTANCE$1">202</span></td><td><span id="PRCSNAME$1">OTHER_PROCESS</span></td></tr></tbody>';
    document.body.append(table);
  });
  await click(driver, "#mpu-pageinfo");
  expect(await driver.findElement(By.css("#mpu-pi-copy-process")).isEnabled()).toBe(false);
  expect(await driver.findElement(By.css("#mpu-dialog")).getText()).toContain("No unambiguous process context");
  await driver.actions().sendKeys(Key.ESCAPE).perform();
  await driver.executeScript('document.querySelector("#synthetic-process-rows tr").setAttribute("aria-selected", "true")');
  await click(driver, "#mpu-pageinfo"); expect(await driver.findElement(By.css("#mpu-pi-copy-process")).isEnabled()).toBe(true);
  await driver.executeScript('document.querySelector("#synthetic-process-rows tr").removeAttribute("aria-selected")');
  await click(driver, "#mpu-pi-copy-process");
  await expect.poll(() => driver.findElement(By.css("#mpu-live")).getText()).toBe("Process context changed. Reopen Page Info before copying.");
});

test("expanded Scheduler case validates references and focus, invalidates review, exports and clears local evidence", async ({ driver, origin }) => {
  await navigate(driver, `${origin}/options.html#scheduler`);
  const before = await extension(driver, "return browser.storage.local.get(null);");
  const source = resolve("tests/fixtures/scheduler-investigation/scheduler.txt");
  await driver.findElement(By.css("#mpu-scheduler-files")).sendKeys(source);
  await driver.findElement(By.xpath("//summary[normalize-space(.)='Case scope, findings and follow-up (manual)']")).click();
  await fill(driver, "#mpu-scheduler-case-caseLabel", "Synthetic rerun review");
  await fill(driver, "#mpu-scheduler-case-processInstance", "90002");
  await fill(driver, "#mpu-scheduler-case-expected", "One completed run with a verified parent.");
  await fill(driver, "#mpu-scheduler-case-findings", "Parent label conflicts across the supplied excerpts.");
  await fill(driver, "#mpu-scheduler-case-refs", "Source 9:L999");
  await click(driver, "#mpu-scheduler-preview");
  await expect.poll(() => driver.findElement(By.css("#mpu-scheduler-status")).getText()).toContain("Cannot prepare this investigation");
  expect(await driver.findElement(By.css("#mpu-scheduler-report")).getProperty("value")).toBe("");

  await fill(driver, "#mpu-scheduler-case-refs", "Source 1:L3");
  await click(driver, "#mpu-scheduler-preview");
  const report = await visible(driver, "#mpu-scheduler-report");
  await expect.poll(() => report.getProperty("value")).toContain("Case label: \"Synthetic rerun review\"");
  await expect.poll(() => report.getProperty("value")).toContain("Evidence references: Source 1:L3 | Manual citations, unverified");
  await expect.poll(() => (driver.findElements(By.css("#mpu-scheduler-focus option"))).then(options => options.length)).toBeGreaterThan(1);
  await selectValue(driver, "#mpu-scheduler-focus", "1:90002");
  await expect.poll(() => report.getProperty("value")).toBe("");
  const reviewed = await driver.findElement(By.css("#mpu-scheduler-reviewed"));
  expect(await reviewed.isSelected()).toBe(false);
  expect(await driver.findElement(By.css("#mpu-scheduler-download")).isEnabled()).toBe(false);
  await click(driver, "#mpu-scheduler-preview");
  await expect.poll(() => report.getProperty("value")).toContain("Selected process focus: Source 1; Process Instance 90002");
  await expect.poll(() => report.getProperty("value")).toContain("Findings: \"Parent label conflicts across the supplied excerpts.\"");
  await audit(driver, "#panel-scheduler");
  await reviewed.click();
  expect(await driver.findElement(By.css("#mpu-scheduler-download")).isEnabled()).toBe(true);
  await click(driver, "#mpu-scheduler-download");
  await expect.poll(() => driver.findElement(By.css("#mpu-scheduler-status")).getText()).toBe("Reviewed Scheduler report downloaded.");
  const downloaded = resolve("test-results/firefox-downloads", origin.slice("moz-extension://".length), "mpu-scheduler-investigation.txt");
  await expect.poll(() => existsSync(downloaded)).toBe(true);
  expect(readFileSync(downloaded, "utf8")).toBe(await report.getProperty("value"));
  await fill(driver, "#mpu-scheduler-case-findings", "Changed after review.");
  await expect.poll(() => report.getProperty("value")).toBe("");
  expect(await reviewed.isSelected()).toBe(false);
  expect(await driver.findElement(By.css("#mpu-scheduler-download")).isEnabled()).toBe(false);
  await click(driver, "#mpu-scheduler-clear");
  expect(await driver.findElement(By.css("#mpu-scheduler-files")).getAttribute("value")).toBe("");
  expect(await driver.findElement(By.css("#mpu-scheduler-case-caseLabel")).getProperty("value")).toBe("");
  expect(await extension(driver, "return browser.storage.local.get(null);")).toEqual(before);
});
