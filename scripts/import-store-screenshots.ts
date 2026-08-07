/**
 * Import live Chrome Web Store screenshots from store/incoming/ into store/assets/screenshots/.
 * Resizes to 1280×800 with letterboxing (navy) when aspect ratio differs.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import {
  LIVE_CAPTURES_MARKER,
  STORE_SCREENSHOT_FILES,
  STORE_SCREENSHOT_HEIGHT,
  STORE_SCREENSHOT_WIDTH,
} from "./validate-store-screenshots.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const incomingDir = resolve(root, "store/incoming");
const outDir = resolve(root, "store/assets/screenshots");

const NAVY: [number, number, number] = [31, 58, 77];

const ALIASES: Record<string, (typeof STORE_SCREENSHOT_FILES)[number]> = {
  "01-utilities-bar.png": "01-utilities-bar.png",
  "utilities-bar.png": "01-utilities-bar.png",
  "01.png": "01-utilities-bar.png",
  "02-favorites.png": "02-favorites.png",
  "favorites.png": "02-favorites.png",
  "02.png": "02-favorites.png",
  "03-page-info.png": "03-page-info.png",
  "page-info.png": "03-page-info.png",
  "03.png": "03-page-info.png",
  "04-field-inspector.png": "04-field-inspector.png",
  "field-inspector.png": "04-field-inspector.png",
  "04.png": "04-field-inspector.png",
  "05-options.png": "05-options.png",
  "options.png": "05-options.png",
  "05.png": "05-options.png",
};

function fillRect(png: PNG, color: [number, number, number]) {
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = color[0];
    png.data[i + 1] = color[1];
    png.data[i + 2] = color[2];
    png.data[i + 3] = 255;
  }
}

function resizeLetterbox(src: PNG): PNG {
  const out = new PNG({ width: STORE_SCREENSHOT_WIDTH, height: STORE_SCREENSHOT_HEIGHT });
  fillRect(out, NAVY);

  const scale = Math.min(
    STORE_SCREENSHOT_WIDTH / src.width,
    STORE_SCREENSHOT_HEIGHT / src.height,
  );
  const dw = Math.max(1, Math.round(src.width * scale));
  const dh = Math.max(1, Math.round(src.height * scale));
  const ox = Math.floor((STORE_SCREENSHOT_WIDTH - dw) / 2);
  const oy = Math.floor((STORE_SCREENSHOT_HEIGHT - dh) / 2);

  for (let y = 0; y < dh; y++) {
    const sy = Math.min(src.height - 1, Math.floor((y / dh) * src.height));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x / dw) * src.width));
      const si = (src.width * sy + sx) << 2;
      const oi = (out.width * (oy + y) + (ox + x)) << 2;
      out.data[oi] = src.data[si];
      out.data[oi + 1] = src.data[si + 1];
      out.data[oi + 2] = src.data[si + 2];
      out.data[oi + 3] = 255;
    }
  }
  return out;
}

function importOne(fileName: string): boolean {
  const key = basename(fileName).toLowerCase();
  const destName = ALIASES[key];
  if (!destName) {
    console.warn(`Skipping unrecognized file: ${fileName} (see store/incoming/README.md)`);
    return false;
  }
  const srcPath = resolve(incomingDir, fileName);
  const buf = readFileSync(srcPath);
  const src = PNG.sync.read(buf);
  let out: PNG;
  if (src.width === STORE_SCREENSHOT_WIDTH && src.height === STORE_SCREENSHOT_HEIGHT) {
    out = src;
  } else {
    console.log(
      `Resizing ${fileName} from ${src.width}×${src.height} → ${STORE_SCREENSHOT_WIDTH}×${STORE_SCREENSHOT_HEIGHT}`,
    );
    out = resizeLetterbox(src);
  }
  const destPath = resolve(outDir, destName);
  writeFileSync(destPath, PNG.sync.write(out));
  console.log(`Wrote store/assets/screenshots/${destName}`);
  return true;
}

function main() {
  if (!existsSync(incomingDir)) {
    mkdirSync(incomingDir, { recursive: true });
    console.error("Created store/incoming/ — add PNG files and re-run.");
    process.exit(1);
  }
  const incoming = readdirSync(incomingDir).filter((f) => /\.png$/i.test(f));
  if (!incoming.length) {
    console.error("No PNG files in store/incoming/ — see store/incoming/README.md");
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });
  let count = 0;
  for (const f of incoming) {
    if (importOne(f)) count += 1;
  }
  if (!count) {
    console.error("No files imported — check naming in store/incoming/README.md");
    process.exit(1);
  }
  writeFileSync(resolve(root, LIVE_CAPTURES_MARKER), `imported ${new Date().toISOString()}\n`);
  console.log(`Imported ${count} screenshot(s). Run npm run audit:store to verify.`);
}

main();
