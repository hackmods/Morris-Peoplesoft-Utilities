import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("repository smoke — Store & packaging prerequisites", () => {
  const required = [
    "package.json",
    "docs/privacy.md",
    "docs/aoda.md",
    "store/listing.md",
    "store/privacy-practices.md",
    "store/SUBMISSION_CHECKLIST.md",
    "store/assets/promo-small-440x280.png",
    "store/assets/store-icon-128.png",
    "store/assets/screenshots/01-utilities-bar.png",
    "public/icons/icon16.png",
    "public/icons/icon128.png",
    "src/background/service-worker.ts",
    "src/content/index.ts",
    "src/ui/popup/popup.html",
    "src/ui/options/options.html",
  ];

  it.each(required)("has %s", (path) => {
    expect(existsSync(resolve(path))).toBe(true);
  });

  it("package scripts include full automated gates", () => {
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    for (const key of [
      "lint",
      "test",
      "test:unit",
      "test:coverage",
      "audit",
      "audit:a11y",
      "audit:store",
      "audit:compliance",
      "build",
      "release:check",
    ]) {
      expect(pkg.scripts[key]).toBeTruthy();
    }
  });

  it("privacy policy denies credentials and telemetry", () => {
    const privacy = readFileSync(resolve("docs/privacy.md"), "utf8").toLowerCase();
    expect(privacy).toContain("no passwords");
    expect(privacy).toMatch(/no analytics|no telemetry/);
  });
});

describe("built extension smoke (when dist present)", () => {
  const manifestPath = resolve("dist/manifest.json");
  const hasDist = existsSync(manifestPath);

  it.skipIf(!hasDist)("manifest is MV3 without legacy key", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      manifest_version: number;
      key?: string;
      permissions: string[];
      background: { service_worker: string };
      action: { default_popup: string };
      options_page: string;
      content_scripts: Array<{ js: string[]; css?: string[] }>;
      web_accessible_resources: Array<{ matches: string[] }>;
    };
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.key).toBeUndefined();
    expect(manifest.permissions).toEqual(["storage", "sidePanel", "tabs"]);
    expect(existsSync(resolve("dist", manifest.background.service_worker))).toBe(true);
    expect(existsSync(resolve("dist", manifest.action.default_popup))).toBe(true);
    expect(existsSync(resolve("dist", manifest.options_page))).toBe(true);
    expect(
      existsSync(resolve("dist", (manifest as { side_panel?: { default_path: string } }).side_panel?.default_path || "")),
    ).toBe(true);
    expect(existsSync(resolve("dist", manifest.content_scripts[0].js[0]))).toBe(true);
    for (const entry of manifest.web_accessible_resources) {
      for (const pattern of entry.matches) {
        // Chrome WAR matches are origin-only; path must be exactly /*.
        expect(pattern).toMatch(/^[a-z*]+:\/\/[^/]+\/\*$/i);
      }
    }
  });

  it.skipIf(!hasDist)("packaged HTML references relative assets", () => {
    const popup = readFileSync(resolve("dist/popup.html"), "utf8");
    expect(popup).toContain('src="assets/');
    expect(popup).not.toContain('src="/assets/');
  });

  it.skipIf(!hasDist)("content.js is a classic script without ESM imports", () => {
    const content = readFileSync(resolve("dist/content.js"), "utf8");
    // Chrome injects content_scripts as classic scripts unless type:module.
    expect(content).not.toMatch(/^\s*import\b/m);
    expect(content).toMatch(/^\s*(?:["']use strict["'];\s*)?\(/);
  });
});
