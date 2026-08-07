/**
 * Import live PeopleSoft/MPU captures into store/assets/screenshots/.
 *
 * Drop PNG/JPEG files into store/assets/screenshots/_inbox/ then run:
 *   npm run import:store-screenshots
 *
 * Recognized basenames (case-insensitive) map to Store slots:
 *   01-utilities-bar, 02-favorites, 03-page-info, 04-field-inspector, 05-options
 * Also accepts aliases: utilities-bar, favorites, page-info, field-inspector, options,
 * inspect, inspector, bar, opts, options-features.
 *
 * Images are letterboxed to exactly 1280×800 PNG (Chrome Web Store preferred size).
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const shotDir = resolve(root, "store/assets/screenshots");
const inboxDir = resolve(shotDir, "_inbox");
const TARGET_W = 1280;
const TARGET_H = 800;

const SLOT_ALIASES: Record<string, string> = {
  "01": "01-utilities-bar.png",
  "01-utilities-bar": "01-utilities-bar.png",
  "utilities-bar": "01-utilities-bar.png",
  utilities: "01-utilities-bar.png",
  bar: "01-utilities-bar.png",
  roles: "01-utilities-bar.png",
  "02": "02-favorites.png",
  "02-favorites": "02-favorites.png",
  favorites: "02-favorites.png",
  shortcuts: "02-favorites.png",
  "03": "03-page-info.png",
  "03-page-info": "03-page-info.png",
  "page-info": "03-page-info.png",
  pageinfo: "03-page-info.png",
  "04": "04-field-inspector.png",
  "04-field-inspector": "04-field-inspector.png",
  "field-inspector": "04-field-inspector.png",
  inspect: "04-field-inspector.png",
  inspector: "04-field-inspector.png",
  "05": "05-options.png",
  "05-options": "05-options.png",
  options: "05-options.png",
  "options-features": "05-options.png",
  opts: "05-options.png",
  features: "05-options.png",
};

function normalizeKey(name: string): string {
  return basename(name, extname(name))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function findFfmpeg(): string | null {
  for (const c of [process.env.FFMPEG_PATH, "ffmpeg", "/usr/bin/ffmpeg"].filter(Boolean) as string[]) {
    const r = spawnSync(c, ["-version"], { encoding: "utf8" });
    if (r.status === 0) return c;
  }
  return null;
}

function pngDims(path: string): { w: number; h: number } {
  const buf = readFileSync(path);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function letterbox(ffmpeg: string, src: string, dest: string): void {
  // Scale to fit inside 1280x800, pad with navy (#1f3a4d) to exact Store size.
  const filter =
    `scale=${TARGET_W}:${TARGET_H}:force_original_aspect_ratio=decrease,` +
    `pad=${TARGET_W}:${TARGET_H}:(ow-iw)/2:(oh-ih)/2:color=0x1f3a4d`;
  const result = spawnSync(
    ffmpeg,
    ["-y", "-i", src, "-vf", filter, "-frames:v", "1", dest],
    { encoding: "utf8" },
  );
  if (result.status !== 0 || !existsSync(dest)) {
    throw new Error(`ffmpeg failed for ${src}: ${result.stderr || result.error}`);
  }
  const dims = pngDims(dest);
  if (dims.w !== TARGET_W || dims.h !== TARGET_H) {
    throw new Error(`Unexpected size for ${dest}: ${dims.w}x${dims.h}`);
  }
}

function main() {
  mkdirSync(inboxDir, { recursive: true });
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) {
    console.error("ffmpeg not found — install ffmpeg or set FFMPEG_PATH");
    process.exit(1);
  }

  const files = readdirSync(inboxDir).filter((f) => {
    if (f.startsWith(".")) return false;
    if (f === "README.md") return false;
    const ext = extname(f).toLowerCase();
    return [".png", ".jpg", ".jpeg", ".webp"].includes(ext);
  });

  if (!files.length) {
    console.error(
      `No images in ${inboxDir}\n` +
        "Drop PNG/JPEG captures there (see store/assets/screenshots/_inbox/README.md), then re-run.",
    );
    process.exit(1);
  }

  const imported: string[] = [];
  const processedDir = resolve(inboxDir, "_processed");
  mkdirSync(processedDir, { recursive: true });

  for (const file of files) {
    const key = normalizeKey(file);
    const slot = SLOT_ALIASES[key];
    if (!slot) {
      console.warn(`Skipping unrecognized filename: ${file} (key=${key})`);
      continue;
    }
    const src = resolve(inboxDir, file);
    if (!statSync(src).isFile()) continue;
    const dest = resolve(shotDir, slot);
    const tmp = resolve(inboxDir, `.tmp-${slot}`);
    letterbox(ffmpeg, src, tmp);
    // Atomic-ish replace
    if (existsSync(dest)) rmSync(dest);
    renameSync(tmp, dest);
    // Keep original out of inbox so re-runs are idempotent
    const archived = resolve(processedDir, file);
    if (existsSync(archived)) rmSync(archived);
    renameSync(src, archived);
    imported.push(`${file} → screenshots/${slot} (${TARGET_W}x${TARGET_H})`);
    console.log(`Imported ${imported[imported.length - 1]}`);
  }

  if (!imported.length) {
    console.error("No recognized screenshots imported. Rename files to match slot aliases.");
    process.exit(1);
  }

  const stamp = resolve(shotDir, "LIVE_CAPTURES.md");
  writeFileSync(
    stamp,
    `# Live Store screenshots\n\n` +
      `Imported ${new Date().toISOString().slice(0, 10)} via \`npm run import:store-screenshots\`.\n\n` +
      imported.map((l) => `- ${l}`).join("\n") +
      `\n\nThese replace HTML mockups for Chrome Web Store listing upload.\n` +
      `CI will not overwrite them unless \`FORCE_STORE_SCREENSHOTS=1\`.\n`,
    "utf8",
  );
  console.log(`Wrote ${imported.length} screenshot(s). Updated LIVE_CAPTURES.md`);
}

main();
