import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

export interface AgentEntry {
  id: string;
  title: string;
  description: string;
  kind: "agent" | "guide";
  audience: string;
  source: string;
  sources: string[];
  handoffs: string[];
  resources: string[];
  legacyCursor: string | null;
}
export interface PackCatalog {
  schemaVersion: number;
  version: string;
  target: string;
  reviewedDate: string;
  hostValidation: string;
  entries: AgentEntry[];
  templates: { id: string; title: string; source: string }[];
  sources: { id: string; title: string; url: string }[];
}

const staticFiles = [
  "README.md", "AGENTS.md", "catalog.json", "PROMPT-TEMPLATE.md", "SOURCES.md",
  "vscode-prompts/README.md", "cursor-rules/README.md", "skills/README.md",
  "claude-agents/README.md", "local-templates/README.md", "examples/README.md",
  "evaluations/README.md", "evaluations/cases.json", "evaluations/result-template.json",
];

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function safePackPath(root: string, path: string): string {
  requireCondition(typeof path === "string" && /^[a-zA-Z0-9_./-]+$/.test(path), `Unsafe pack path: ${path}`);
  requireCondition(!isAbsolute(path) && !path.split("/").some((p) => !p || p === "." || p === ".."), `Unsafe pack path: ${path}`);
  requireCondition(!path.split("/").some((p) => p.startsWith(".") || /^(local|private|secrets)$/i.test(p)), `Private pack path: ${path}`);
  const base = resolve(root, "agents");
  const absolute = resolve(base, path);
  const rel = relative(base, absolute);
  requireCondition(rel !== "" && !rel.startsWith("..") && !isAbsolute(rel), `Path leaves agents: ${path}`);
  // Check ancestors as well as the leaf: a symlinked export directory can escape the workspace.
  let current = absolute;
  while (current !== resolve(root)) {
    if (existsSync(current)) requireCondition(!lstatSync(current).isSymbolicLink(), `Symlink in pack path: ${path}`);
    current = dirname(current);
  }
  return absolute;
}

export function loadCatalog(root = process.cwd()): PackCatalog {
  const catalog = JSON.parse(readFileSync(safePackPath(root, "catalog.json"), "utf8")) as PackCatalog;
  requireCondition(catalog.schemaVersion === 1 && /^\d+\.\d+\.\d+$/.test(catalog.version), "Unsupported catalog/version");
  requireCondition(/^\d{4}-\d{2}-\d{2}$/.test(catalog.reviewedDate) && catalog.hostValidation === "not-run", "Invalid verification status");
  requireCondition(Array.isArray(catalog.entries) && catalog.entries.length > 0, "Missing agent catalog");
  requireCondition(Array.isArray(catalog.templates) && Array.isArray(catalog.sources), "Missing templates/sources");
  const ids = new Set<string>();
  const sourceIds = new Set<string>();
  for (const source of catalog.sources) {
    requireCondition(/^[a-z][a-z0-9-]*$/.test(source.id) && !sourceIds.has(source.id), `Duplicate/invalid source: ${source.id}`);
    requireCondition(typeof source.title === "string" && new URL(source.url).protocol === "https:", `Invalid source URL: ${source.id}`);
    sourceIds.add(source.id);
  }
  for (const entry of catalog.entries) {
    requireCondition(/^(review|assist|design|guide)-[a-z0-9-]+$/.test(entry.id) && !ids.has(entry.id), `Duplicate/invalid agent: ${entry.id}`);
    ids.add(entry.id);
    requireCondition(entry.kind === "agent" || entry.kind === "guide", `Invalid kind: ${entry.id}`);
    requireCondition(entry.source === `${entry.id}/${entry.kind === "guide" ? "GUIDE" : "AGENT"}.md`, `Invalid canonical source: ${entry.id}`);
    requireCondition([entry.title, entry.description, entry.audience].every((v) => typeof v === "string" && v.length > 0), `Missing metadata: ${entry.id}`);
    requireCondition(Array.isArray(entry.sources) && entry.sources.length > 0 && entry.sources.every((id) => sourceIds.has(id)), `Unknown source: ${entry.id}`);
    requireCondition(Array.isArray(entry.resources) && Array.isArray(entry.handoffs), `Missing resources/handoffs: ${entry.id}`);
    for (const path of [entry.source, ...entry.resources, ...(entry.legacyCursor ? [entry.legacyCursor] : [])]) safePackPath(root, path);
  }
  for (const entry of catalog.entries) requireCondition(entry.handoffs.every((id) => ids.has(id)), `Unknown handoff: ${entry.id}`);
  const templateIds = new Set<string>();
  for (const template of catalog.templates) {
    requireCondition(/^[a-z][a-z0-9-]*$/.test(template.id) && !templateIds.has(template.id), `Invalid template: ${template.id}`);
    requireCondition(template.source === `local-templates/${template.id}/SKILL.md`, `Invalid template path: ${template.id}`);
    safePackPath(root, template.source);
    templateIds.add(template.id);
  }
  return catalog;
}

