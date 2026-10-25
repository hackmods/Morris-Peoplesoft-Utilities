import { expect, type Page } from "@playwright/test";
import axe from "axe-core";

/** Real Chromium layout/contrast check; scope injected UI to exclude host markup. */
export async function audit(page: Page, include?: string): Promise<void> {
  await page.evaluate(axe.source);
  const violations = await page.evaluate(async (selector) => {
    const browserAxe = (window as typeof window & { axe: typeof axe }).axe;
    const results = await browserAxe.run(selector ? { include: [selector] } : document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    });
    return results.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) }));
  }, include);
  expect(violations).toEqual([]);
}
