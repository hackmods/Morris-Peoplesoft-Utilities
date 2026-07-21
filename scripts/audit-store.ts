import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const errors: string[] = [];
const warnings: string[] = [];

function need(path: string, label: string) {
  if (!existsSync(resolve(path))) errors.push(`Missing ${label}: ${path}`);
}

need("store/listing.md", "listing copy");
need("store/privacy-practices.md", "privacy practices");
need("store/SUBMISSION_CHECKLIST.md", "submission checklist");
need("store/assets/promo-small-440x280.png", "small promo");
need("store/assets/store-icon-128.png", "store icon");
need("store/assets/screenshots/01-utilities-bar.png", "screenshot");
need("docs/privacy.md", "privacy policy");
need("public/icons/icon128.png", "extension icon");

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
  const allowed = new Set(["storage", "clipboardWrite", "tabs"]);
  for (const p of perms) {
    if (!allowed.has(p)) warnings.push(`Unexpected permission: ${p}`);
  }
  const war = manifest.web_accessible_resources ?? [];
  for (const entry of war) {
    if (entry.matches?.includes("*://*/*")) {
      errors.push("web_accessible_resources must not use *://*/*");
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
