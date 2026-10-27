import { test, expect } from "@playwright/test";
import { launchExtensionContext } from "./helpers/extension";
import { audit } from "./helpers/accessibility";

for (const [route, selector, boundary] of [
  ["scheduler", ".mpu-scheduler", "native Process Scheduler logs"],
  ["ib", ".mpu-ib-investigation", "native monitor/gateway exports are not accepted"],
  ["configuration", ".mpu-config-comparison", "not effective runtime configuration"],
  ["tracesql", ".mpu-tracesql", "not verified native-log compatibility"],
] as const) {
  // Playwright requires fixture destructuring even though this test launches the extension itself.
  // eslint-disable-next-line no-empty-pattern
  test(`${route} presents a short local workflow and accessible optional guidance`, async ({}, info) => {
    const { context, extensionId } = await launchExtensionContext();
    try {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/options.html#${route}`);
      const root = page.locator(selector);
      await expect(root).toBeVisible();
      await expect(root.locator(":scope > .mpu-investigation-step > h3")).toHaveText([
        "1. Choose sources", "2. Preview and investigate", "3. Review and export",
      ]);
      await expect(root.locator(".mpu-investigation-notice")).toContainText(boundary);
      const guidance = root.locator(":scope > .mpu-investigation-guidance");
      await expect(guidance).not.toHaveAttribute("open", "");
      await expect(root.locator('input[type="file"]').first()).toBeVisible();
      await audit(page, selector);
      await page.screenshot({ path: info.outputPath(`${route}-desktop.png`), fullPage: true });
      await page.setViewportSize({ width: 320, height: 800 });
      await guidance.locator("summary").focus();
      await page.keyboard.press("Enter");
      await expect(guidance).toHaveAttribute("open", "");
      await audit(page, selector);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`${route}-narrow-guidance.png`), fullPage: true });
    } finally { await context.close(); }
  });
}
