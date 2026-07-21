/**
 * Generate extension toolbar icons (16/32/48/128) matching store brand:
 * navy field, gold rails, "MPU" mark.
 */
import { PNG } from "pngjs";
import { writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const NAVY: [number, number, number] = [31, 58, 77];
const NAVY_DEEP: [number, number, number] = [23, 48, 65];
const GOLD: [number, number, number] = [196, 160, 53];
const GOLD_LITE: [number, number, number] = [240, 213, 106];
const CREAM: [number, number, number] = [244, 247, 250];

function setPx(png: PNG, x: number, y: number, c: [number, number, number]) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * y + x) << 2;
  png.data[i] = c[0];
  png.data[i + 1] = c[1];
  png.data[i + 2] = c[2];
  png.data[i + 3] = 255;
}

function fill(png: PNG, c: [number, number, number], x0: number, y0: number, x1: number, y1: number) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) setPx(png, x, y, c);
  }
}

/** 3×5 uppercase glyphs for M/P/U (and a few extras). */
const GLYPHS: Record<string, string[]> = {
  M: ["# #", "###", "###", "# #", "# #"],
  P: ["## ", "# #", "## ", "#  ", "#  "],
  U: ["# #", "# #", "# #", "# #", "## "],
};

function drawGlyph(
  png: PNG,
  ch: string,
  ox: number,
  oy: number,
  scale: number,
  color: [number, number, number],
) {
  const rows = GLYPHS[ch];
  if (!rows) return;
  for (let gy = 0; gy < rows.length; gy++) {
    const row = rows[gy];
    for (let gx = 0; gx < row.length; gx++) {
      if (row[gx] !== "#") continue;
      fill(
        png,
        color,
        ox + gx * scale,
        oy + gy * scale,
        ox + (gx + 1) * scale,
        oy + (gy + 1) * scale,
      );
    }
  }
}

function makeIcon(size: number): Buffer {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    const t = y / Math.max(1, size - 1);
    const c: [number, number, number] = [
      Math.round(NAVY[0] + (NAVY_DEEP[0] - NAVY[0]) * t),
      Math.round(NAVY[1] + (NAVY_DEEP[1] - NAVY[1]) * t),
      Math.round(NAVY[2] + (NAVY_DEEP[2] - NAVY[2]) * t),
    ];
    fill(png, c, 0, y, size, y + 1);
  }

  const rail = Math.max(2, Math.round(size * 0.06));
  fill(png, GOLD, 0, 0, size, rail);
  fill(png, GOLD, 0, size - rail, size, size);

  if (size >= 32) {
    const scale = size >= 128 ? 5 : size >= 48 ? 2 : 1;
    const glyphW = 3 * scale;
    const gap = Math.max(1, Math.round(scale * 0.6));
    const wordW = glyphW * 3 + gap * 2;
    const ox = Math.floor((size - wordW) / 2);
    const oy = Math.floor(size * 0.28);
    drawGlyph(png, "M", ox, oy, scale, CREAM);
    drawGlyph(png, "P", ox + glyphW + gap, oy, scale, CREAM);
    drawGlyph(png, "U", ox + (glyphW + gap) * 2, oy, scale, CREAM);

    const barH = Math.max(2, Math.round(size * 0.07));
    const barW = Math.round(size * 0.55);
    const bx = Math.floor((size - barW) / 2);
    const by = Math.floor(size * 0.72);
    fill(png, GOLD_LITE, bx, by, bx + barW, by + barH);
  } else {
    // 16px: gold bar only — letters won't read
    const barH = 2;
    const barW = 10;
    const bx = Math.floor((size - barW) / 2);
    const by = Math.floor(size * 0.7);
    fill(png, GOLD_LITE, bx, by, bx + barW, by + barH);
  }

  return PNG.sync.write(png);
}

const out = resolve("public/icons");
mkdirSync(out, { recursive: true });

// Prefer the high-fidelity 128 store icon when present (from generate:store-assets)
const storeIcon = resolve("store/assets/store-icon-128.png");
for (const size of [16, 32, 48, 128]) {
  const dest = resolve(out, `icon${size}.png`);
  if (size === 128 && existsSync(storeIcon)) {
    copyFileSync(storeIcon, dest);
  } else {
    writeFileSync(dest, makeIcon(size));
  }
}

console.log("Generated icons in public/icons");
