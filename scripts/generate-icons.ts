import { PNG } from "pngjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

function makeIcon(size: number): Buffer {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (size * y + x) << 2;
      const edge = x < size * 0.08 || y < size * 0.08 || x > size * 0.92 || y > size * 0.92;
      const gold = y > size * 0.72 && y < size * 0.82;
      if (edge) {
        png.data[i] = 196;
        png.data[i + 1] = 160;
        png.data[i + 2] = 53;
        png.data[i + 3] = 255;
      } else if (gold) {
        png.data[i] = 240;
        png.data[i + 1] = 213;
        png.data[i + 2] = 106;
        png.data[i + 3] = 255;
      } else {
        png.data[i] = 31;
        png.data[i + 1] = 58;
        png.data[i + 2] = 77;
        png.data[i + 3] = 255;
      }
    }
  }
  return PNG.sync.write(png);
}

const out = resolve("public/icons");
mkdirSync(out, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  writeFileSync(resolve(out, `icon${size}.png`), makeIcon(size));
}
console.log("Generated icons in public/icons");
