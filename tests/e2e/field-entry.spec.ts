import { test as base, expect } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import type { Server } from "node:http";
import { audit } from "./helpers/accessibility";
import {
  CLASSIC_GRID_PATH,
  CLASSIC_COMPONENT_PATH,
  FLUID_FIELD_ENTRY_PATH,
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
};

const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  extensionContext: async ({}, use) => {
    const server: Server = await startFixtureServer();
    const { context, extensionId } = await launchExtensionContext();
    await seedMpuSettings(
      context,
      extensionId,
      e2eSettings({
        features: {
          ...e2eSettings().features,
          fieldEntryOption: "Yes",
        },
      }),
    );
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
});

async function waitForIframeBody(page: Page, frameSelector: string): Promise<void> {
  await page.waitForFunction(
    (sel) => {
      const frame = document.querySelector(sel) as HTMLIFrameElement | null;
      return Boolean(frame?.contentDocument?.body?.querySelector("input, a, table"));
    },
    frameSelector,
    { timeout: 15_000 },
  );
}

test.describe("Field Entry toolkit", () => {
  test("Entry dialogs and populated preview pass browser axe", async ({ extensionContext, extensionId }) => {
    await seedMpuSettings(extensionContext, extensionId, e2eSettings({
      features: { ...e2eSettings().features, fieldEntryOption: "Yes" },
      fieldEntryProfiles: [{ id: "demo", name: "Demo", updatedAt: 1, rows: [{ record: "PERSONAL_DATA", field: "FIRST_NAME", value: "Demo" }] }],
    }));
    const page = await openPsPage(extensionContext, FLUID_FIELD_ENTRY_PATH);
    await page.locator("#mpu-entry").click();
    const menu = page.getByRole("menu", { name: "Field Entry", exact: true });
    await audit(page, '.mpu-flyout[aria-label="Field Entry"]');
    await menu.getByRole("menuitem", { name: "Capture", exact: true }).click();
    for (const name of ["Paste…", "From sheet…", "Find / Replace…", "Save profile…", "Load profile…"]) {
      await page.locator("#mpu-entry").click();
      await menu.getByRole("menuitem", { name, exact: true }).click();
      await audit(page, "#mpu-dialog");
      await page.keyboard.press("Escape");
      await expect(page.locator("#mpu-entry")).toBeFocused();
    }
    await page.close();
  });
  test("Classic TargetContent: writes iframe fields and notifies that frame's change hook", async ({ extensionContext }) => {
    const page = await openPsPage(extensionContext, CLASSIC_COMPONENT_PATH);
    const frame = page.frames().find((f) => f.name() === "TargetContent")!;
    await frame.evaluate(() => {
      document.body.innerHTML = '<input id="JOB_DEPTID$0" value="100"><input id="JOB_JOBCODE$0" value="A">';
      (window as Window & { addchg_?: (el: Element) => void }).addchg_ = (el) => { document.body.dataset.changed = el.id; };
    });
    await page.keyboard.press("Alt+Shift+E");
    await page.locator("#mpu-fe-sheet-text").fill("JOB.DEPTID\n200");
    await page.locator("#mpu-fe-sheet-preview").click();
    await page.locator("#mpu-fe-elig-apply").click();
    await expect(frame.locator('[id="JOB_DEPTID$0"]')).toHaveValue("200");
    await expect(frame.locator("body")).toHaveAttribute("data-changed", "JOB_DEPTID$0");
    await page.close();
  });
  test("Fluid: Entry menu Capture then Paste restores main page values", async ({
    extensionContext,
  }) => {
    const page = await openPsPage(extensionContext, FLUID_FIELD_ENTRY_PATH);
    await expect(page.locator("#mpu-bar")).toBeVisible();
    await expect(page.locator("#mpu-entry")).toBeVisible();
    await waitForIframeBody(page, "#ptModFrame_0");

    await page.locator("#mpu-entry").click();
    const flyout = page.locator('.mpu-flyout[aria-label="Field Entry"]');
    await expect(flyout).toBeVisible();
    await flyout.getByRole("menuitem", { name: "Capture" }).click();
    await expect(page.locator("#mpu-live")).toContainText(/Captured/i);

    await page.locator("#PERSONAL_DATA_FIRST_NAME").fill("Changed");

    await page.locator("#mpu-entry").click();
    await page.locator('.mpu-flyout[aria-label="Field Entry"]').getByRole("menuitem", { name: "Paste…" }).click();
    await expect(page.locator("#mpu-fe-elig-title")).toBeVisible();
    await page.locator("#mpu-fe-elig-apply").click();

    await expect(page.locator("#PERSONAL_DATA_FIRST_NAME")).toHaveValue("Pat");
    await page.close();
  });

  test("Fluid: From sheet fills main fields and modal (dialog) fields", async ({
    extensionContext,
  }) => {
    const page = await openPsPage(extensionContext, FLUID_FIELD_ENTRY_PATH);
    await expect(page.locator("#mpu-entry")).toBeVisible();

    await page.locator("#mpu-entry").click();
    await page
      .locator('.mpu-flyout[aria-label="Field Entry"]')
      .getByRole("menuitem", { name: "From sheet…" })
      .click();

    const sheet = [
      "PERSONAL_DATA.FIRST_NAME,PERSONAL_DATA.LAST_NAME,ADDRESSES.ADDRESS1,ADDRESSES.CITY",
      "Jamie,Nguyen,12 Oak Ave,Toronto",
    ].join("\n");
    await page.locator("#mpu-fe-sheet-text").fill(sheet);
    await page.locator("#mpu-fe-sheet-preview").click();
    await expect(page.locator("#mpu-fe-elig-title")).toBeVisible();
    await page.locator("#mpu-fe-elig-apply").click();

    await expect(page.locator("#PERSONAL_DATA_FIRST_NAME")).toHaveValue("Jamie");
    await expect(page.locator("#PERSONAL_DATA_LAST_NAME")).toHaveValue("Nguyen");
    await expect(page.locator("#ADDRESSES_ADDRESS1")).toHaveValue("12 Oak Ave");
    await expect(page.locator("#ADDRESSES_CITY")).toHaveValue("Toronto");
    await page.close();
  });

  test("Classic grid: multi-row sheet fills $0/$1 after the user adds a row", async ({
    extensionContext,
  }) => {
    const page = await openPsPage(extensionContext, CLASSIC_GRID_PATH);
    await expect(page.locator("#mpu-bar")).toBeVisible();
    await expect(page.locator("#JOB_DEPTID\\$0")).toHaveValue("100");

    await page.locator("[data-mpu-fe-add-row]").click();
    await expect(page.locator("#JOB_DEPTID\\$1")).toBeVisible();

    await page.locator("#mpu-entry").click();
    await page
      .locator('.mpu-flyout[aria-label="Field Entry"]')
      .getByRole("menuitem", { name: "From sheet…" })
      .click();

    const sheet = ["JOB.DEPTID\tJOB.JOBCODE", "111\tAAA", "222\tBBB"].join("\n");
    await page.locator("#mpu-fe-sheet-text").fill(sheet);
    await page.locator("#mpu-fe-sheet-preview").click();

    await expect(page.locator("#mpu-fe-elig-title")).toBeVisible({ timeout: 15_000 });
    await page.locator("#mpu-fe-elig-apply").click();

    await expect(page.locator("#JOB_DEPTID\\$0")).toHaveValue("111");
    await expect(page.locator("#JOB_JOBCODE\\$0")).toHaveValue("AAA");
    await expect(page.locator("#JOB_DEPTID\\$1")).toHaveValue("222");
    await expect(page.locator("#JOB_JOBCODE\\$1")).toHaveValue("BBB");
    await page.close();
  });

  test("Classic grid: preview leaves missing rows unmatched without clicking Add Row", async ({
    extensionContext,
  }) => {
    const page = await openPsPage(extensionContext, CLASSIC_GRID_PATH);
    await expect(page.locator("#JOB_DEPTID\\$0")).toBeVisible();
    await expect(page.locator("#JOB_DEPTID\\$1")).toHaveCount(0);

    await page.locator("#mpu-entry").click();
    await page
      .locator('.mpu-flyout[aria-label="Field Entry"]')
      .getByRole("menuitem", { name: "From sheet…" })
      .click();

    const sheet = ["JOB.DEPTID\tJOB.JOBCODE", "10\tX", "20\tY", "30\tZ"].join("\n");
    await page.locator("#mpu-fe-sheet-text").fill(sheet);
    await page.locator("#mpu-fe-sheet-preview").click();
    await expect(page.locator("#mpu-fe-elig-title")).toBeVisible({ timeout: 15_000 });

    await expect(page.locator("#JOB_DEPTID\\$2")).toHaveCount(0);
    await page.locator("#mpu-fe-elig-apply").click();
    await expect(page.locator("#JOB_DEPTID\\$0")).toHaveValue("10");
    await expect(page.locator("#JOB_DEPTID\\$1")).toHaveCount(0);
    await expect(page.locator("#JOB_DEPTID\\$2")).toHaveCount(0);
    await page.close();
  });

  test("Find / Replace remaps a Fluid field value with preview", async ({ extensionContext }) => {
    const page = await openPsPage(extensionContext, FLUID_FIELD_ENTRY_PATH);
    await page.locator("#mpu-entry").click();
    await page
      .locator('.mpu-flyout[aria-label="Field Entry"]')
      .getByRole("menuitem", { name: "Find / Replace…" })
      .click();

    await page.locator("#mpu-fe-fr-text").fill("Pat → Taylor");
    await page.locator("#mpu-fe-fr-preview").click();
    await expect(page.locator("#mpu-fe-elig-title")).toBeVisible();
    await page.locator("#mpu-fe-elig-apply").click();
    await expect(page.locator("#PERSONAL_DATA_FIRST_NAME")).toHaveValue("Taylor");
    await page.close();
  });
});
