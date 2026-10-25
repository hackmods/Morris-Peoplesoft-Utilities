import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";
import { e2eSettings, launchExtensionContext, seedMpuSettings, openPsPage } from "./helpers/extension";
import { FLUID_COMPONENT_PATH, CLASSIC_COMPONENT_PATH, startFixtureServer, stopFixtureServer } from "./helpers/fixture-server";
import { audit } from "./helpers/accessibility";
import type { EnvironmentComparisonStore } from "../../src/storage/environment-comparisons";

const test = base.extend<{ extensionContext: BrowserContext; extensionId: string }>({
  // eslint-disable-next-line no-empty-pattern
  extensionContext: async ({}, use) => {
    const server = await startFixtureServer(); const { context, extensionId } = await launchExtensionContext();
    await seedMpuSettings(context, extensionId, e2eSettings()); await use(context);
    await context.close(); await stopFixtureServer(server);
  },
  extensionId: async ({ extensionContext }, use) => { await use(extensionContext.serviceWorkers()[0].url().split("/")[2]); },
});
async function read(context: BrowserContext) {
  return context.serviceWorkers()[0].evaluate(async () => (await chrome.storage.local.get("mpuEnvironmentComparisons")).mpuEnvironmentComparisons as EnvironmentComparisonStore | undefined);
}
async function prepare(page: Page, label: string) {
  await page.locator("#mpu-pageinfo").click(); await page.locator("#mpu-pi-prepare-comparison").click();
  await expect(page.getByRole("textbox", { name: "Snapshot label", exact: true })).toBeFocused();
  await page.getByRole("textbox", { name: "Snapshot label", exact: true }).fill(label);
}
async function capture(page: Page, context: BrowserContext, label: string, count: number) {
  await prepare(page, label); await page.getByRole("button", { name: "Save reviewed snapshot", exact: true }).click();
  await expect.poll(async () => (await read(context))?.snapshots.length).toBe(count);
  await expect(page.locator("#mpu-dialog")).toHaveCount(0);
}
async function selectPair(page: Page, context: BrowserContext, label: string) {
  const data = (await read(context))!;
  await page.getByLabel("First snapshot", { exact: true }).selectOption(data.snapshots[0].id);
  await page.getByLabel("Second snapshot", { exact: true }).selectOption(data.snapshots[1].id);
  await page.getByLabel("Comparison label", { exact: true }).fill(label);
  await page.getByRole("button", { name: "Preview selected comparison", exact: true }).click();
}

