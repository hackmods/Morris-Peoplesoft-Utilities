import { afterEach, describe, expect, it } from "vitest";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { buildExports, loadCatalog, parsePrompt, publishFiles, safePackPath, validatePack } from "../../scripts/agent-pack.js";

const fixtures: string[] = [];
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "ps-agent-pack-"));
  fixtures.push(root);
  const catalog = loadCatalog();
  for (const file of publishFiles(catalog)) {
    const target = join(root, "agents", file);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join("agents", file), target);
  }
  mkdirSync(join(root, "wiki"));
  cpSync("wiki/AI-Agent-Prompts.md", join(root, "wiki/AI-Agent-Prompts.md"));
  mkdirSync(join(root, "src/generated"), { recursive: true });
  cpSync("src/generated/agent-catalog.ts", join(root, "src/generated/agent-catalog.ts"));
  return root;
}
afterEach(() => {
  for (const root of fixtures.splice(0)) {
    // Only remove a concrete mkdtemp checkout directly under the intended temp directory.
    if (dirname(resolve(root)) !== resolve(tmpdir()) || !basename(root).startsWith("ps-agent-pack-")) throw new Error("Unsafe fixture cleanup");
    rmSync(root, { recursive: true, force: true });
  }
});

// The suite copies and checks the complete multi-host pack on disk. Windows
// filesystem/antivirus latency can exceed the default five-second budget.
describe("PeopleSoft prompt distributions", { timeout: 30_000 }, () => {
  it("ships complete sources/resources in every host export with correct skill metadata", () => {
    const catalog = loadCatalog();
    const exports = buildExports(process.cwd(), catalog);
    for (const entry of catalog.entries) {
      const body = parsePrompt(readFileSync(join("agents", entry.source), "utf8")).body.trimEnd();
      for (const path of [`vscode-prompts/${entry.id}.prompt.md`, `cursor-rules/${entry.id}.mdc`, `skills/ps-${entry.id}/SKILL.md`, `claude-agents/ps-${entry.id}.md`]) {
        expect(exports.get(path)).toContain(body);
        for (const resource of entry.resources) expect(exports.get(path)).toContain(readFileSync(join("agents", resource), "utf8").replace(/\r\n/g, "\n").trimEnd());
      }
      const skill = parsePrompt(exports.get(`skills/ps-${entry.id}/SKILL.md`)!);
      expect(skill.metadata.name).toBe(`ps-${entry.id}`);
      expect(skill.metadata.description).toBe(entry.description);
    }
  });

  it("rejects source drift before a release can package stale instructions", () => {
    const root = fixture();
    const path = join(root, "agents/assist-fluid/AGENT.md");
    writeFileSync(path, readFileSync(path, "utf8") + "\nA material new instruction.\n");
    expect(() => validatePack(root)).toThrow("Stale/missing export");
  });

  it("rejects unsafe and private catalog paths", () => {
    for (const path of ["../secret.md", "C:/outside.md", "/outside.md", "skills/../../private.md", "private/facts.md", ".env", "skills\\outside.md"]) {
      expect(() => safePackPath(process.cwd(), path)).toThrow();
    }
  });

  it("rejects symlinked package directories even when paths look in bounds", () => {
    const root = fixture();
    const outside = join(root, "private-target");
    mkdirSync(outside);
    symlinkSync(outside, join(root, "agents/linked"), process.platform === "win32" ? "junction" : "dir");
    expect(() => safePackPath(root, "linked/facts.md")).toThrow("Symlink");
  });

  it("uses an explicit package list that excludes an added private specialist", () => {
    const root = fixture();
    const privateFile = join(root, "agents/private/facts.md");
    mkdirSync(dirname(privateFile));
    writeFileSync(privateFile, "private test content");
    const result = validatePack(root);
    expect(existsSync(privateFile)).toBe(true);
    expect(result.files).not.toContain("private/facts.md");
  });

  it("rejects broken shipped links and unknown handoffs", () => {
    const root = fixture();
    writeFileSync(join(root, "agents/examples/README.md"), "[missing](../missing.md)\n");
    expect(() => validatePack(root)).toThrow("Broken link");
    const catalog = loadCatalog(root);
    catalog.entries[0].handoffs.push("assist-does-not-exist");
    writeFileSync(join(root, "agents/catalog.json"), JSON.stringify(catalog));
    expect(() => loadCatalog(root)).toThrow("Unknown handoff");
  });

  it("rejects an uncatalogued canonical prompt", () => {
    const root = fixture();
    mkdirSync(join(root, "agents/assist-extra"));
    writeFileSync(join(root, "agents/assist-extra/AGENT.md"), "unlisted prompt");
    expect(() => validatePack(root)).toThrow("Uncatalogued prompt");
  });

  it("never ships an evaluation template that claims an unperformed pass", () => {
    const root = fixture();
    const path = join(root, "agents/evaluations/result-template.json");
    const template = JSON.parse(readFileSync(path, "utf8"));
    template.results[0].status = "pass";
    writeFileSync(path, JSON.stringify(template));
    expect(() => validatePack(root)).toThrow("unexecuted cases only");
  });

  it("validates the maintained pack without claiming host execution", () => {
    const result = validatePack();
    expect(result.catalog.entries).toHaveLength(24);
    expect(result.catalog.templates).toHaveLength(3);
    expect(result.catalog.hostValidation).toBe("not-run");
  });
});