export function parsePrompt(text: string): { metadata: Record<string, string>; body: string } {
  const normalized = text.replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]+?)\n---\n\n([\s\S]+)$/.exec(normalized);
  requireCondition(match, "Missing scalar frontmatter or prompt body");
  const metadata: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const field = /^([a-z_]+): (.+)$/.exec(line);
    requireCondition(field && !Object.hasOwn(metadata, field[1]), `Invalid/duplicate frontmatter: ${line}`);
    metadata[field[1]] = field[2].startsWith('"') ? JSON.parse(field[2]) as string : field[2];
  }
  return { metadata, body: match[2].trimEnd() + "\n" };
}

export function buildExports(root: string, catalog: PackCatalog): Map<string, string> {
  const files = new Map<string, string>();
  for (const entry of catalog.entries) {
    const { metadata, body } = parsePrompt(readFileSync(safePackPath(root, entry.source), "utf8"));
    requireCondition(metadata.name === entry.id && metadata.description === entry.description && metadata.version === catalog.version, `Canonical metadata drift: ${entry.id}`);
    // Retain the actual per-prompt source review date when adding new agents;
    // a pack revision must not silently claim an older prompt was reverified.
    const reviewDate = metadata.sources_verified;
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(reviewDate) && Number.isFinite(Date.parse(reviewDate)) &&
      new Date(reviewDate).toISOString().slice(0, 10) === reviewDate && reviewDate <= catalog.reviewedDate;
    requireCondition(metadata.kind === entry.kind && validDate && metadata.host_validation === catalog.hostValidation, `Canonical status drift: ${entry.id}`);
    const resources = entry.resources.map((path) => readFileSync(safePackPath(root, path), "utf8").replace(/\r\n/g, "\n").trimEnd());
    const complete = [body.trimEnd(), ...resources].join("\n\n") + "\n";
    const note = `<!-- Generated from ${entry.source}; pack ${catalog.version}. Edit canonical sources and run npm run generate:agents. -->\n\n`;
    files.set(`vscode-prompts/${entry.id}.prompt.md`, `---\ndescription: ${JSON.stringify(entry.description)}\n---\n\n${note}${complete}`);
    const cursor = `---\ndescription: ${JSON.stringify(entry.description)}\nalwaysApply: false\n---\n\n${note}${complete}`;
    files.set(`cursor-rules/${entry.id}.mdc`, cursor);
    if (entry.legacyCursor) files.set(entry.legacyCursor, cursor);
    files.set(`skills/ps-${entry.id}/SKILL.md`, `---\nname: ps-${entry.id}\ndescription: ${JSON.stringify(entry.description)}\n---\n\n${note}${complete}`);
    files.set(`claude-agents/ps-${entry.id}.md`, `---\nname: ps-${entry.id}\ndescription: ${JSON.stringify(entry.description)}\ntools: Read, Glob, Grep, WebFetch, WebSearch\n---\n\n${note}${complete}`);
  }
  return files;
}

export function catalogTable(catalog: PackCatalog, wiki = false): string {
  const base = "https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/";
  return ["| Prompt | Kind | Use |", "|---|---|---|", ...catalog.entries.map((entry) =>
    `| [${entry.id}](${wiki ? base : ""}${entry.source}) | ${entry.kind} | ${entry.description} |`)].join("\n");
}

function generatedSection(text: string, table: string): string {
  const start = "<!-- CATALOG-BEGIN -->";
  const end = "<!-- CATALOG-END -->";
  requireCondition(text.split(start).length === 2 && text.split(end).length === 2, "Missing/duplicate catalog section markers");
  return text.slice(0, text.indexOf(start) + start.length) + "\n\n" + table + "\n\n" + text.slice(text.indexOf(end));
}

export function generatedFiles(root: string, catalog: PackCatalog): Map<string, string> {
  const files = new Map([...buildExports(root, catalog)].map(([path, text]) => [`agents/${path}`, text]));
  for (const [path, wiki] of [["agents/README.md", false], ["wiki/AI-Agent-Prompts.md", true]] as const) {
    const text = readFileSync(resolve(root, path), "utf8").replace(/\r\n/g, "\n");
    files.set(path, generatedSection(text, catalogTable(catalog, wiki)));
  }
  // Ship public reference metadata only; prompt bodies and tools remain outside the extension.
  const references = catalog.entries.map(({ id, title, description, kind, source, audience }) => ({ id, title, description, kind, source, audience }));
  const templates = catalog.templates.map(({ id, title, source }) => ({ id, title, source }));
  files.set("src/generated/agent-catalog.ts", `// Generated from agents/catalog.json. Run npm run generate:agents; do not edit.\nexport const AGENT_PACK_VERSION = ${JSON.stringify(catalog.version)};\nexport const AGENT_REFERENCES = ${JSON.stringify(references, null, 2)} as const;\nexport const LOCAL_SPECIALIST_REFERENCES = ${JSON.stringify(templates, null, 2)} as const;\n`);
  return files;
}

