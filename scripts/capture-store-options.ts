/** Capture the actual packaged options UI without changing reviewed artwork. */
import { mkdir } from "node:fs/promises";
import { launchExtensionContext } from "../tests/e2e/helpers/extension";

const output = "store/assets/submission";
await mkdir(output, { recursive: true });
const { context, extensionId } = await launchExtensionContext();
try {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.locator("#feature-toggles input").first().waitFor();
  await page.screenshot({ path: `${output}/options-features.png` });
} finally {
  await context.close();
}
