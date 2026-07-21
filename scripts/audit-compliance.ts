import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const errors: string[] = [];

function walk(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist" || name === ".reference" || name === ".git") {
        continue;
      }
      walk(p, files);
    } else if (/\.(ts|js|tsx|jsx|html|md)$/.test(name)) {
      files.push(p);
    }
  }
  return files;
}

const files = walk(resolve("src")).concat(walk(resolve("scripts")));

const forbidden: Array<{ re: RegExp; msg: string }> = [
  { re: /password\s*[:=]/i, msg: "credential field patterns" },
  { re: /localStorage\.setItem\(\s*['"]password/i, msg: "password localStorage" },
  { re: /google-analytics|googletagmanager|gtag\(/i, msg: "telemetry / analytics" },
  {
    re: /https?:\/\/(?!github\.com|developer\.chrome\.com|clients2\.google\.com)[a-z0-9.-]+\/(collect|beacon|telemetry)/i,
    msg: "telemetry endpoint",
  },
];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  if (file.includes("audit-compliance")) continue;
  for (const f of forbidden) {
    if (f.re.test(text)) errors.push(`${f.msg} in ${file}`);
  }
  if (
    /creds\s*:/.test(text) &&
    !file.includes("settings.ts") &&
    !file.includes("service-worker.ts")
  ) {
    errors.push(`Possible creds field in ${file}`);
  }
}

const schema = readFileSync(resolve("src/storage/schema.ts"), "utf8");
if (/password|credential|creds/i.test(schema)) {
  errors.push("schema.ts must not define credential fields");
}

if (errors.length) {
  console.error("Compliance audit FAILED:");
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log("Compliance audit passed");
