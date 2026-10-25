import { test as base, expect } from "@playwright/test";
import { unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Key, type WebDriver } from "selenium-webdriver";
import {
  E2E_ORIGIN, FLUID_COMPONENT_PATH, FLUID_FIELD_ENTRY_PATH,
  startFixtureServer, stopFixtureServer,
} from "../e2e/helpers/fixture-server";
import { e2eSettings } from "../e2e/helpers/extension";
import { By, click, extension, fill, launchFirefox, navigate, seed, visible } from "./helpers";

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

async function selectValue(driver: WebDriver, selector: string, value: string): Promise<void> {
  await driver.executeScript(`const control = document.querySelector(arguments[0]);
    control.value = arguments[1]; control.dispatchEvent(new Event('change', { bubbles: true }));`, selector, value);
}

test("guided specialist handoff keeps or discards the dirty brief; production consent applies and revocation cancels", async ({ driver, origin }) => {
  await navigate(driver, `${origin}/options.html#agents`);
  await visible(driver, ".agent-prepare");
  const prepare = await driver.findElements(By.css(".agent-prepare"));
  await prepare[0].click();
  await fill(driver, "#agent-brief-desiredOutcome", "SYNTHETIC_HANDOFF_EVIDENCE");
  await click(driver, "#agent-brief-generate");
  await expect.poll(() => driver.findElement(By.css("#agent-brief")).getProperty("value")).toContain("SYNTHETIC_HANDOFF_EVIDENCE");
  await fill(driver, "#agent-brief", "SYNTHETIC_MANUAL_EDIT");
  await driver.findElements(By.css(".agent-prepare")).then(items => items[0].click());
  await expect.poll(() => driver.findElement(By.css("#agent-brief")).getProperty("value")).toBe("SYNTHETIC_MANUAL_EDIT");
  await driver.findElements(By.css(".agent-prepare")).then(items => items[1].click());
  await visible(driver, "#agent-brief-switch-confirm");
  await driver.actions().sendKeys(Key.TAB, Key.ENTER).perform();
  await expect.poll(() => driver.findElement(By.css("#agent-brief")).getProperty("value")).toBe("SYNTHETIC_MANUAL_EDIT");
  await driver.findElements(By.css(".agent-prepare")).then(items => items[1].click());
  await visible(driver, "#agent-brief-switch-confirm");
  await driver.findElement(By.xpath("//button[normalize-space(.)='Discard and switch']")).click();
  await expect.poll(() => driver.findElement(By.css("#agent-brief")).getProperty("value")).not.toBe("SYNTHETIC_MANUAL_EDIT");
  const stored = await extension<Record<string, unknown>>(driver, "return browser.storage.local.get(null);");
  expect(JSON.stringify(stored)).not.toMatch(/SYNTHETIC_HANDOFF_EVIDENCE|SYNTHETIC_MANUAL_EDIT/);

  const settings = e2eSettings({
    environments: [{ label: "Production", active: "Yes", trcProfRunning: "No", classification: "production" }],
    features: { ...e2eSettings().features, fieldEntryOption: "Yes" },
  });
  await seed(driver, settings);
  const settingsHandle = await driver.getWindowHandle();
  await driver.switchTo().newWindow("tab");
  const pageHandle = await driver.getWindowHandle();
  await navigate(driver, `${E2E_ORIGIN}${FLUID_FIELD_ENTRY_PATH}`);
  await visible(driver, "#mpu-bar");
  await driver.actions().keyDown(Key.ALT).keyDown(Key.SHIFT).sendKeys("e").keyUp(Key.SHIFT).keyUp(Key.ALT).perform();
  await fill(driver, "#mpu-fe-sheet-text", "PERSONAL_DATA.FIRST_NAME\nAccepted");
  await click(driver, "#mpu-fe-sheet-preview");
  await click(driver, "#mpu-fe-elig-apply");
  await visible(driver, "#mpu-production-confirm");
  await click(driver, "#mpu-production-confirm");
  await expect.poll(() => driver.findElement(By.css("#PERSONAL_DATA_FIRST_NAME")).getProperty("value")).toBe("Accepted");

  await driver.actions().keyDown(Key.ALT).keyDown(Key.SHIFT).sendKeys("e").keyUp(Key.SHIFT).keyUp(Key.ALT).perform();
  await fill(driver, "#mpu-fe-sheet-text", "PERSONAL_DATA.FIRST_NAME\nBlocked");
  await click(driver, "#mpu-fe-sheet-preview");
  await click(driver, "#mpu-fe-elig-apply");
  await visible(driver, "#mpu-production-confirm");
  settings.features.fieldEntryOption = "No";
  await driver.switchTo().window(settingsHandle);
  await seed(driver, settings);
  await driver.switchTo().window(pageHandle);
  await expect.poll(async () => (await driver.findElements(By.css("#mpu-production-title"))).length).toBe(0);
  expect(await driver.findElement(By.css("#PERSONAL_DATA_FIRST_NAME")).getProperty("value")).toBe("Accepted");
});