export function publishFiles(catalog: PackCatalog): string[] {
  const exports = catalog.entries.flatMap((entry) => [
    `vscode-prompts/${entry.id}.prompt.md`, `cursor-rules/${entry.id}.mdc`,
    `skills/ps-${entry.id}/SKILL.md`, `claude-agents/ps-${entry.id}.md`,
    ...(entry.legacyCursor ? [entry.legacyCursor] : []),
  ]);
  return [...new Set([...staticFiles, ...catalog.entries.flatMap((entry) => [entry.source, ...entry.resources]),
    ...catalog.templates.map((entry) => entry.source), ...exports])].sort();
}

export function validateLinks(root: string, packPath: string, text: string): void {
  const withoutFences = text.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, "");
  for (const match of withoutFences.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(https:\/\/|#)/.test(target)) continue;
    requireCondition(!/^[a-z]+:/i.test(target), `Unsupported link in ${packPath}: ${target}`);
    const absolute = resolve(dirname(safePackPath(root, packPath)), target.split("#")[0]);
    const rel = relative(resolve(root, "agents"), absolute).replace(/\\/g, "/");
    safePackPath(root, rel);
    requireCondition(existsSync(absolute), `Broken link in ${packPath}: ${target}`);
  }
}

export function validatePack(root = process.cwd()): { catalog: PackCatalog; files: string[] } {
  const catalog = loadCatalog(root);
  const expected = generatedFiles(root, catalog);
  for (const [path, text] of expected) {
    const absolute = path.startsWith("agents/") ? safePackPath(root, path.slice(7)) : resolve(root, path);
    requireCondition(existsSync(absolute) && readFileSync(absolute, "utf8").replace(/\r\n/g, "\n") === text, `Stale/missing export: ${path}; run npm run generate:agents`);
  }
  const canonical = new Set(catalog.entries.map((entry) => entry.source));
  for (const directory of readdirSync(resolve(root, "agents"), { withFileTypes: true })) {
    if (!directory.isDirectory()) continue;
    for (const filename of ["AGENT.md", "GUIDE.md"]) {
      if (existsSync(resolve(root, "agents", directory.name, filename))) requireCondition(canonical.has(`${directory.name}/${filename}`), `Uncatalogued prompt: ${directory.name}/${filename}`);
    }
  }
  const files = publishFiles(catalog);
  for (const path of files) {
    const absolute = safePackPath(root, path);
    requireCondition(existsSync(absolute) && lstatSync(absolute).isFile(), `Missing published file: ${path}`);
    validateLinks(root, path, readFileSync(absolute, "utf8"));
  }
  const cases = JSON.parse(readFileSync(safePackPath(root, "evaluations/cases.json"), "utf8")) as { id: string; agent: string; request: string; expected: string[]; forbidden: string[] }[];
  const caseIds = new Set<string>();
  for (const test of cases) {
    requireCondition(!caseIds.has(test.id) && catalog.entries.some((entry) => entry.id === test.agent), `Invalid evaluation: ${test.id}`);
    requireCondition(test.request.length > 0 && test.expected.length > 0 && test.forbidden.length > 0, `Incomplete evaluation: ${test.id}`);
    caseIds.add(test.id);
  }
  for (const entry of catalog.entries) requireCondition(cases.some((test) => test.agent === entry.id), `No evaluation case: ${entry.id}`);
  const template = JSON.parse(readFileSync(safePackPath(root, "evaluations/result-template.json"), "utf8")) as { promptPackVersion: string; results: { caseId: string; agent: string; status: string; responseEvidence: unknown }[] };
  requireCondition(template.promptPackVersion === catalog.version && Array.isArray(template.results), "Stale evaluation template");
  requireCondition(template.results.length === cases.length && new Set(template.results.map((result) => result.caseId)).size === cases.length, "Incomplete evaluation template");
  for (const result of template.results) requireCondition(cases.some((test) => test.id === result.caseId && test.agent === result.agent) && result.status === "not-run" && result.responseEvidence === null, "Evaluation template must contain unexecuted cases only");
  return { catalog, files };
}

export function writeExports(root = process.cwd()): void {
  for (const [path, text] of generatedFiles(root, loadCatalog(root))) {
    const absolute = path.startsWith("agents/") ? safePackPath(root, path.slice(7)) : resolve(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, text, "utf8");
  }
}
