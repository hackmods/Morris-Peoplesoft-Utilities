import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { launchExtensionContext, seedMpuSettings, openPsPage } from "./helpers/extension";
import { audit } from "./helpers/accessibility";
import { FLUID_COMPONENT_PATH, startFixtureServer, stopFixtureServer } from "./helpers/fixture-server";

test("Scheduler excerpts preview locally with source evidence, keyboard review/export and no persistence", async () => {
  const { context, extensionId } = await launchExtensionContext();
  try {
    await seedMpuSettings(context, extensionId);
    const page = await context.newPage(); const external: string[] = [];
    page.on("request", request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
    await page.goto(`chrome-extension://${extensionId}/options.html#scheduler`);
    const before = await context.serviceWorkers()[0].evaluate(async () => JSON.stringify(await chrome.storage.local.get(null)));
    await page.getByLabel("Sanitized Scheduler log excerpts", { exact: true }).setInputFiles([resolve("tests/fixtures/scheduler-investigation/scheduler.txt"), resolve("tests/fixtures/scheduler-investigation/distribution.txt")]);
    await page.locator("#mpu-scheduler-pack").fill("Process Instance: 90002\nUser: PRIVATE-USER");
    const report = page.getByLabel("Scheduler investigation report", { exact: true });
    await expect(report).toHaveValue(""); await expect(page.locator("#mpu-scheduler-download")).toBeDisabled();
    await page.locator("#mpu-scheduler-preview").click();
    await expect(report).toHaveValue(/Source 1:L3 \| Parent 90001 -> Instance 90002/);
    await expect(report).toHaveValue(/Conflicting parent labels/); await expect(report).toBeFocused();
    expect(await report.inputValue()).not.toMatch(/PRIVATE-USER|SYNTHETIC-SECRET|SYNTHETIC-SENSITIVE|SYNTHETIC-TOKEN/);
    await page.getByText("Case scope, findings and follow-up (manual)", { exact: true }).click();
    await page.locator("#mpu-scheduler-case-caseLabel").fill("Synthetic batch triage");
    await page.locator("#mpu-scheduler-case-runObservation").fill("Reported run outcome requires checking");
    await page.locator("#mpu-scheduler-case-distributionObservation").fill("Distribution outcome unknown");
    await page.locator("#mpu-scheduler-case-followUp").fill("Check cited source lines before handoff");
    await page.locator("#mpu-scheduler-case-refs").fill("Source 1:L3");
    await page.locator("#mpu-scheduler-focus").selectOption("1:90002");
    await expect(report).toHaveValue(""); await page.locator("#mpu-scheduler-preview").click();
    await expect(report).toHaveValue(/Selected process focus: Source 1; Process Instance 90002/);
    await expect(report).toHaveValue(/Run observation:.*Reported run outcome/); await expect(report).toHaveValue(/Distribution observation:.*Distribution outcome unknown/);
    const review = page.locator("#mpu-scheduler-reviewed"); await review.focus(); await page.keyboard.press("Space"); await page.keyboard.press("Tab");
    await expect(page.locator("#mpu-scheduler-copy")).toBeFocused();
    const event = page.waitForEvent("download"); await page.locator("#mpu-scheduler-download").click(); const exported = await event;
    expect(exported.suggestedFilename()).toBe("mpu-scheduler-investigation.txt"); expect(await readFile((await exported.path())!, "utf8")).toBe(await report.inputValue());
    await audit(page, "#panel-scheduler"); await page.setViewportSize({ width: 390, height: 844 }); await audit(page, "#panel-scheduler");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.emulateMedia({ colorScheme: "dark" }); await audit(page, "#panel-scheduler");
    await page.locator("#mpu-scheduler-pack").fill("changed"); await expect(report).toHaveValue(""); await expect(review).not.toBeChecked();
    await page.locator("#mpu-scheduler-clear").click(); await expect(page.locator("#mpu-scheduler-files")).toHaveValue(""); await expect(page.locator("#mpu-scheduler-pack")).toHaveValue("");
    await expect(page.locator("#mpu-scheduler-case-caseLabel")).toHaveValue(""); await expect(page.locator("#mpu-scheduler-focus")).toBeDisabled();
    expect(await context.serviceWorkers()[0].evaluate(async () => JSON.stringify(await chrome.storage.local.get(null)))).toBe(before);
    expect(external).toEqual([]); await page.reload(); await expect(report).toHaveValue("");
  } finally { await context.close(); }
});

test("Scheduler invalid text fails without leaving a prior report exportable", async () => {
  const { context, extensionId } = await launchExtensionContext();
  try {
    const page = await context.newPage(); await page.goto(`chrome-extension://${extensionId}/options.html#scheduler`);
    const input = page.locator("#mpu-scheduler-files");
    await input.setInputFiles({ name: "sample.log", mimeType: "text/plain", buffer: Buffer.from("unsupported local date; evidence remains unknown") });
    await page.locator("#mpu-scheduler-preview").click(); await expect(page.locator("#mpu-scheduler-report")).toHaveValue(/Chronology unknown/);
    await page.locator("#mpu-scheduler-reviewed").check();
    await input.setInputFiles({ name: "PRIVATE-FILENAME.log", mimeType: "text/plain", buffer: Buffer.from([0xff]) }); await page.locator("#mpu-scheduler-preview").click();
    await expect(page.locator("#mpu-scheduler-status")).toContainText("Cannot prepare"); await expect(page.locator("#mpu-scheduler-report")).toHaveValue(""); await expect(page.locator("#mpu-scheduler-download")).toBeDisabled();
    expect(await page.locator("#mpu-scheduler-status").textContent()).not.toContain("PRIVATE-FILENAME");
  } finally { await context.close(); }
});

test("Process Monitor ticket pack links to the empty Scheduler workspace without page context", async () => {
  const server = await startFixtureServer(); const { context, extensionId } = await launchExtensionContext();
  try {
    await seedMpuSettings(context, extensionId); const page = await openPsPage(context, FLUID_COMPONENT_PATH);
    await expect(page.locator("#mpu-pageinfo")).toBeVisible();
    await page.evaluate(() => {
      const table = document.createElement("table"); table.id = "synthetic-process-rows";
      table.innerHTML = '<tbody><tr><td><span id="PRCSINSTANCE$0">90002</span></td></tr><tr><td><span id="PRCSINSTANCE$1">90003</span></td><td><span id="PRCSNAME$1">OTHER_PROCESS</span></td></tr></tbody>';
      document.body.append(table);
    });
    await page.locator("#mpu-pageinfo").click();
    await expect(page.locator("#mpu-pi-copy-process")).toBeDisabled();
    await expect(page.getByRole("dialog")).toContainText("No unambiguous process context");
    await page.keyboard.press("Escape");
    await page.evaluate(() => { document.querySelector("#synthetic-process-rows tr")!.setAttribute("aria-selected", "true"); });
    await page.locator("#mpu-pageinfo").click(); await expect(page.locator("#mpu-pi-copy-process")).toBeEnabled();
    await page.evaluate(() => { document.querySelector("#synthetic-process-rows tr")!.removeAttribute("aria-selected"); });
    await page.locator("#mpu-pi-copy-process").click(); await expect(page.locator("#mpu-live")).toContainText("Process context changed");
    const link = page.getByRole("button", { name: "Investigate sanitized Scheduler logs", exact: true });
    await expect(link).toBeVisible(); await audit(page, "#mpu-dialog");
    const event = context.waitForEvent("page"); await link.click(); const workspace = await event;
    await expect(workspace).toHaveURL(`chrome-extension://${extensionId}/options.html#scheduler`);
    await expect(workspace.locator("#mpu-scheduler-pack")).toHaveValue(""); await expect(workspace.locator("#mpu-scheduler-report")).toHaveValue("");
  } finally { await context.close(); await stopFixtureServer(server); }
});
