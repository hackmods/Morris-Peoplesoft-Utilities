import { createWriteStream, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ZipArchive } from "archiver";
import { safePackPath, validatePack } from "./agent-pack.js";

const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as { version: string };
// Validate current sources and generated exports before opening the output ZIP.
// Explicit files prevent private/local/untracked content from entering a release.
const { catalog, files } = validatePack();

const outName = `morris-peoplesoft-agents-v${pkg.version}.zip`;
const outPath = resolve(outName);
const output = createWriteStream(outPath);
const archive = new ZipArchive({ zlib: { level: 9 } });

await new Promise<void>((resolvePromise, reject) => {
  output.on("close", () => resolvePromise());
  output.on("error", reject);
  archive.on("error", reject);
  archive.pipe(output);
  for (const path of files) archive.file(safePackPath(process.cwd(), path), { name: `agents/${path}` });
  archive.file(resolve("LICENSE"), { name: "LICENSE" });
  archive.file(resolve("NOTICE"), { name: "NOTICE" });
  void archive.finalize();
});

console.log(`Wrote ${outName} (${archive.pointer()} bytes), prompt content ${catalog.version}`);
