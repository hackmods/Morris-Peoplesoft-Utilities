import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { launchExtensionContext, seedMpuSettings } from "./helpers/extension";
import { audit } from "./helpers/accessibility";

test("Trace SQL excerpt previews locally with SQLID/plan evidence, keyboard review/export and no persistence", async () => {
  const { context, extensionId } = await launchExtensionContext();
  try {
    await seedMpuSettings(context, extensionId);
    const page = await context.newPage();
    const external: string[] = [];
    page.on("request", (request) => {
      if (/^https?:/.test(request.url())) external.push(request.url());
    });
    await page.goto(`chrome-extension://${extensionId}/options.html#tracesql`);
    const before = await context.serviceWorkers()[0].evaluate(async () => JSON.stringify(await chrome.storage.local.get(null)));
    await expect(page.locator("#mpu-tracesql-status")).toContainText("sanitized");
    await page.getByLabel("Sanitized tracesql / trc excerpt", { exact: true }).setInputFiles([resolve("tests/fixtures/tracesql-investigation/sample.tracesql")]);
    await expect(page.locator("#mpu-tracesql-status")).toContainText("sample.tracesql");
    const report = page.getByLabel("Trace SQL investigation report", { exact: true });
    await expect(report).toHaveValue("");
    await expect(page.locator("#mpu-tracesql-download")).toBeDisabled();
    await page.locator("#mpu-tracesql-preview").click();
    await expect(report).toHaveValue(/PS_PERSONAL_DATA/);
    await expect(report).toHaveValue(/SQLID /);
    await expect(report).toHaveValue(/PLAN TREE/);
    await expect(report).toHaveValue(/AGGREGATE BY WHERE/);
    await expect(page.locator("#mpu-tracesql-status")).toContainText("review box");
    await expect(report).toBeFocused();
    await expect(page.locator("#mpu-tracesql-grouping")).toBeVisible();
    await expect(page.locator("#mpu-tracesql-from")).toContainText("PS_PERSONAL_DATA");
    await page.locator("#mpu-tracesql-sqlid").fill("no-such-sqlid");
    await expect(page.locator("#mpu-tracesql-where tbody tr")).toHaveCount(0);
    await page.locator("#mpu-tracesql-sqlid").fill("");
    await page.locator("#mpu-tracesql-plan button").first().click();
    await expect(page.locator("#mpu-tracesql-status")).toContainText("Source line");
    const review = page.locator("#mpu-tracesql-reviewed");
    await review.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab");
    await expect(page.locator("#mpu-tracesql-copy")).toBeFocused();
    const event = page.waitForEvent("download");
    await page.locator("#mpu-tracesql-download").click();
    const exported = await event;
    expect(exported.suggestedFilename()).toBe("mpu-tracesql-investigation.txt");
    expect(await readFile((await exported.path())!, "utf8")).toBe(await report.inputValue());
    await audit(page, "#panel-tracesql");
    await page.setViewportSize({ width: 390, height: 844 });
    await audit(page, "#panel-tracesql");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator("#mpu-tracesql-clear").click();
    await expect(page.locator("#mpu-tracesql-files")).toHaveValue("");
    await expect(report).toHaveValue("");
    expect(await context.serviceWorkers()[0].evaluate(async () => JSON.stringify(await chrome.storage.local.get(null)))).toBe(before);
    expect(external).toEqual([]);
    await page.reload();
    await expect(report).toHaveValue("");
  } finally {
    await context.close();
  }
});

test("Trace SQL invalid binary fails without leaving a prior report exportable", async () => {
  const { context, extensionId } = await launchExtensionContext();
  try {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html#tracesql`);
    const input = page.locator("#mpu-tracesql-files");
    await input.setInputFiles({
      name: "ok.tracesql",
      mimeType: "text/plain",
      buffer: Buffer.from("COM Stmt=SELECT A FROM PS_A A\n Dur=0.001 EXE"),
    });
    await page.locator("#mpu-tracesql-preview").click();
    await expect(page.locator("#mpu-tracesql-report")).toHaveValue(/PS_A/);
    await page.locator("#mpu-tracesql-reviewed").check();
    await input.setInputFiles({ name: "PRIVATE-FILENAME.tracesql", mimeType: "text/plain", buffer: Buffer.from([0xff]) });
    await page.locator("#mpu-tracesql-preview").click();
    await expect(page.locator("#mpu-tracesql-status")).toContainText("Cannot prepare");
    await expect(page.locator("#mpu-tracesql-report")).toHaveValue("");
    await expect(page.locator("#mpu-tracesql-download")).toBeDisabled();
    expect(await page.locator("#mpu-tracesql-status").textContent()).not.toContain("PRIVATE-FILENAME");
  } finally {
    await context.close();
  }
});
