import { parseConfiguration, type ConfigurationEntry } from "./configuration-comparison";
import { parseIbXml, type IbEvidenceField } from "./ib-xml";

export const IB_FORMAT = "mpu-ib-evidence";
export const IB_LIMITS = { maxFiles: 4, maxBytes: 256_000, maxRecords: 50, maxEntries: 2_000, maxDepth: 16, maxPathSegmentChars: 256, maxScalarChars: 4_000, maxMetadataChars: 200, maxReportBytes: 1_000_000 } as const;
export const IB_FIELDS = ["serviceOperation", "operationType", "direction", "senderNode", "receiverNode", "queue", "routing", "transactionId", "stage", "reportedStatus", "error", "payload"] as const;
export const IB_V2_FIELDS = [...IB_FIELDS, "environmentLabel", "operationVersion", "observedAt", "correlationId", "subQueue", "errorLocation", "evidenceNote", "payloadRole", "payloadVariant", "payloadXml"] as const;
export const IB_ENUMS: Record<string, readonly string[]> = {
  operationType: ["synchronous", "asynchronous", "unknown"], direction: ["inbound", "outbound", "unknown"],
  stage: ["operation", "publication-contract", "subscription-contract", "gateway", "unknown"],
  payloadRole: ["request", "response", "message", "unknown"],
  payloadVariant: ["original", "transformed", "unknown"],
};
export interface IbEvidenceRecord { index: number; line: number; fields: IbEvidenceField[] }
export interface IbEvidence { version: 1 | 2; records: IbEvidenceRecord[] }

