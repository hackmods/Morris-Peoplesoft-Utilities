import { createWriteStream, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ZipArchive } from "archiver";
import { auditBrowserBuilds } from "./audit-browsers";

const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as { version: string };
const target = process.argv[2] ?? "chrome";
if (target !== "chrome" && target !== "firefox") throw new Error(`Unknown browser: ${target}`);
auditBrowserBuilds();
const dist = resolve(target === "chrome" ? "dist" : "dist/firefox");
if (!existsSync(resolve(dist, "manifest.json"))) {
  console.error("dist/manifest.json missing — run npm run build first");
  process.exit(1);
}

const outName = `morris-peoplesoft-utilities-${target}-v${pkg.version}.zip`;
const outPath = resolve(outName);
const output = createWriteStream(outPath);
const archive = new ZipArchive({ zlib: { level: 9 } });

await new Promise<void>((resolvePromise, reject) => {
  output.on("close", () => resolvePromise());
  output.on("error", reject);
  archive.on("error", reject);
  archive.pipe(output);
  // Firefox is built below dist/ for compatibility with existing Chrome paths.
  // Never include the Firefox tree in the Chrome upload.
  archive.glob("**/*", { cwd: dist, ignore: target === "chrome" ? ["firefox/**"] : [], dot: true });
  archive.file(resolve("LICENSE"), { name: "LICENSE" });
  archive.file(resolve("NOTICE"), { name: "NOTICE" });
  void archive.finalize();
});

console.log(`Wrote ${outName} (${archive.pointer()} bytes)`);
