/** Capture genuine extension UI for the orange release without replacing prior artwork. */
import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { launchExtensionContext } from "../tests/e2e/helpers/extension";

const output = "store/assets/submission/1.0.30";
await mkdir(output, { recursive: true });
const { context, extensionId } = await launchExtensionContext();
try {
  for (const colorScheme of ["light", "dark"] as const) {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ colorScheme });
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.locator("#feature-toggles input").first().waitFor();
    await page.screenshot({ path: `${output}/options-${colorScheme}.png` });
    if (colorScheme === "dark") {
      const captures = [
        ["Features", "01-utilities-bar.png"],
        ["Favorites", "02-favorites.png"],
        ["Tracing", "03-page-info.png"],
        ["Agents", "04-field-inspector.png"],
        ["Host allowlist", "05-options.png"],
      ];
      for (const [tab, legacyFilename] of captures) {
        await page.getByRole("tab", { name: tab, exact: true }).click();
        const path = `${output}/${legacyFilename}`;
        await page.screenshot({ path });
        await copyFile(path, `store/assets/screenshots/${legacyFilename}`);
      }
      await writeFile("store/assets/screenshots/.live-captures", "Actual extension Options UI, version 1.0.30. No PeopleSoft compatibility claim.\n");
    }
    await page.close();
  }
} finally {
  await context.close();
}