function fail(): never { throw new Error("Unsupported IB evidence envelope or limits."); }
function sensitiveName(value: string): boolean {
  return /(?:pass(?:word|wd|phrase)|pwd|secret|token|credential|auth|cookie|session|private.?key|cert|user|oprid|operator|database|host|server|endpoint|url|email|address|phone|birth|\bdob\b|ssn|sin\b|emplid|employee|person|name|account|bank|salary|payroll)/i.test(value);
}
export function sensitiveIbValue(value: string): boolean {
  return /(?:password|passwd|\bpwd\b|secret|token|credential|authorization|bearer|private[ _-]?key|certificate|cookie|session|jdbc|odbc|ldap|wallet|signon|api[ _-]?key)/i.test(value)
    || value.includes("://") || value.includes("@") || /[A-Z]:[\\/]|\\\\|(?:^|\s)\/[\w.-]+\//i.test(value)
    // Serialized nested payloads and markup cannot bypass structured-key masking.
    || /[<>]|^\s*[[{]/.test(value);
}

/** Reuse G's bounded JSON scanner for duplicate keys, exact numbers and source
 * lines. Validate our own versioned envelope whitelist before producing evidence. */
export function parseIbEvidence(input: string): IbEvidence {
  // Reject control/binary text, including escaped controls after decoding below.
  // eslint-disable-next-line no-control-regex
  const unsafe = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028-\u202e\u2066-\u2069\ufffd]/;
  if (new TextEncoder().encode(input).length > IB_LIMITS.maxBytes || unsafe.test(input)) fail();
  let entries: ConfigurationEntry[];
  try { entries = parseConfiguration(input.replace(/^\ufeff/, ""), "json").entries; } catch { return fail(); }
  if (entries.length > IB_LIMITS.maxEntries || entries.some(entry => entry.segments.length > IB_LIMITS.maxDepth
    || entry.segments.some(segment => segment.length > IB_LIMITS.maxPathSegmentChars)
    || (typeof entry.value === "string" && entry.value.length > IB_LIMITS.maxScalarChars)
    || (entry.numberLexeme !== undefined && entry.numberLexeme.length > IB_LIMITS.maxScalarChars))) fail();
  if (entries.some(entry => entry.segments.some(segment => unsafe.test(segment)) || (typeof entry.value === "string" && unsafe.test(entry.value)))) fail();
  const root = entries.filter(entry => entry.segments.length === 1);
  if (root.length !== 3 || root.some(entry => !["format", "version", "records"].includes(entry.segments[0]))) fail();
  if (!root.some(entry => entry.path === "/format" && entry.value === IB_FORMAT)
    || !root.some(entry => entry.path === "/version" && entry.valueType === "number" && (entry.value === 1 || entry.value === 2))
    || !root.some(entry => entry.path === "/records" && entry.valueType === "array")) fail();
  const records = entries.filter(entry => entry.segments[0] === "records" && entry.segments.length === 2);
  const version = root.find(entry => entry.path === "/version")!.value as 1 | 2;
  const allowed: readonly string[] = version === 1 ? IB_FIELDS : IB_V2_FIELDS;
  if (!records.length || records.length > IB_LIMITS.maxRecords || records.some(entry => entry.valueType !== "object")) fail();
  // Group once: bounded total scanner entries, without rescanning each payload.
  const grouped = new Map(records.map(entry => [entry.segments[1], [] as ConfigurationEntry[]]));
  for (const entry of entries) {
    if (entry.segments.length <= 2) continue;
    if (entry.segments[0] !== "records") fail();
    const group = grouped.get(entry.segments[1]);
    if (!group || !allowed.includes(entry.segments[2])) fail();
    const field = entry.segments[2];
    if (field !== "payload") {
      if (entry.segments.length !== 3 || entry.valueType !== "string" || typeof entry.value !== "string"
        || entry.value.length > (["error", "evidenceNote", "payloadXml"].includes(field) ? IB_LIMITS.maxScalarChars : IB_LIMITS.maxMetadataChars)) fail();
      if (IB_ENUMS[field] && !IB_ENUMS[field].includes(entry.value)) fail();
    } else if (entry.segments.length === 3 && !["object", "array"].includes(entry.valueType)) fail();
    group.push(entry);
  }
  // No raw values escape the parser for sensitive paths/values. Do not infer
  // matching secrets, identity, status, payload semantics or cross-record joins.
  let expandedCount = entries.length;
  return { version, records: records.map((record, index) => {
    let group: IbEvidenceField[] = grouped.get(record.segments[1])!;
    if (!group.length) fail();
    const xml = group.find(entry => entry.segments[2] === "payloadXml");
    if (xml) {
      if (group.some(entry => entry.segments[2] === "payload")) fail();
      let parsed: IbEvidenceField[];
      try { parsed = parseIbXml(xml); } catch { return fail(); }
      if (parsed.some(field => field.segments.some(segment => unsafe.test(segment)) || (typeof field.value === "string" && unsafe.test(field.value)))) fail();
      expandedCount += parsed.length - 1;
      if (expandedCount > IB_LIMITS.maxEntries) fail();
      group = group.filter(entry => entry !== xml).concat(parsed);
    }
    const maskedPaths: string[] = [];
    const fields: IbEvidenceField[] = [];
    for (const entry of group) {
      if (maskedPaths.some(path => entry.path.startsWith(`${path}/`))) continue;
      const isPayload = entry.segments[2] === "payload" || entry.segments[2] === "payloadXml";
      const masked = entry.sensitive || (isPayload && entry.segments.slice(3).some(sensitiveName))
        || (typeof entry.value === "string" && sensitiveIbValue(entry.value));
      if (masked) {
        maskedPaths.push(entry.path);
        fields.push({ path: "[masked path]", normalizedPath: "[masked path]", segments: ["records", String(index), entry.segments[2]],
          value: "[masked]", valueType: "string", sourceLine: entry.sourceLine, payloadLine: entry.payloadLine, sensitive: true });
      } else fields.push({ ...entry, segments: [...entry.segments] });
    }
    return { index: index + 1, line: record.sourceLine, fields };
  }) };
}

function cell(entry: ConfigurationEntry): string {
  if (entry.sensitive) return "[masked]";
  if (entry.valueType === "object" || entry.valueType === "array") return `[${entry.valueType}]`;
  return entry.valueType === "number" ? entry.numberLexeme! : JSON.stringify(entry.value);
}

export const IB_CHECKS = [
  ["scope", "Confirm environment, service operation/version, direction, capture window and transaction scope."],
  ["routing", "Review applicable sending/receiving nodes and routing definition/version; verify evidence of active routing separately."],
  ["stages", "Review operation, publication-contract and subscription-contract stages separately; no single status proves delivery."],
  ["queue", "Review applicable queue/subqueue ordering and domain/node evidence; missing queue data does not prove a stall."],
  ["errors", "Review stage-specific error, timestamp and authorized gateway/handler/transformation evidence; blank errors do not prove success."],
  ["payload", "Review payload role, schema/version and sanitization; masked values were not compared or validated against a definition."],
  ["follow-up", "Record missing evidence and next steps; follow your procedures before replay/resubmit/cancel or configuration changes."],
] as const;
export const IB_DISPOSITIONS = ["unreviewed", "evidence-recorded", "needs-follow-up", "not-applicable"] as const;
export interface IbCaseReview {
  caseLabel?: string; owner?: string; expected?: string; actual?: string;
  checks?: Record<string, { disposition: string; note: string }>;
}
export interface IbReportOptions { comparison?: { left: string; right: string }; review?: IbCaseReview; draftFirst?: boolean }

export function ibRecordChoices(inputs: string[]): { value: string; label: string }[] {
  if (!inputs.length || inputs.length > IB_LIMITS.maxFiles) fail();
  return inputs.flatMap((text, source) => parseIbEvidence(text).records.map(record => ({ value: `${source + 1}:${record.index}`, label: `Source ${source + 1}, record ${record.index} (JSON L${record.line})` })));
}

function timeOf(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const [year, month, day, hour, minute, second] = value.slice(0, 19).split(/[-T:]/).map(Number);
  const days = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const offset = /[+-](\d{2}):(\d{2})$/.exec(value);
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59
    || (offset && (Number(offset[1]) > 23 || Number(offset[2]) > 59))) return null;
  const instant = Date.parse(value); return Number.isFinite(instant) ? instant : null;
}
const payloadField = (field: IbEvidenceField) => ["payload", "payloadXml"].includes(field.segments[2]);
const citation = (source: number, field: IbEvidenceField) => `Source ${source}:L${field.sourceLine}${field.payloadLine === undefined ? "" : ` (decoded XML opening-tag L${field.payloadLine})`}`;

