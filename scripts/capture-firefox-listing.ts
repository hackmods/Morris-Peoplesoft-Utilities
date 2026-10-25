/** Capture actual Firefox extension UI; never overwrite reviewed Chrome artwork. */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { launchFirefox, navigate, visible } from "../tests/firefox/helpers";

const directory = resolve("store/firefox/screenshots");
mkdirSync(directory, { recursive: true });
const { driver, origin } = await launchFirefox();
try {
  const rect = await driver.manage().window().getRect();
  const inner = await driver.executeScript<number[]>("return [window.innerWidth, window.innerHeight];");
  await driver.manage().window().setRect({ width: rect.width + 1280 - inner[0], height: rect.height + 800 - inner[1] });
  for (const [route, ready] of [["features", "#feature-toggles input"], ["agents", "#agent-list button"], ["configuration", "#configuration-comparison-workspace"]]) {
    await navigate(driver, `${origin}/options.html#${route}`);
    await visible(driver, ready);
    if (route === "features") {
      const dismiss = await driver.findElement({ css: "#dismiss-onboarding" });
      if (await dismiss.isDisplayed()) await dismiss.click();
    }
    if (route === "agents") {
      const dismiss = await driver.findElement({ css: "#agent-dismiss-onboarding" });
      if (await dismiss.isDisplayed()) await dismiss.click();
      await driver.executeScript('document.getElementById("panel-agents").scrollIntoView();');
    }
    await driver.wait(async () => await driver.executeScript('return getComputedStyle(document.getElementById("toast")).opacity === "0";'), 10_000);
    writeFileSync(resolve(directory, `${route}.png`), Buffer.from(await driver.takeScreenshot(), "base64"));
  }
  const capabilities = await driver.getCapabilities();
  writeFileSync(resolve(directory, "README.md"), `# Firefox screenshot provenance\n\nCaptured ${new Date().toISOString()} using Firefox ${capabilities.getBrowserVersion()} and the packaged MPU 1.0.33 extension in a disposable Selenium profile.\n\nFeatures, Agents, and Compare configuration are actual extension Options pages. No real PeopleSoft session, employer system, personal record, or login is depicted. These images do not establish PeopleTools patch-level compatibility.\n\nCapture command: npm run build, then npx tsx scripts/capture-firefox-listing.ts. The script writes only this Firefox screenshot directory; existing reviewed Chrome artwork is preserved.\n`);
  console.log(`Captured Firefox listing images in ${directory}`);
} finally { await driver.quit(); }
