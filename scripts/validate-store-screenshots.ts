import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** MD5 of HTML-mock captures from `npm run generate:store-assets` (do not ship mocks to CWS). */
export const MOCK_SCREENSHOT_MD5: Record<string, string> = {
  "01-utilities-bar.png": "3719c44f9fa2ddc3d6e50ee712547aa2",
  "02-favorites.png": "26a7dd005d67acefc5d2ad864427992d",
  "03-page-info.png": "63ff5739a6ef210687e6497337e4f3d4",
  "04-field-inspector.png": "334401032fcfbc7bf3844db649d3ef77",
  "05-options.png": "895d0d06cd78870453fcf38b51703cd6",
};

export const STORE_SCREENSHOT_FILES = [
  "01-utilities-bar.png",
  "02-favorites.png",
  "03-page-info.png",
  "04-field-inspector.png",
  "05-options.png",
] as const;

export const STORE_SCREENSHOT_WIDTH = 1280;
export const STORE_SCREENSHOT_HEIGHT = 800;

export const LIVE_CAPTURES_MARKER = "store/assets/screenshots/.live-captures";

export type StoreScreenshotIssue = { level: "error" | "warning"; message: string };

function pngDimensions(path: string): { w: number; h: number } {
  const buf = readFileSync(path);
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) {
    throw new Error("not a PNG");
  }
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function md5File(path: string): string {
  return createHash("md5").update(readFileSync(path)).digest("hex");
}

export function validateStoreScreenshots(root = resolve(".")): StoreScreenshotIssue[] {
  const issues: StoreScreenshotIssue[] = [];
  const shotDir = resolve(root, "store/assets/screenshots");

  for (const name of STORE_SCREENSHOT_FILES) {
    const path = resolve(shotDir, name);
    if (!existsSync(path)) {
      issues.push({ level: "error", message: `Missing store screenshot: store/assets/screenshots/${name}` });
      continue;
    }
    try {
      const { w, h } = pngDimensions(path);
      if (w !== STORE_SCREENSHOT_WIDTH || h !== STORE_SCREENSHOT_HEIGHT) {
        issues.push({
          level: "error",
          message: `Screenshot ${name} must be ${STORE_SCREENSHOT_WIDTH}×${STORE_SCREENSHOT_HEIGHT} (got ${w}×${h})`,
        });
      }
    } catch {
      issues.push({ level: "error", message: `Screenshot ${name} is not a valid PNG` });
    }

    const mock = MOCK_SCREENSHOT_MD5[name];
    if (mock && md5File(path) === mock) {
      issues.push({
        level: "warning",
        message: `Screenshot ${name} still matches generated mock — replace with a live PeopleSoft capture before Chrome Web Store upload`,
      });
    }
  }

  if (!existsSync(resolve(root, LIVE_CAPTURES_MARKER))) {
    const mockCount = STORE_SCREENSHOT_FILES.filter((name) => {
      const path = resolve(shotDir, name);
      if (!existsSync(path)) return false;
      const mock = MOCK_SCREENSHOT_MD5[name];
      return mock && md5File(path) === mock;
    }).length;
    if (mockCount > 0) {
      issues.push({
        level: "warning",
        message:
          `${mockCount} listing screenshot(s) are still mocks. Copy live captures into store/incoming/ and run npm run import:store-screenshots, or add store/assets/screenshots/.live-captures after replacing files`,
      });
    }
  }

  return issues;
}