/** Enforce the report budget while building, before long repeated paths can
 * allocate an oversized report or comparison. */
class IbReportLines {
  private readonly lines: string[] = [];
  private bytes = 0;
  constructor(lines: string[]) { this.push(...lines); }
  push(...lines: string[]): void {
    for (const line of lines) {
      this.bytes += new TextEncoder().encode(line).length + (this.lines.length ? 1 : 0);
      if (this.bytes > IB_LIMITS.maxReportBytes) throw new Error("IB report limit exceeded. Use smaller samples.");
      this.lines.push(line);
    }
  }
  values(): string[] { return this.lines; }
  join(separator: string): string { return this.lines.join(separator); }
}

function comparisonLines(evidence: IbEvidence[], pair: NonNullable<IbReportOptions["comparison"]>, includePayload: boolean): string[] {
  const find = (id: string) => {
    if (!/^[1-4]:[1-9]\d?$/.test(id)) fail();
    const [source, record] = id.split(":").map(Number); const found = evidence[source - 1]?.records[record - 1];
    if (!found) fail(); return { source, record: found };
  };
  if (pair.left === pair.right) throw new Error("Select two distinct evidence records.");
  const left = find(pair.left); const right = find(pair.right);
  const out = new IbReportLines(["", `EXPLICIT RECORD COMPARISON — ${pair.left} -> ${pair.right}`, "Selections are a reviewer choice, not proof of correlation. Only reported text/types are compared."]);
  for (const name of IB_V2_FIELDS.filter(field => !["payload", "payloadXml"].includes(field))) {
    const a = left.record.fields.find(field => field.segments[2] === name && field.segments.length === 3);
    const b = right.record.fields.find(field => field.segments[2] === name && field.segments.length === 3);
    const status = !a || !b ? "unknown" : a.sensitive || b.sensitive ? "not-compared" : cell(a) === cell(b) ? "same reported text" : "different reported text";
    out.push(`${name} | ${status} | ${a ? citation(left.source, a) : "not supplied"} -> ${b ? citation(right.source, b) : "not supplied"}${status === "not-compared" ? " | [masked pair]" : ` | ${a ? cell(a) : "unknown"} -> ${b ? cell(b) : "unknown"}`}`);
    if (["environmentLabel", "serviceOperation", "operationVersion", "operationType", "direction", "payloadRole", "payloadVariant"].includes(name) && status !== "same reported text") out.push(`Scope warning: ${name} differs, is missing or masked; verify comparability in the originals.`);
  }
  const a = left.record.fields.filter(payloadField); const b = right.record.fields.filter(payloadField);
  if (!includePayload) out.push("Payload comparison omitted by the inclusion option.");
  else if (!a.length || !b.length || a[0].segments[2] !== b[0].segments[2]) out.push("Payload comparison unavailable: missing payload or different JSON/XML formats.");
  else if ([...a, ...b].some(field => field.sensitive)) out.push("Payload comparison not performed: at least one selected payload contains masked evidence. No secret equality, hash or counterpart values are derived.");
  else {
    out.push("PAYLOAD STRUCTURAL TEXT COMPARISON — ordered array/sibling positions; no business/schema equivalence.");
    const key = (field: IbEvidenceField) => JSON.stringify(field.segments.slice(3));
    const first = new Map(a.map(field => [key(field), field])); const second = new Map(b.map(field => [key(field), field]));
    for (const path of new Set([...first.keys(), ...second.keys()])) {
      const before = first.get(path); const after = second.get(path);
      const status = !before ? "only right" : !after ? "only left" : before.valueType !== after.valueType ? "type differs" : cell(before) === cell(after) ? "same text" : "text differs";
      out.push(`${path} | ${status} | ${before ? citation(left.source, before) : "missing"} -> ${after ? citation(right.source, after) : "missing"} | ${before ? cell(before) : "missing"} -> ${after ? cell(after) : "missing"}`);
    }
  }
  return out.values();
}

