import { createWriteStream, readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import type { Archiver } from "archiver";

type ArchiverFactory = (
  format: string,
  options?: { zlib?: { level: number } },
) => Archiver;

const require = createRequire(import.meta.url);
const archiverMod = require("archiver") as ArchiverFactory | { default: ArchiverFactory };
const archiver: ArchiverFactory =
  typeof archiverMod === "function" ? archiverMod : archiverMod.default;

const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as { version: string };
const dist = resolve("dist");
if (!existsSync(resolve(dist, "manifest.json"))) {
  console.error("dist/manifest.json missing — run npm run build first");
  process.exit(1);
}

const outName = `morris-peoplesoft-utilities-v${pkg.version}.zip`;
const outPath = resolve(outName);
const output = createWriteStream(outPath);
const archive = archiver("zip", { zlib: { level: 9 } });

await new Promise<void>((resolvePromise, reject) => {
  output.on("close", () => resolvePromise());
  archive.on("error", reject);
  archive.pipe(output);
  archive.directory(dist, false);
  void archive.finalize();
});

console.log(`Wrote ${outName} (${archive.pointer()} bytes)`);
