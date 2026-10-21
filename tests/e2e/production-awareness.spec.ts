import { test as base, expect } from "@playwright/test";
import type { BrowserContext } from "@playwright/test";
import { startFixtureServer, stopFixtureServer, FLUID_FIELD_ENTRY_PATH, CLASSIC_COMPONENT_PATH } from "./helpers/fixture-server";
import { e2eSettings, launchExtensionContext, seedMpuSettings, openPsPage } from "./helpers/extension";
import { audit } from "./helpers/accessibility";

const productionSettings = () => e2eSettings({
  environments: [{ label: "Production", active: "Yes", trcProfRunning: "No", classification: "production" }],
  features: { ...e2eSettings().features, fieldEntryOption: "Yes", traceOption: "Yes", greetingOption: "No" },
});
const test = base.extend<{ extensionContext: BrowserContext; extensionId: string }>({
  // eslint-disable-next-line no-empty-pattern
  extensionContext: async ({}, use) => {
    const server = await startFixtureServer();
    const { context, extensionId } = await launchExtensionContext();
    await seedMpuSettings(context, extensionId, productionSettings());
    await use(context);
    await context.close();
    await stopFixtureServer(server);
  },
  extensionId: async ({ extensionContext }, use) => { await use(extensionContext.serviceWorkers()[0].url().split("/")[2]); },
});

