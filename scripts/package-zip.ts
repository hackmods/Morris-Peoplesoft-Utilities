import { createWriteStream, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import archiver from "archiver";

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