test("explicit environment snapshots retain immutable saved evidence after deleting a source", async ({ driver, origin }) => {
  const initialTab = await driver.getWindowHandle();
  await driver.switchTo().newWindow("tab");
  const pageHandle = await driver.getWindowHandle();
  await navigate(driver, `${E2E_ORIGIN}${FLUID_COMPONENT_PATH}?testToken=PRIVATE-SESSION`);
  await visible(driver, "#mpu-bar");
  await driver.findElement(By.css("#JOB_EMPLID")).sendKeys("PRIVATE-FIELD-VALUE");
  await driver.executeScript(() => {
    const info = document.createElement("div"); info.id = "pt_pageinfo";
    info.dataset.menu = "MENU"; info.dataset.component = "COMP"; info.dataset.page = "BEFORE_PAGE";
    document.body.append(info);
  });

  const capture = async (label: string) => {
    await click(driver, "#mpu-pageinfo");
    await click(driver, "#mpu-pi-prepare-comparison");
    await visible(driver, '[aria-label="Snapshot metadata preview"]');
    const preview = await driver.findElement(By.css('[aria-label="Snapshot metadata preview"]')).getText();
    expect(preview).not.toMatch(/PRIVATE-FIELD-VALUE|PRIVATE-SESSION|BA_TEST|CSDEV/);
    await fill(driver, ".mpu-dialog-label input", label);
    await click(driver, "#mpu-dialog button");
    await expect.poll(() => driver.findElements(By.css("#mpu-dialog"))).toHaveLength(0);
  };
  await capture("Before");
  await driver.switchTo().window(initialTab);
  const firstStore = await extension<{ snapshots: { id: string }[] }>(driver, "return (await browser.storage.local.get('mpuEnvironmentComparisons')).mpuEnvironmentComparisons;");
  expect(firstStore.snapshots).toHaveLength(1);
  await driver.switchTo().window(pageHandle);
  await driver.executeScript(() => {
    document.getElementById("pt_pageinfo")?.setAttribute("data-page", "AFTER_PAGE");
    const input = document.createElement("input"); input.id = "SYNTHETIC_ADDED_FIELD"; input.value = "OTHER-PRIVATE-VALUE"; document.body.append(input);
  });
  await capture("After");
  await driver.switchTo().window(initialTab);
  const saved = await extension<{ snapshots: { id: string; fingerprint: { fieldIds: string[] } }[]; comparisons: unknown[] }>(driver, "return (await browser.storage.local.get('mpuEnvironmentComparisons')).mpuEnvironmentComparisons;");
  expect(saved.snapshots).toHaveLength(2);
  expect(saved.snapshots[0].fingerprint.fieldIds.every(id => !id.startsWith("mpu-"))).toBe(true);
  expect(JSON.stringify(saved)).not.toMatch(/PRIVATE-FIELD-VALUE|PRIVATE-SESSION/);

  await navigate(driver, `${origin}/options.html#compare`);
  const selects = await driver.findElements(By.css("#panel-compare select"));
  await driver.findElement(By.xpath("//button[normalize-space(.)='Reload comparison workspace (clears preview)']")).click();
  await expect.poll(async () => (await driver.findElements(By.css("#panel-compare select option"))).length).toBeGreaterThanOrEqual(6);
  await selectValue(driver, `#${await selects[0].getAttribute("id")}`, saved.snapshots[0].id);
  await selectValue(driver, `#${await selects[1].getAttribute("id")}`, saved.snapshots[1].id);
  await fill(driver, "#panel-compare input", "Ticket comparison");
  await driver.findElement(By.xpath("//button[normalize-space(.)='Preview selected comparison']")).click();
  const report = await visible(driver, '[aria-label="Environment comparison report"]');
  await expect.poll(() => report.getProperty("value")).toContain("Observed UI differences");
  await driver.findElement(By.xpath("//button[normalize-space(.)='Save reviewed comparison']")).click();
  await expect.poll(async () => (await extension<{ comparisons: unknown[] }>(driver, "return (await browser.storage.local.get('mpuEnvironmentComparisons')).mpuEnvironmentComparisons;")).comparisons.length).toBe(1);
  await driver.findElement(By.xpath("//button[normalize-space(.)='Delete snapshot Before']")).click();
  await expect.poll(async () => (await extension<{ snapshots: unknown[] }>(driver, "return (await browser.storage.local.get('mpuEnvironmentComparisons')).mpuEnvironmentComparisons;")).snapshots.length).toBe(1);
  await driver.findElement(By.xpath("//button[starts-with(normalize-space(.), 'Review Ticket comparison')]")).click();
  await expect.poll(() => report.getProperty("value")).toContain("Left snapshot: Before");
  await expect.poll(() => report.getProperty("value")).toContain("BEFORE_PAGE");
});

