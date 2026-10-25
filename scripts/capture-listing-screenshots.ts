/**
 * Refresh listing screenshots 01, 04, 05 while keeping 02 (Favorites) and 03 (Page Info).
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { LIVE_CAPTURES_MARKER } from "./validate-store-screenshots.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const shotDir = resolve(root, "store/assets/screenshots");

function md5(path: string): string {
  return createHash("md5").update(readFileSync(path)).digest("hex");
}

function run(cmd: string, args: string[], env?: Record<string, string>) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const keep = ["02-favorites.png", "03-page-info.png"] as const;
const before: Record<string, string> = {};
for (const name of keep) {
  const p = resolve(shotDir, name);
  if (!existsSync(p)) {
    console.error(`Missing ${p}`);
    process.exit(1);
  }
  before[name] = md5(p);
}

run("npm", ["run", "build"]);
run("npx", ["tsx", "scripts/generate-store-assets.ts"], {
  GENERATE_STORE_ONLY:
    "screenshots/01-utilities-bar.png,screenshots/04-field-inspector.png,screenshots/05-options.png",
});

for (const name of keep) {
  const after = md5(resolve(shotDir, name));
  if (after !== before[name]) {
    console.error(`${name} changed unexpectedly — restore from git`);
    process.exit(1);
  }
}

console.log("Listing screenshots 01, 04, 05 updated; 02 and 03 unchanged.");
writeFileSync(
  resolve(root, LIVE_CAPTURES_MARKER),
  `capture-listing ${new Date().toISOString()}\n`,
);