test("production badge persists; Field Entry confirms, cancels, and revalidates edited targets", async ({ extensionContext }) => {
  const page = await openPsPage(extensionContext, FLUID_FIELD_ENTRY_PATH);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#mpu-environment-classification")).toHaveText("PRODUCTION");
  await expect(page.locator("#mpu-env")).toHaveCount(0);
  await expect(page.locator("#mpu-bar")).toHaveAttribute("data-mpu-placement", "documentTop");
  await audit(page, "#mpu-bar");
  await page.evaluate(() => { document.body.style.minHeight = "3000px"; window.scrollTo(0, 500); });
  expect(await page.locator("#mpu-environment-classification").evaluate(el => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  const preview = async () => {
    await page.keyboard.press("Alt+Shift+E");
    await page.locator("#mpu-fe-sheet-text").fill("PERSONAL_DATA.FIRST_NAME\nReviewed");
    await page.locator("#mpu-fe-sheet-preview").click();
    await page.locator("#mpu-fe-elig-apply").click();
    await expect(page.locator("#mpu-production-title")).toBeVisible();
  };
  await preview();
  await expect(page.locator("#PERSONAL_DATA_FIRST_NAME")).toHaveValue("Pat");
  await audit(page, "#mpu-dialog");
  await expect(page.locator("#mpu-production-cancel")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#mpu-production-confirm")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#PERSONAL_DATA_FIRST_NAME")).toHaveValue("Pat");
  await preview();
  // Simulate an intervening user edit; approval must not overwrite it.
  await page.locator("#PERSONAL_DATA_FIRST_NAME").fill("User edit");
  await page.locator("#mpu-production-confirm").click();
  await expect(page.locator("#PERSONAL_DATA_FIRST_NAME")).toHaveValue("User edit");
  await preview();
  await page.evaluate(() => {
    const dirty = document.createElement("input"); dirty.type = "hidden"; dirty.id = "ICChanged"; dirty.value = "1"; document.body.append(dirty);
  });
  await page.locator("#mpu-production-confirm").click();
  await expect(page.locator("#PERSONAL_DATA_FIRST_NAME")).toHaveValue("Reviewed");
  await expect(page.locator("#ICChanged")).toHaveValue("1");
});

test("disabling Field Entry during production confirmation cancels all writes", async ({ extensionContext, extensionId }) => {
  const page = await openPsPage(extensionContext, FLUID_FIELD_ENTRY_PATH);
  await page.keyboard.press("Alt+Shift+E");
  await page.locator("#mpu-fe-sheet-text").fill("PERSONAL_DATA.FIRST_NAME\nBlocked");
  await page.locator("#mpu-fe-sheet-preview").click();
  await page.locator("#mpu-fe-elig-apply").click();
  await expect(page.locator("#mpu-production-title")).toBeVisible();
  const changed = productionSettings(); changed.features.fieldEntryOption = "No";
  await seedMpuSettings(extensionContext, extensionId, changed);
  await expect(page.locator("#mpu-production-title")).toHaveCount(0);
  await expect(page.locator("#PERSONAL_DATA_FIRST_NAME")).toHaveValue("Pat");
});

test("production Apply writes in the Classic owning iframe and preserves delivered change processing", async ({ extensionContext }) => {
  const page = await openPsPage(extensionContext, CLASSIC_COMPONENT_PATH);
  const frame = page.frames().find(f => f.name() === "TargetContent")!;
  await frame.waitForLoadState("load");
  await frame.evaluate(() => {
    document.body.innerHTML = '<input id="JOB_DEPTID$0" value="100"><input id="JOB_JOBCODE$0" value="A">';
    (window as Window & { addchg_?: (el: Element) => void }).addchg_ = el => { document.body.dataset.changed = el.id; };
  });
  await expect(frame.locator('[id="JOB_DEPTID$0"]')).toBeVisible();
  await page.keyboard.press("Alt+Shift+E");
  await page.locator("#mpu-fe-sheet-text").fill("JOB.DEPTID\n200");
  await page.locator("#mpu-fe-sheet-preview").click();
  await expect(page.locator("#mpu-fe-elig-apply")).toBeEnabled();
  await page.locator("#mpu-fe-elig-apply").click();
  await expect(frame.locator('[id="JOB_DEPTID$0"]')).toHaveValue("100");
  await page.locator("#mpu-production-confirm").click();
  await expect(frame.locator('[id="JOB_DEPTID$0"]')).toHaveValue("200");
  await expect(frame.locator("body")).toHaveAttribute("data-changed", "JOB_DEPTID$0");
});

test("production trace start makes no request before consent; Stop remains accessible", async ({ extensionContext }) => {
  const page = await openPsPage(extensionContext, FLUID_FIELD_ENTRY_PATH);
  const requests: string[] = [];
  await page.route("**/psc/**/c/UTILITIES.*", async route => { requests.push(route.request().url()); await route.fulfill({ status: 403, body: "Denied in fixture" }); });
  await page.locator("#mpu-trace").click();
  await page.locator("#mpu-trace-on").click();
  await expect(page.locator("#mpu-production-title")).toBeVisible();
  expect(requests).toHaveLength(0);
  await page.locator("#mpu-production-cancel").click();
  expect(requests).toHaveLength(0);
  await page.locator("#mpu-trace").click();
  await page.locator("#mpu-trace-off").click();
  await expect.poll(() => requests.length).toBe(2);
  await expect(page.locator("#mpu-production-title")).toHaveCount(0);
  await expect(page.locator("#mpu-live")).toContainText("may still be active");
});

test("environment classification saves explicitly; runbooks preserve concurrent edits and require reviewed imports", async ({ extensionContext, extensionId }) => {
  const options = await extensionContext.newPage();
  const requests: string[] = [];
  options.on("request", request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await options.goto(`chrome-extension://${extensionId}/options.html#environments`);
  await options.getByLabel("Environment 1 classification").selectOption("non-production");
  await options.locator(".env-card").getByRole("button", { name: "Save", exact: true }).click();
  const runbooks = options.getByRole("region", { name: "Environment runbooks", exact: true });
  await runbooks.getByLabel("Component (for example, MENU.COMPONENT)").fill("MENU.COMP");
  await runbooks.getByLabel("Runbook title", { exact: true }).fill("Support procedure");
  await runbooks.getByLabel("Notes (up to 4000 characters)").fill("Review the selected environment first.");
  await runbooks.getByLabel(/Approved HTTPS links, one per line/).fill("Approved guide | https://support.example.org/procedure");
  await runbooks.getByRole("button", { name: "Save runbook", exact: true }).click();
  const selected = runbooks.getByRole("button", { name: "Support procedure — Production / MENU.COMP", exact: true });
  await expect(selected).toBeFocused();
  const link = runbooks.getByRole("link", { name: "Approved guide", exact: true });
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(link).toHaveAttribute("referrerpolicy", "no-referrer");

  const stale = await extensionContext.newPage();
  await stale.goto(`chrome-extension://${extensionId}/options.html#environments`);
  const staleBooks = stale.getByRole("region", { name: "Environment runbooks", exact: true });
  await staleBooks.getByRole("button", { name: "Support procedure — Production / MENU.COMP", exact: true }).click();
  await staleBooks.getByLabel("Notes (up to 4000 characters)").fill("Stale draft to preserve");
  await runbooks.getByLabel("Notes (up to 4000 characters)").fill("Updated in first view");
  await runbooks.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(selected).toBeFocused();
  await staleBooks.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(staleBooks.locator('[aria-live="polite"]')).toContainText("changed in another view");
  await expect(staleBooks.getByLabel("Notes (up to 4000 characters)")).toHaveValue("Stale draft to preserve");
  await staleBooks.getByRole("button", { name: "Reload runbooks (discard unsaved edits)", exact: true }).click();
  await expect(staleBooks.getByLabel("Notes (up to 4000 characters)")).toHaveValue("Updated in first view");
  const json = JSON.stringify({ format: "mpu-runbooks", version: 1, runbooks: [{ id: "team-example", environment: "Team QA", component: "MENU.COMP", title: "Team procedure", notes: "Review this content.", links: [], updatedAt: 1 }] });
  await runbooks.getByLabel("Runbook JSON to import").fill(json);
  await runbooks.getByRole("button", { name: "Preview import", exact: true }).click();
  const preview = runbooks.getByRole("region", { name: "Runbook import preview", exact: true });
  await expect(preview).toContainText("Team procedure");
  await expect(preview).toContainText("Review this content.");
  await expect(preview).toContainText("kept as labels only");
  await runbooks.getByLabel("Runbook JSON to import").fill("{");
  await expect(runbooks.getByRole("button", { name: "Import reviewed runbooks", exact: true })).toHaveCount(0);
  await runbooks.getByLabel("Runbook JSON to import").fill(json);
  await runbooks.getByRole("button", { name: "Preview import", exact: true }).click();
  await runbooks.getByRole("button", { name: "Import reviewed runbooks", exact: true }).click();
  await expect(runbooks.getByRole("button", { name: "Team procedure — Team QA / MENU.COMP", exact: true })).toBeVisible();
  await expect(options.locator(".env-card")).toHaveCount(1);
  await options.setViewportSize({ width: 390, height: 844 });
  await audit(options, "#panel-environments");
  expect(await options.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await options.emulateMedia({ colorScheme: "dark" });
  await audit(options, "#panel-environments");
  expect(requests).toEqual([]);
  const page = await openPsPage(extensionContext, FLUID_FIELD_ENTRY_PATH);
  await expect(page.locator("#mpu-environment-classification")).toHaveText("Non-production");
});
