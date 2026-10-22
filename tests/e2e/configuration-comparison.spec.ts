import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { launchExtensionContext, seedMpuSettings } from "./helpers/extension";
import { audit } from "./helpers/accessibility";

test("configuration files require review, mask secrets, export locally and reset without persistence", async () => {
  const { context, extensionId } = await launchExtensionContext();
  try {
    await seedMpuSettings(context, extensionId);
    const page = await context.newPage(); const external: string[] = [];
    page.on("request", request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
    await page.goto(`chrome-extension://${extensionId}/options.html#configuration`);
    const before = await context.serviceWorkers()[0].evaluate(async () => JSON.stringify(await chrome.storage.local.get(null)));
    const files = ["[Example]\nMode=before\nPassword=SYNTHETIC-PRIVATE-A\nEmpty=", "[Example]\nMode=after\nPassword=SYNTHETIC-PRIVATE-B\nAdded=yes"];
    for (const [index, side] of ["First", "Second"].entries()) await page.getByLabel(`${side} sanitized file`, { exact: true }).setInputFiles({ name: `PRIVATE-FILENAME-${index}.cfg`, mimeType: "text/plain", buffer: Buffer.from(files[index]) });
    const report = page.getByRole("textbox", { name: "Configuration comparison report", exact: true });
    const copy = page.getByRole("button", { name: "Copy reviewed configuration report", exact: true });
    const download = page.getByRole("button", { name: "Download reviewed configuration report", exact: true });
    await expect(report).toHaveValue(""); await expect(download).toBeDisabled();
    await page.getByRole("button", { name: "Preview configuration comparison", exact: true }).click();
    await expect(report).toHaveValue(/before/); await expect(report).toHaveValue(/after/); await expect(report).toBeFocused();
    expect(await report.inputValue()).not.toMatch(/SYNTHETIC-PRIVATE|PRIVATE-FILENAME/);
    await expect(copy).toBeDisabled(); await expect(download).toBeDisabled();
    const review = page.getByLabel("I reviewed this report for sensitive information", { exact: true });
    await review.focus(); await page.keyboard.press("Space"); await page.keyboard.press("Tab"); await expect(copy).toBeFocused();
    const event = page.waitForEvent("download"); await download.click(); const exported = await event;
    expect(exported.suggestedFilename()).toBe("mpu-configuration-comparison.txt");
    expect(await readFile((await exported.path())!, "utf8")).toBe(await report.inputValue());
    await audit(page, "#panel-configuration"); await page.setViewportSize({ width: 390, height: 844 });
    await audit(page, "#panel-configuration"); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.emulateMedia({ colorScheme: "dark" }); await audit(page, "#panel-configuration");
    await page.getByLabel("First file format", { exact: true }).selectOption("json");
    await expect(report).toHaveValue(""); await expect(download).toBeDisabled(); await expect(review).not.toBeChecked();
    await page.getByRole("button", { name: "Clear configuration files and report", exact: true }).click();
    await expect(page.getByLabel("First sanitized file", { exact: true })).toHaveValue("");
    expect(await context.serviceWorkers()[0].evaluate(async () => JSON.stringify(await chrome.storage.local.get(null)))).toBe(before);
    expect(external).toEqual([]);
    await page.reload(); await expect(report).toHaveValue("");
  } finally { await context.close(); }
});

test("JSON format validation fails closed and cannot leave an earlier report exportable", async () => {
  const { context, extensionId } = await launchExtensionContext();
  try {
    const page = await context.newPage(); await page.goto(`chrome-extension://${extensionId}/options.html#configuration`);
    for (const side of ["First", "Second"]) {
      await page.getByLabel(`${side} file format`, { exact: true }).selectOption("json");
      await page.getByLabel(`${side} sanitized file`, { exact: true }).setInputFiles({ name: "synthetic.json", mimeType: "application/json", buffer: Buffer.from('{"Example":{"Enabled":true,"Empty":""}}') });
    }
    const preview = page.getByRole("button", { name: "Preview configuration comparison", exact: true });
    const report = page.getByRole("textbox", { name: "Configuration comparison report", exact: true });
    await preview.click(); await expect(report).not.toHaveValue("");
    await page.getByLabel("I reviewed this report for sensitive information", { exact: true }).check();
    await page.getByLabel("Second sanitized file", { exact: true }).setInputFiles({ name: "PRIVATE-NAME.json", mimeType: "application/json", buffer: Buffer.from('{"Duplicate":"PRIVATE-CANARY","Duplicate":true}') });
    await preview.click(); await expect(page.locator("#mpu-config-status")).toContainText("Cannot compare these files");
    await expect(report).toHaveValue(""); await expect(page.getByRole("button", { name: "Download reviewed configuration report", exact: true })).toBeDisabled();
    expect(await page.locator("#mpu-config-status").textContent()).not.toMatch(/PRIVATE-CANARY|PRIVATE-NAME/);
  } finally { await context.close(); }
});