test("configuration comparison requires explicit review, redacts sensitive text, and clears invalid previews without storage writes", async ({ driver, origin }) => {
  await navigate(driver, `${origin}/options.html#configuration`);
  const before = await extension(driver, "return browser.storage.local.get(null);");
  await visible(driver, "#mpu-config-file-0");
  const fileA = resolve("test-results/firefox-config-before.ini");
  const fileB = resolve("test-results/firefox-config-after.ini");
  writeFileSync(fileA, "[Example]\nMode=before\nPassword=SYNTHETIC-PRIVATE-A\nEmpty=\n");
  writeFileSync(fileB, "[Example]\nMode=after\nPassword=SYNTHETIC-PRIVATE-B\nAdded=yes\n");
  try {
    await driver.findElement(By.css("#mpu-config-file-0")).sendKeys(fileA);
    await driver.findElement(By.css("#mpu-config-file-1")).sendKeys(fileB);
    const report = await visible(driver, '[aria-label="Configuration comparison report"]');
    await driver.findElement(By.xpath("//button[normalize-space(.)='Preview configuration comparison']")).click();
    await expect.poll(() => report.getProperty("value")).toContain("before");
    await expect.poll(() => report.getProperty("value")).toContain("after");
    const reportText = await report.getProperty("value");
    expect(reportText).not.toMatch(/SYNTHETIC-PRIVATE|firefox-config-(before|after)/i);
    const review = await visible(driver, "#mpu-config-reviewed");
    expect(await review.isEnabled()).toBe(true);
    await review.click();
    const download = await driver.findElement(By.xpath("//button[normalize-space(.)='Download reviewed configuration report']"));
    expect(await download.isEnabled()).toBe(true);

    await selectValue(driver, "#mpu-config-format-1", "json");
    await expect.poll(() => report.getProperty("value")).toBe("");
    expect(await review.isSelected()).toBe(false);
    await driver.findElement(By.css("#mpu-config-file-1")).sendKeys(resolve("tests/fixtures/configuration-comparison/sample.json"));
    await driver.findElement(By.xpath("//button[normalize-space(.)='Preview configuration comparison']")).click();
    await expect.poll(() => driver.findElement(By.css("#mpu-config-status")).getText()).toContain("Choose the same supported format");
    expect(await report.getProperty("value")).toBe("");
    await driver.findElement(By.xpath("//button[normalize-space(.)='Clear configuration files and report']")).click();
    expect(await driver.findElement(By.css("#mpu-config-file-0")).getAttribute("value")).toBe("");
    expect(await extension(driver, "return browser.storage.local.get(null);")).toEqual(before);
  } finally {
    unlinkSync(fileA);
    unlinkSync(fileB);
  }
});
