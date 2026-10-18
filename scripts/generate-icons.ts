/** Generate every Chrome icon size from the approved PeopleSoft artwork. */
import { PNG } from "pngjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const source = PNG.sync.read(readFileSync(resolve("store/assets/mpu-peoplesoft-icon-v5.png")));
if (source.width !== source.height) throw new Error("Icon artwork must be square");

/** Area-average premultiplied colors to preserve transparent antialiased edges. */
function makeIcon(size: number): Buffer {
  const target = new PNG({ width: size, height: size });
  const scale = source.width / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let alpha = 0, red = 0, green = 0, blue = 0;
      const left = x * scale, right = (x + 1) * scale;
      const top = y * scale, bottom = (y + 1) * scale;
      for (let sy = Math.floor(top); sy < Math.ceil(bottom); sy++) {
        for (let sx = Math.floor(left); sx < Math.ceil(right); sx++) {
          const weight = (Math.min(right, sx + 1) - Math.max(left, sx)) *
            (Math.min(bottom, sy + 1) - Math.max(top, sy));
          const i = (sy * source.width + sx) * 4;
          const a = source.data[i + 3] * weight;
          alpha += a;
          red += source.data[i] * a;
          green += source.data[i + 1] * a;
          blue += source.data[i + 2] * a;
        }
      }
      const i = (y * size + x) * 4;
      target.data[i] = alpha ? Math.round(red / alpha) : 0;
      target.data[i + 1] = alpha ? Math.round(green / alpha) : 0;
      target.data[i + 2] = alpha ? Math.round(blue / alpha) : 0;
      target.data[i + 3] = Math.round(alpha / (scale * scale));
    }
  }
  return PNG.sync.write(target);
}
/** Small magnifying-glass glyph for Field Inspector (12–16px display). */
function makeInspectorIcon(color: [number, number, number]): Buffer {
  const size = 16;
  const png = new PNG({ width: size, height: size });
  // Transparent background
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 0;
    png.data[i + 1] = 0;
    png.data[i + 2] = 0;
    png.data[i + 3] = 0;
  }

  const setRgba = (x: number, y: number, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (size * y + x) << 2;
    png.data[i] = color[0];
    png.data[i + 1] = color[1];
    png.data[i + 2] = color[2];
    png.data[i + 3] = a;
  };

  const cx = 6;
  const cy = 6;
  const rOuter = 4;
  const rInner = 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= rOuter + 0.6 && d >= rInner - 0.2) setRgba(x, y);
    }
  }
  // Handle
  for (let i = 0; i < 5; i++) {
    setRgba(9 + i, 9 + i);
    setRgba(10 + i, 9 + i);
    setRgba(9 + i, 10 + i);
  }

  return PNG.sync.write(png);
}

const out = resolve("public/icons");
mkdirSync(out, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const image = makeIcon(size);
  writeFileSync(resolve(out, `icon${size}.png`), image);
  if (size === 128) writeFileSync(resolve("store/assets/store-icon-128.png"), image);
}
const ORANGE: [number, number, number] = [255, 92, 0];
const GREEN: [number, number, number] = [82, 82, 82];
const YELLOW: [number, number, number] = [255, 92, 0];
writeFileSync(resolve(out, "field-inspector-orange.png"), makeInspectorIcon(ORANGE));
writeFileSync(resolve(out, "field-inspector-green.png"), makeInspectorIcon(GREEN));
writeFileSync(resolve(out, "field-inspector-yellow.png"), makeInspectorIcon(YELLOW));

console.log("Generated icons in public/icons");
