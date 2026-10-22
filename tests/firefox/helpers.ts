import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { Builder, By, error, type WebDriver } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox.js";
import axe from "axe-core";
import { expect } from "@playwright/test";
import { FIREFOX_ID } from "../../scripts/extension-manifest";
import { e2eSettings } from "../e2e/helpers/extension";
import type { MpuSettings } from "../../src/storage/schema";

export { By };

export async function launchFirefox(): Promise<{ driver: firefox.Driver; origin: string }> {
  const uuid = randomUUID();
  const downloadDir = resolve("test-results/firefox-downloads", uuid);
  mkdirSync(downloadDir, { recursive: true });
  const options = new firefox.Options()
    .addArguments("-headless")
    .setPreference("browser.download.folderList", 2)
    .setPreference("browser.download.dir", downloadDir)
    .setPreference("browser.download.alwaysOpenPanel", false)
    .setPreference("browser.helperApps.neverAsk.saveToDisk", "application/json,text/csv,text/plain")
    .setPreference("extensions.webextensions.uuids", JSON.stringify({ [FIREFOX_ID]: uuid }));
  if (process.env.FIREFOX_BINARY) options.setBinary(process.env.FIREFOX_BINARY);
  const builder = new Builder().forBrowser("firefox").setFirefoxOptions(options);
  // Firefox deliberately restricts direct WebDriver navigation to moz-extension.
  // System access is limited to this disposable test browser, never the extension.
  const service = new firefox.ServiceBuilder(process.env.GECKODRIVER).addArguments("--allow-system-access");
  if (process.env.FIREFOX_DRIVER_LOG) service.enableVerboseLogging(true).setStdio("inherit");
  builder.setFirefoxService(service);
  const driver = await builder.build() as firefox.Driver;
  try {
    await driver.manage().setTimeouts({ script: 20_000, pageLoad: 30_000 });
    await driver.manage().window().setRect({ width: 1280, height: 900 });
    await driver.installAddon(resolve("dist/firefox"), true);
    const origin = `moz-extension://${uuid}`;
    // Installation opens Options asynchronously. Wait for that real entry point
    // before seeding or navigating, so it cannot steal a later test's active tab.
    await driver.wait(async () => {
      for (const handle of await driver.getAllWindowHandles()) {
        await driver.switchTo().window(handle);
        if (await driver.getCurrentUrl() === `${origin}/options.html` &&
            await driver.executeScript("return document.readyState") === "complete") return true;
      }
      return false;
    }, 20_000, "Installed extension opens Options");
    await seed(driver);
    return { driver, origin };
  } catch (error) {
    await driver.quit();
    throw error;
  }
}

export async function navigate(driver: WebDriver, url: string): Promise<void> {
  if (!url.startsWith("moz-extension://")) { await driver.get(url); return; }
  const firefoxDriver = driver as firefox.Driver;
  await firefoxDriver.setContext(firefox.Context.CHROME);
  try {
    await driver.executeScript(`window.gBrowser.selectedBrowser.loadURI(Services.io.newURI(arguments[0]), {
      triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal()
    });`, url);
  } finally { await firefoxDriver.setContext(firefox.Context.CONTENT); }
  await driver.wait(async () => await driver.getCurrentUrl() === url &&
    await driver.executeScript("return document.readyState") === "complete", 20_000, `Navigate to ${url}`);
}

/** Run only in extension documents. Convert rejected promises into test failures. */
export async function extension<T>(driver: WebDriver, body: string, ...args: unknown[]): Promise<T> {
  const result = await driver.executeAsyncScript<{ value?: T; error?: string }>(`
    const done = arguments[arguments.length - 1];
    const args = Array.from(arguments).slice(0, -1);
    (async () => { ${body} })().then(value => done({ value }), error => done({ error: String(error) }));
  `, ...args);
  if (result.error) throw new Error(result.error);
  return result.value as T;
}

export async function seed(driver: WebDriver, settings: MpuSettings = e2eSettings()): Promise<void> {
  await extension(driver, 'await browser.storage.local.set({ mpuSettings: args[0] });', settings);
}

export async function visible(driver: WebDriver, selector: string) {
  const element = await driver.wait(async () => {
    try {
      const element = await driver.findElement(By.css(selector));
      return await element.isDisplayed() ? element : null;
    } catch (cause) {
      if (cause instanceof error.StaleElementReferenceError || cause instanceof error.NoSuchElementError) return null;
      throw cause;
    }
  }, 15_000, `Visible element: ${selector}`);
  if (!element) throw new Error(`Missing visible element: ${selector}`);
  return element;
}

export async function click(driver: WebDriver, selector: string): Promise<void> {
  await driver.wait(async () => {
    try {
      const element = await visible(driver, selector);
      if (!await element.isEnabled()) return false;
      await element.click();
      return true;
    } catch (cause) {
      if (cause instanceof error.StaleElementReferenceError || cause instanceof error.NoSuchElementError) return false;
      throw cause;
    }
  }, 15_000, `Click: ${selector}`);
}

export async function fill(driver: WebDriver, selector: string, text: string): Promise<void> {
  const element = await visible(driver, selector);
  await element.clear();
  await element.sendKeys(text);
}

export async function audit(driver: WebDriver, selector?: string): Promise<void> {
  await driver.executeScript(axe.source);
  const result = await driver.executeAsyncScript(`
    const done = arguments[arguments.length - 1];
    axe.run(arguments[0] ? { include: [arguments[0]] } : document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] }
    }).then(r => done({ violations: r.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) }),
      e => done({ error: String(e) }));
  `, selector ?? null);
  expect(result).toEqual({ violations: [] });
}
