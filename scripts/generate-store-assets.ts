import { PNG } from "pngjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

function fill(png: PNG, color: [number, number, number], x0 = 0, y0 = 0, x1 = png.width, y1 = png.height) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (png.width * y + x) << 2;
      png.data[i] = color[0];
      png.data[i + 1] = color[1];
      png.data[i + 2] = color[2];
      png.data[i + 3] = 255;
    }
  }
}

function rect(png: PNG, color: [number, number, number], x: number, y: number, w: number, h: number) {
  fill(png, color, x, y, Math.min(png.width, x + w), Math.min(png.height, y + h));
}

function writePng(path: string, width: number, height: number, draw: (png: PNG) => void) {
  const png = new PNG({ width, height });
  draw(png);
  writeFileSync(path, PNG.sync.write(png));
}

const store = resolve("store/assets");
mkdirSync(store, { recursive: true });
mkdirSync(resolve("store/assets/screenshots"), { recursive: true });

// Small promo 440x280
writePng(resolve(store, "promo-small-440x280.png"), 440, 280, (png) => {
  fill(png, [31, 58, 77]);
  rect(png, [196, 160, 53], 0, 220, 440, 12);
  rect(png, [243, 246, 248], 40, 60, 360, 120);
});

// Marquee 1400x560
writePng(resolve(store, "promo-marquee-1400x560.png"), 1400, 560, (png) => {
  fill(png, [23, 48, 65]);
  rect(png, [196, 160, 53], 0, 480, 1400, 16);
  rect(png, [243, 246, 248], 80, 120, 700, 280);
  rect(png, [36, 72, 96], 820, 140, 480, 240);
});

// Store icon 128
writePng(resolve(store, "store-icon-128.png"), 128, 128, (png) => {
  fill(png, [31, 58, 77]);
  rect(png, [196, 160, 53], 0, 0, 128, 8);
  rect(png, [196, 160, 53], 0, 120, 128, 8);
  rect(png, [240, 213, 106], 24, 90, 80, 10);
});

const shots = [
  "01-utilities-bar.png",
  "02-favorites.png",
  "03-page-info.png",
  "04-field-inspector.png",
  "05-options.png",
];

for (const name of shots) {
  writePng(resolve(store, "screenshots", name), 1280, 800, (png) => {
    fill(png, [238, 242, 245]);
    rect(png, [31, 58, 77], 0, 0, 1280, 56);
    rect(png, [196, 160, 53], 0, 56, 1280, 6);
    rect(png, [255, 255, 255], 80, 120, 1120, 560);
    rect(png, [31, 58, 77], 100, 150, 200, 36);
  });
}

console.log("Generated store assets under store/assets");