test("reviewed snapshots compare only UI metadata and retain saved evidence after source deletion", async ({ extensionContext, extensionId }) => {
  const page = await openPsPage(extensionContext, FLUID_COMPONENT_PATH + "?testToken=PRIVATE-SESSION");
  await page.locator("#JOB_EMPLID").fill("PRIVATE-FIELD-VALUE");
  await page.evaluate(() => {
    const info = document.createElement("div"); info.id = "pt_pageinfo"; info.dataset.menu = "MENU"; info.dataset.component = "COMP"; info.dataset.page = "BEFORE_PAGE"; document.body.append(info);
  });
  const originalSettings = await extensionContext.serviceWorkers()[0].evaluate(async () => JSON.stringify((await chrome.storage.local.get("mpuSettings")).mpuSettings));
  await prepare(page, "Before");
  expect(await read(extensionContext)).toBeUndefined();
  const metadata = await page.getByLabel("Snapshot metadata preview", { exact: true }).textContent();
  for (const secret of ["PRIVATE-FIELD-VALUE", "PRIVATE-SESSION", "BA_TEST", "CSDEV"]) expect(metadata).not.toContain(secret);
  await audit(page, "#mpu-dialog");
  await page.keyboard.press("Escape");
  await expect(page.locator("#mpu-pageinfo")).toBeFocused();
  expect(await read(extensionContext)).toBeUndefined();
  await capture(page, extensionContext, "Before", 1);
  await page.evaluate(() => {
    document.getElementById("pt_pageinfo")!.dataset.page = "AFTER_PAGE";
    const input = document.createElement("input"); input.id = "SYNTHETIC_ADDED_FIELD"; input.value = "OTHER-PRIVATE-VALUE"; document.body.append(input);
  });
  await capture(page, extensionContext, "After", 2);
  const data = (await read(extensionContext))!;
  expect(data.snapshots[0].fingerprint.fieldIds.every(id => !id.startsWith("mpu-"))).toBe(true);
  expect(JSON.stringify(data)).not.toContain("PRIVATE-FIELD-VALUE");
  expect(JSON.stringify(data)).not.toContain("PRIVATE-SESSION");
  const options = await extensionContext.newPage(); const externalRequests: string[] = [];
  options.on("request", request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
  await options.goto(`chrome-extension://${extensionId}/options.html#compare`);
  await expect(options.getByRole("button", { name: "Save reviewed comparison", exact: true })).toBeDisabled();
  await expect(options.getByRole("button", { name: "Download reviewed report", exact: true })).toBeDisabled();
  await selectPair(options, extensionContext, "Ticket comparison");
  const report = options.getByRole("textbox", { name: "Environment comparison report", exact: true });
  await expect(report).toBeFocused(); await expect(report).toHaveValue(/Observed UI differences/);
  await expect(report).toHaveValue(/cap 200/); await expect(report).toHaveValue(/PUM image: unknown/);
  await expect(report).toHaveValue(/cannot establish PeopleCode/);
  await options.getByRole("button", { name: "Save reviewed comparison", exact: true }).click();
  await expect.poll(async () => (await read(extensionContext))?.comparisons.length).toBe(1);
  await expect(options.getByRole("button", { name: "Preview selected comparison", exact: true })).toBeFocused();
  await options.getByRole("button", { name: "Delete snapshot Before", exact: true }).click();
  await expect.poll(async () => (await read(extensionContext))?.snapshots.length).toBe(1);
  await options.getByRole("button", { name: /^Review Ticket comparison/ }).click();
  await expect(report).toHaveValue(/Left snapshot: Before/); await expect(report).toHaveValue(/BEFORE_PAGE/);
  const download = options.waitForEvent("download"); await options.getByRole("button", { name: "Download reviewed report", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("mpu-environment-comparison.txt");
  await options.setViewportSize({ width: 390, height: 844 }); await audit(options, "#panel-compare");
  expect(await options.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await options.emulateMedia({ colorScheme: "dark" }); await audit(options, "#panel-compare");
  expect(externalRequests).toEqual([]);
  expect(await extensionContext.serviceWorkers()[0].evaluate(async () => JSON.stringify((await chrome.storage.local.get("mpuSettings")).mpuSettings))).toBe(originalSettings);
});

test("Classic capture records unknown target scope and disabling Page Info closes pending review", async ({ extensionContext, extensionId }) => {
  const page = await openPsPage(extensionContext, CLASSIC_COMPONENT_PATH);
  const frame = page.frames().find(item => item.name() === "TargetContent")!; await frame.waitForLoadState("load");
  await frame.evaluate(() => { document.body.innerHTML = '<input id="JOB_DEPTID$0" value="100"><input id="JOB_JOBCODE$0" value="A">'; });
  await prepare(page, "Classic review");
  await expect(page.getByLabel("Snapshot metadata preview", { exact: true })).toContainText("Owning target origin/site could not be established");
  await expect(frame.locator('[id="JOB_DEPTID$0"]')).toHaveValue("100");
  const disabled = e2eSettings(); disabled.features.pageInfoOption = "No";
  await seedMpuSettings(extensionContext, extensionId, disabled);
  await expect(page.locator("#mpu-dialog")).toHaveCount(0); expect(await read(extensionContext)).toBeUndefined();
});

test("comparison drafts survive concurrent view conflicts until explicit reload", async ({ extensionContext, extensionId }) => {
  const page = await openPsPage(extensionContext, FLUID_COMPONENT_PATH);
  await capture(page, extensionContext, "First capture", 1); await capture(page, extensionContext, "Second capture", 2);
  const options = await extensionContext.newPage(); const stale = await extensionContext.newPage();
  for (const view of [options, stale]) { await view.goto(`chrome-extension://${extensionId}/options.html#compare`); await selectPair(view, extensionContext, view === options ? "First view" : "Stale draft"); }
  await options.getByRole("button", { name: "Save reviewed comparison", exact: true }).click();
  await expect.poll(async () => (await read(extensionContext))?.comparisons.length).toBe(1);
  await stale.getByRole("button", { name: "Save reviewed comparison", exact: true }).click();
  await expect(stale.locator('#environment-comparison-workspace [aria-live]')).toContainText("changed in another view");
  await expect(stale.getByLabel("Comparison label", { exact: true })).toHaveValue("Stale draft");
  await expect(stale.getByLabel("Environment comparison report", { exact: true })).toHaveValue(/Stale draft/);
  await stale.getByRole("button", { name: "Reload comparison workspace (clears preview)", exact: true }).click();
  await expect(stale.getByLabel("Environment comparison report", { exact: true })).toHaveValue("");
  await expect(stale.getByRole("button", { name: /^Review First view/ })).toBeVisible();
});
