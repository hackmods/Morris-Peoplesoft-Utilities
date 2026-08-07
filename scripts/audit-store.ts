import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const errors: string[] = [];
const warnings: string[] = [];

function need(path: string, label: string) {
  if (!existsSync(resolve(path))) errors.push(`Missing ${label}: ${path}`);
}

function pngDimensions(path: string): { width: number; height: number } | null {
  const bytes = readFileSync(resolve(path));
  const signature = "89504e470d0a1a0a";
  if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== signature) {
    errors.push(`Store image must be PNG: ${path}`);
    return null;
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function needPng(path: string, label: string, width: number, height: number) {
  need(path, label);
  if (!existsSync(resolve(path))) return;
  const dimensions = pngDimensions(path);
  if (dimensions && (dimensions.width !== width || dimensions.height !== height)) {
    errors.push(
      `${label} must be ${width}x${height}, got ${dimensions.width}x${dimensions.height}: ${path}`,
    );
  }
}

need("store/listing.md", "listing copy");
need("store/privacy-practices.md", "privacy practices");
need("store/SUBMISSION_CHECKLIST.md", "submission checklist");
needPng("store/assets/promo-small-440x280.png", "small promo", 440, 280);
needPng("store/assets/promo-marquee-1400x560.png", "marquee promo", 1400, 560);
needPng("store/assets/store-icon-128.png", "store icon", 128, 128);
need("docs/privacy.md", "privacy policy");
need("public/icons/icon128.png", "extension icon");

const screenshotDir = resolve("store/assets/screenshots");
if (!existsSync(screenshotDir)) {
  errors.push("Missing screenshots directory: store/assets/screenshots");
} else {
  const screenshots = readdirSync(screenshotDir)
    .filter((name) => name.toLowerCase().endsWith(".png"))
    .sort();
  if (screenshots.length < 1 || screenshots.length > 5) {
    errors.push(`Chrome Web Store requires 1–5 screenshots; found ${screenshots.length}`);
  }
  for (const name of screenshots) {
    const path = `store/assets/screenshots/${name}`;
    const dimensions = pngDimensions(path);
    if (
      dimensions &&
      !(
        (dimensions.width === 1280 && dimensions.height === 800) ||
        (dimensions.width === 640 && dimensions.height === 400)
      )
    ) {
      errors.push(
        `Screenshot must be 1280x800 or 640x400, got ${dimensions.width}x${dimensions.height}: ${path}`,
      );
    }
  }
}

const manifestPath = resolve("dist/manifest.json");
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    manifest_version: number;
    permissions?: string[];
    key?: string;
    web_accessible_resources?: Array<{ matches?: string[] }>;
    content_security_policy?: { extension_pages?: string };
  };
  if (manifest.manifest_version !== 3) errors.push("manifest_version must be 3");
  if (manifest.key) errors.push("Do not ship legacy private key in manifest");
  const perms = manifest.permissions ?? [];
  const allowed = new Set(["storage", "clipboardWrite", "tabs", "sidePanel"]);
  for (const p of perms) {
    if (!allowed.has(p)) warnings.push(`Unexpected permission: ${p}`);
  }
  const war = manifest.web_accessible_resources ?? [];
  for (const entry of war) {
    for (const pattern of entry.matches ?? []) {
      // Chrome rejects WAR match patterns whose path is not exactly /*.
      // See: https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources
      if (!/^[a-z*]+:\/\/[^/]+\/\*$/i.test(pattern) && pattern !== "<all_urls>") {
        errors.push(
          `web_accessible_resources match must be origin-only (path /*): ${pattern}`,
        );
      }
    }
  }
  const csp = manifest.content_security_policy?.extension_pages ?? "";
  if (/\bunsafe-eval\b/.test(csp)) {
    errors.push("CSP must not allow unsafe-eval");
  }
} else {
  warnings.push("dist/manifest.json not built yet — run build before release");
}

if (errors.length) {
  console.error("Store audit FAILED:");
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log("Store audit passed");
for (const w of warnings) console.warn(` ! ${w}`);