export function renderIbInvestigation(inputs: string[], includePayload: boolean, options: IbReportOptions = {}): string {
  if (!inputs.length || inputs.length > IB_LIMITS.maxFiles) fail();
  const evidence = inputs.map(parseIbEvidence);
  const out = new IbReportLines(["MPU Integration Broker investigation — report v2", `Format: mpu-ib-evidence / versions ${[...new Set(evidence.map(file => file.version))].join(", ")}`,
    "Manually prepared JSON evidence; synthetic parser coverage only. Native exports and real PeopleTools 8.62 compatibility unverified.",
    "No server requests, replay, resubmit, cancel or configuration changes. All statuses and routing fields are reported claims, not verified outcomes.",
    "Selected filenames omitted. Source numbers follow selection order; retain originals locally for line/JSON Pointer citations.",
    "Confirm environment, capture window and transaction scope. Matching transaction IDs, names or payload text do not prove identity, delivery, routing or root cause.",
    `Payload detail: ${includePayload ? "explicitly included after conservative masking; review remaining business context" : "omitted; enable payload detail and prepare a new preview if needed"}.`, ""]);
  if (options.draftFirst) out.push("Source 1 is the explicitly prepared draft envelope; its JSON lines refer to generated draft text, not an original external file.");
  out.push("XML subset v1: attributes/direct text use decoded XML opening-tag lines. Namespace declarations/comments are omitted, prefixes and sibling positions remain lexical. Matching text does not establish XML namespace/schema/semantic equivalence.");
  evidence.forEach((file, source) => file.records.forEach(record => {
    out.push(`Source ${source + 1}:L${record.line} /records/${record.index - 1} — Evidence record ${record.index}`);
    for (const field of (file.version === 1 ? IB_FIELDS : IB_V2_FIELDS).filter(field => !["payload", "payloadXml"].includes(field))) {
      const entry = record.fields.find(entry => entry.segments.length === 3 && entry.segments[2] === field);
      out.push(entry ? `  ${field} | Source ${source + 1}:L${entry.sourceLine} /records/${record.index - 1}/${field} | ${cell(entry)}` : `  ${field} | unknown / not supplied`);
    }
    if (includePayload) {
      const payload = record.fields.filter(payloadField);
      if (!payload.length) out.push("  payload | not supplied");
      payload.forEach(entry => out.push(`  payload | ${citation(source + 1, entry)} ${entry.sensitive ? "[masked path]" : JSON.stringify(entry.path)} | ${cell(entry)}`));
    }
    out.push("");
  }));
  out.push("OBSERVATION TIMELINE — supplied offsets and clocks assumed comparable; no runtime/causal inference");
  const observations = evidence.flatMap((file, source) => file.records.map(record => ({ source: source + 1, record, field: record.fields.find(field => field.segments[2] === "observedAt") })));
  const timed = observations.flatMap(row => { const instant = row.field && !row.field.sensitive ? timeOf(String(row.field.value)) : null; return instant === null ? [] : [{ ...row, instant }]; }).sort((a, b) => a.instant - b.instant || a.source - b.source || a.record.index - b.record.index);
  timed.forEach(row => out.push(`${citation(row.source, row.field!)} record ${row.record.index} | ${cell(row.field!)}`));
  out.push(`${observations.length - timed.length} record(s) have unknown, unsupported or masked observation time; no timestamp inheritance.`);
  if (options.comparison) out.push(...comparisonLines(evidence, options.comparison, includePayload));
  const manual = (value: string | undefined, max: number) => {
    if (value === undefined || value === "") return "not supplied";
    if (typeof value !== "string" || value.length > max) fail();
    if (/[\u2028-\u202e\u2066-\u2069\ufffd]/.test(value)) fail();
    return sensitiveIbValue(value) ? "[masked manual text]" : JSON.stringify(value);
  };
  out.push("", "MANUAL CASE REVIEW — reviewer assertions; not verified by MPU");
  for (const name of ["caseLabel", "owner", "expected", "actual"] as const) out.push(`${name}: ${manual(options.review?.[name], ["expected", "actual"].includes(name) ? 2_000 : 200)}`);
  if (options.review?.checks && Object.keys(options.review.checks).some(id => !IB_CHECKS.some(check => check[0] === id))) fail();
  out.push("MANUAL ROUTING / ERROR CHECKLIST — no diagnosis or action is performed");
  for (const [id, description] of IB_CHECKS) {
    const check = options.review?.checks?.[id]; const disposition = check?.disposition ?? "unreviewed";
    if (!(IB_DISPOSITIONS as readonly string[]).includes(disposition)) fail();
    out.push(`${id} | ${disposition} | ${description}`, `Evidence / follow-up note: ${manual(check?.note, 1_000)}`);
  }
  const report = out.join("\n");
  if (new TextEncoder().encode(report).length > IB_LIMITS.maxReportBytes) throw new Error("IB report limit exceeded. Use smaller samples.");
  return report;
}
