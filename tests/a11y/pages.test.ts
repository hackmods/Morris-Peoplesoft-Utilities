import { describe, expect, it } from "vitest";
import axe from "axe-core";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadHtml(relativePath: string, title: string): void {
  const html = readFileSync(resolve(relativePath), "utf8");
  const langMatch = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
  document.documentElement.lang = langMatch?.[1] ?? "en";
  document.title = title;
  const titleEl = document.querySelector("title");
  if (!titleEl) {
    const t = document.createElement("title");
    t.textContent = title;
    document.head.appendChild(t);
  } else {
    titleEl.textContent = title;
  }
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  document.body.innerHTML = bodyMatch?.[1] ?? html;
  document.querySelectorAll("script").forEach((s) => s.remove());
}

describe("AODA / axe audits for extension pages", () => {
  it("popup markup has no serious axe violations", async () => {
    loadHtml("src/ui/popup/popup.html", "Morris PeopleSoft Utilities");
    const results = await axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      rules: {
        "color-contrast": { enabled: false },
      },
    });
    const serious = results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    );
    expect(serious).toEqual([]);
  });

  it("options markup has no serious axe violations", async () => {
    loadHtml("src/ui/options/options.html", "MPU Options");
    const results = await axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      rules: {
        "color-contrast": { enabled: false },
      },
    });
    const serious = results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    );
    expect(serious).toEqual([]);
  });
});
