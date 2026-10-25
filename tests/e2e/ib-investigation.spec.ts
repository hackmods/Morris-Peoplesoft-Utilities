import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { launchExtensionContext, seedMpuSettings, openPsPage } from "./helpers/extension";
import { audit } from "./helpers/accessibility";
import { FLUID_COMPONENT_PATH, startFixtureServer, stopFixtureServer } from "./helpers/fixture-server";

test("IB evidence is local, cited and payload-free by default; inclusion requires a fresh reviewed export", async () => {
  const { context, extensionId } = await launchExtensionContext();
  try {
    await seedMpuSettings(context, extensionId); const page = await context.newPage(); const external: string[] = [];
    page.on("request", request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
    await page.goto(`chrome-extension://${extensionId}/options.html#ib`);
    await page.getByText("Show synthetic JSON envelope example", { exact: true }).click();
    const before = await context.serviceWorkers()[0].evaluate(async () => JSON.stringify(await chrome.storage.local.get(null)));
    await page.getByLabel("Sanitized IB JSON evidence files", { exact: true }).setInputFiles([resolve("tests/fixtures/ib-investigation/operation.json"), resolve("tests/fixtures/ib-investigation/contract.json")]);
    const report = page.getByLabel("IB investigation report", { exact: true }); const include = page.locator("#mpu-ib-include-payload");
    await expect(report).toHaveValue(""); await expect(include).not.toBeChecked(); await expect(page.locator("#mpu-ib-download")).toBeDisabled();
    await page.locator("#mpu-ib-preview").click(); await expect(report).toHaveValue(/serviceOperation \| Source 1:L6/); await expect(report).toHaveValue(/publication-contract/); await expect(report).toBeFocused();
    expect(await report.inputValue()).not.toMatch(/SYNTHETIC-BUSINESS-CONTEXT|9007199254740993|PRIVATE/);
    const review = page.locator("#mpu-ib-reviewed"); await review.check(); await include.check(); await expect(report).toHaveValue(""); await expect(review).not.toBeChecked(); await expect(page.locator("#mpu-ib-download")).toBeDisabled();
    await page.locator("#mpu-ib-preview").click(); await expect(report).toHaveValue(/SYNTHETIC-BUSINESS-CONTEXT/); await expect(report).toHaveValue(/9007199254740993/);
    expect(await report.inputValue()).not.toMatch(/PRIVATE|\/password|\/employeeId|\/credentials|synthetic.invalid/);
    await review.focus(); await page.keyboard.press("Space"); await page.keyboard.press("Tab"); await expect(page.locator("#mpu-ib-copy")).toBeFocused();
    const event = page.waitForEvent("download"); await page.locator("#mpu-ib-download").click(); const exported = await event;
    expect(exported.suggestedFilename()).toBe("mpu-ib-investigation.txt"); expect(await readFile((await exported.path())!, "utf8")).toBe(await report.inputValue());
    await audit(page, "#panel-ib"); await page.setViewportSize({ width: 390, height: 844 }); await audit(page, "#panel-ib");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.emulateMedia({ colorScheme: "dark" }); await audit(page, "#panel-ib");
    await page.locator("#mpu-ib-clear").click(); await expect(report).toHaveValue(""); await expect(page.locator("#mpu-ib-files")).toHaveValue(""); await expect(include).not.toBeChecked();
    expect(await context.serviceWorkers()[0].evaluate(async () => JSON.stringify(await chrome.storage.local.get(null)))).toBe(before);
    expect(external).toEqual([]); await page.reload(); await expect(report).toHaveValue("");
  } finally { await context.close(); }
});

test("IB duplicate payload keys and invalid UTF-8 fail without stale export or raw errors", async () => {
  const { context, extensionId } = await launchExtensionContext();
  try {
    const page = await context.newPage(); await page.goto(`chrome-extension://${extensionId}/options.html#ib`);
    const input = page.locator("#mpu-ib-files"); await input.setInputFiles(resolve("tests/fixtures/ib-investigation/operation.json"));
    await page.locator("#mpu-ib-preview").click(); await expect(page.locator("#mpu-ib-report")).not.toHaveValue(""); await page.locator("#mpu-ib-reviewed").check();
    for (const buffer of [Buffer.from('{"format":"mpu-ib-evidence","version":1,"records":[{"payload":{"safe":"PRIVATE-CANARY","safe":true}}]}'), Buffer.from([0xff])]) {
      await input.setInputFiles({ name: "PRIVATE-FILENAME.json", mimeType: "application/json", buffer }); await page.locator("#mpu-ib-preview").click();
      await expect(page.locator("#mpu-ib-status")).toContainText("Cannot prepare"); await expect(page.locator("#mpu-ib-report")).toHaveValue(""); await expect(page.locator("#mpu-ib-download")).toBeDisabled();
      expect(await page.locator("#mpu-ib-status").textContent()).not.toMatch(/PRIVATE-FILENAME|PRIVATE-CANARY/);
    }
  } finally { await context.close(); }
});

test("IB Page Info opens an empty workspace through the fixed guarded route", async () => {
  const server = await startFixtureServer(); const { context, extensionId } = await launchExtensionContext();
  try {
    await seedMpuSettings(context, extensionId); const page = await openPsPage(context, FLUID_COMPONENT_PATH); await expect(page.locator("#mpu-pageinfo")).toBeVisible();
    await page.evaluate(() => { const span = document.createElement("span"); span.id = "IB_SERVICE_OPR"; span.textContent = "SYNTHETIC_OPERATION"; document.body.append(span); });
    await page.locator("#mpu-pageinfo").click(); const button = page.getByRole("button", { name: "Investigate sanitized IB samples", exact: true }); await expect(button).toBeVisible(); await audit(page, "#mpu-dialog");
    const event = context.waitForEvent("page"); await button.click(); const workspace = await event;
    await expect(workspace).toHaveURL(`chrome-extension://${extensionId}/options.html#ib`); await expect(workspace.locator("#mpu-ib-report")).toHaveValue(""); await expect(workspace.locator("#mpu-ib-files")).toHaveValue(""); await expect(workspace.locator("#mpu-ib-include-payload")).not.toBeChecked();
  } finally { await context.close(); await stopFixtureServer(server); }
});

test("IB builder prepares exact local evidence, selected comparison and case findings without writing storage", async () => {
  const { context, extensionId } = await launchExtensionContext();
  try {
    await seedMpuSettings(context, extensionId); const page = await context.newPage(); const requests: string[] = [];
    page.on("request", request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
    await page.goto(`chrome-extension://${extensionId}/options.html#ib`);
    const before = await context.serviceWorkers()[0].evaluate(async () => JSON.stringify(await chrome.storage.local.get(null)));
    await page.getByText("Prepare evidence records without writing JSON", { exact: true }).click();
    await page.locator("#mpu-ib-entry-serviceOperation").fill("EXAMPLE"); await page.locator("#mpu-ib-entry-environmentLabel").fill("TEST"); await page.locator("#mpu-ib-entry-operationVersion").fill("v1");
    await page.locator("#mpu-ib-entry-observedAt").fill("2026-10-21T10:00:00Z"); await page.locator("#mpu-ib-entry-format").selectOption("json");
    await page.locator("#mpu-ib-payload-file").setInputFiles({ name: "PRIVATE-PAYLOAD.json", mimeType: "application/json", buffer: Buffer.from('{"amount":9007199254740993,"flag":true}') });
    await expect(page.locator("#mpu-ib-entry-payload")).toHaveValue(""); await page.locator("#mpu-ib-load-payload").click(); await expect(page.locator("#mpu-ib-entry-payload")).toHaveValue(/9007199254740993/);
    await page.locator("#mpu-ib-add-record").click(); await expect(page.locator("#mpu-ib-draft-records li")).toHaveCount(1);
    await page.locator("#mpu-ib-entry-observedAt").fill("2026-10-21T10:00:01Z"); await page.locator("#mpu-ib-entry-payload").fill('{"amount":9007199254740994,"flag":"true"}'); await page.locator("#mpu-ib-add-record").click();
    await page.locator("#mpu-ib-preview").click(); const report = page.locator("#mpu-ib-report"); await expect(report).toHaveValue(/explicitly prepared draft/);
    await page.getByText("Compare two explicitly selected records", { exact: true }).click(); await page.locator("#mpu-ib-compare-left").selectOption("1:1"); await page.locator("#mpu-ib-compare-right").selectOption("1:2");
    await page.getByText("Case findings and follow-up", { exact: true }).click(); await page.locator("#mpu-ib-case-caseLabel").fill("Example support case"); await page.locator("#mpu-ib-case-owner").fill("Support team");
    await page.locator("#mpu-ib-check-errors").selectOption("needs-follow-up"); await page.locator("#mpu-ib-note-errors").fill("Source 1 record 2; obtain original error evidence");
    await page.locator("#mpu-ib-include-payload").check(); await page.locator("#mpu-ib-preview").click();
    await expect(report).toHaveValue(/EXPLICIT RECORD COMPARISON — 1:1 -> 1:2/); await expect(report).toHaveValue(/9007199254740993 -> 9007199254740994/); await expect(report).toHaveValue(/type differs/); await expect(report).toHaveValue(/errors \| needs-follow-up/);
    expect(await report.inputValue()).not.toContain("PRIVATE-PAYLOAD");
    await audit(page, "#panel-ib"); await page.setViewportSize({ width: 390, height: 844 }); await audit(page, "#panel-ib"); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.emulateMedia({ colorScheme: "dark" }); await audit(page, "#panel-ib");
    await page.locator("#mpu-ib-reviewed").check(); const event = page.waitForEvent("download"); await page.locator("#mpu-ib-download").click(); const download = await event; expect(await readFile((await download.path())!, "utf8")).toBe(await report.inputValue());
    await page.locator("#mpu-ib-note-errors").fill("changed"); await expect(report).toHaveValue(""); await expect(page.locator("#mpu-ib-download")).toBeDisabled();
    await page.locator("#mpu-ib-remove-0").click(); await expect(page.locator("#mpu-ib-remove-0")).toBeFocused(); await expect(page.locator("#mpu-ib-compare-left option")).toHaveCount(1);
    await page.locator("#mpu-ib-clear").click(); await expect(page.locator("#mpu-ib-draft-records li")).toHaveCount(0); await expect(page.locator("#mpu-ib-case-caseLabel")).toHaveValue("");
    expect(await context.serviceWorkers()[0].evaluate(async () => JSON.stringify(await chrome.storage.local.get(null)))).toBe(before); expect(requests).toEqual([]);
  } finally { await context.close(); }
});

test("IB XML/SOAP evidence is inert, cited and rejects external entities without requests", async () => {
  const { context, extensionId } = await launchExtensionContext();
  try {
    const page = await context.newPage(); const requests: string[] = []; page.on("request", request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
    await page.goto(`chrome-extension://${extensionId}/options.html#ib`); await page.locator("#mpu-ib-files").setInputFiles(resolve("tests/fixtures/ib-investigation/soap-v2.json")); await page.locator("#mpu-ib-include-payload").check(); await page.locator("#mpu-ib-preview").click();
    await expect(page.locator("#mpu-ib-report")).toHaveValue(/decoded XML opening-tag L3/); expect(await page.locator("#mpu-ib-report").inputValue()).not.toMatch(/SYNTHETIC-PRIVATE|Authorization|schemas.xmlsoap.org/);
    await page.getByText("Prepare evidence records without writing JSON", { exact: true }).click(); await page.locator("#mpu-ib-entry-format").selectOption("xml");
    await page.locator("#mpu-ib-entry-payload").fill('<!DOCTYPE r SYSTEM "https://example.invalid/external.dtd"><r/>'); await page.locator("#mpu-ib-add-record").click(); await expect(page.locator("#mpu-ib-draft-status")).toContainText("Cannot add"); await expect(page.locator("#mpu-ib-draft-records li")).toHaveCount(0);
    await page.locator("#mpu-ib-entry-payload").fill('<Root><Value>sanitized XML</Value></Root>'); await page.locator("#mpu-ib-add-record").click(); await expect(page.locator("#mpu-ib-draft-records li")).toHaveCount(1);
    await page.locator("#mpu-ib-preview").click(); await expect(page.locator("#mpu-ib-report")).toHaveValue(/sanitized XML/); expect(requests).toEqual([]);
    await page.reload(); await page.getByText("Prepare evidence records without writing JSON", { exact: true }).click(); await expect(page.locator("#mpu-ib-entry-payload")).toHaveValue(""); await expect(page.locator("#mpu-ib-draft-records li")).toHaveCount(0);
  } finally { await context.close(); }
});
