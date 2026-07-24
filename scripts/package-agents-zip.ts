import { createWriteStream, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ZipArchive } from "archiver";

const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as { version: string };
const agentsDir = resolve("agents");
if (!existsSync(resolve(agentsDir, "README.md"))) {
  console.error("agents/README.md missing — cannot package agent prompt pack");
  process.exit(1);
}

const outName = `morris-peoplesoft-agents-v${pkg.version}.zip`;
const outPath = resolve(outName);
const output = createWriteStream(outPath);
const archive = new ZipArchive({ zlib: { level: 9 } });

await new Promise<void>((resolvePromise, reject) => {
  output.on("close", () => resolvePromise());
  archive.on("error", reject);
  archive.pipe(output);
  archive.directory(agentsDir, "agents");
  void archive.finalize();
});

console.log(`Wrote ${outName} (${archive.pointer()} bytes)`);
