import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createManifest } from "./extension-manifest";

function files(dir: string, base = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    const name = relative(base, path).replaceAll("\\", "/");
    if (name === "firefox") return [];
    return entry.isDirectory() ? files(path, base) : [name];
  }).sort();
}

/** Audit fresh outputs, including byte parity of every shared runtime asset. */
export function auditBrowserBuilds(): void {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  for (const target of ["chrome", "firefox"] as const) {
    const dir = target === "chrome" ? "dist" : "dist/firefox";
    const actual = JSON.parse(readFileSync(resolve(dir, "manifest.json"), "utf8"));
    if (JSON.stringify(actual) !== JSON.stringify(createManifest(target, pkg))) {
      throw new Error(`${target}: stale or unexpected manifest; run npm run build`);
    }
    for (const asset of ["background.js", "content.js", "content.css", "popup.html", "options.html", "sidepanel.html", "inject/field-entry-write.js", "icons/icon128.png"]) {
      readFileSync(resolve(dir, asset));
    }
  }
  const chrome = files(resolve("dist")).filter((name) => name !== "manifest.json");
  const firefox = files(resolve("dist/firefox")).filter((name) => name !== "manifest.json");
  if (JSON.stringify(chrome) !== JSON.stringify(firefox)) throw new Error("Browser build asset lists differ");
  for (const name of chrome) {
    // Source maps embed different output paths and are not executed.
    if (name.endsWith(".map")) continue;
    const hash = (dir: string) => createHash("sha256").update(readFileSync(resolve(dir, name))).digest("hex");
    if (hash("dist") !== hash("dist/firefox")) throw new Error(`Browser runtime assets differ: ${name}`);
  }
  console.log("Chrome/Firefox manifests and shared runtime assets are in parity");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) auditBrowserBuilds();
