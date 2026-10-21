export type ConfigurationFormat = "ini" | "json";

export const CONFIG_LIMITS = {
  maxBytes: 256_000,
  maxRecords: 2_000,
  maxDepth: 16,
  maxScalarChars: 4_000,
  maxReportBytes: 1_000_000,
  maxPathSegmentChars: 256,
} as const;

export type ConfigurationValueType = "string" | "number" | "boolean" | "null" | "array" | "object";
export type ConfigurationScalar = string | number | boolean | null;

/** Parsed source values stay in memory only. Do not persist or log this object. */
export interface ConfigurationEntry {
  path: string;
  normalizedPath: string;
  segments: string[];
  value: ConfigurationScalar;
  /** Exact JSON number token keeps precision-sensitive comparisons lossless. */
  numberLexeme?: string;
  valueType: ConfigurationValueType;
  sourceLine: number;
  sensitive: boolean;
}

export interface ParsedConfiguration {
  format: ConfigurationFormat;
  entries: ConfigurationEntry[];
}

export type ConfigurationDifferenceStatus = "added" | "removed" | "changed" | "type-changed" | "unchanged" | "not-compared";

export interface ConfigurationDifference {
  path: string;
  status: ConfigurationDifferenceStatus;
  before: string | null;
  after: string | null;
  beforeType: ConfigurationValueType | null;
  afterType: ConfigurationValueType | null;
  leftLine: number | null;
  rightLine: number | null;
}

export interface ConfigurationComparison {
  format: ConfigurationFormat;
  differences: ConfigurationDifference[];
}

function fail(message: string, line?: number): never {
  throw new Error(line === undefined ? message : `${message} (line ${line})`);
}

function utf8Length(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

function isSensitiveName(value: string): boolean {
  return /(?:pass(?:word|wd|phrase)?|pwd|secret|token|credential|private.?key|certificate|cert|connection.?string|connstr|access.?key|api.?key|client.?secret|user|operator.?id|database|\bdb\b|host|server|dsn|url|signon|ldap|oauth|wallet|keystore|truststore|proxy.?auth|cookie|session)/i.test(value);
}

function isSuspiciousText(value: string): boolean {
  return /-----BEGIN [A-Z0-9 ]*(?:PRIVATE KEY|CERTIFICATE)-----/i.test(value)
    || /\b[A-Z][A-Z0-9+.-]*:\/\/[^\s]*[@?#]/i.test(value)
    || /\b(?:jdbc|odbc|oracle|ldap|ldaps):[^\s]*/i.test(value)
    || /(?:^|[\s;,&])(?:password|passwd|pwd|secret|token|client_secret|access_token|api[_-]?key|authorization|auth)\s*[:=]/i.test(value)
    || /\b(?:bearer|basic)\s+[/A-Za-z0-9._~+-]{8,}/i.test(value);
}

function pointer(segments: string[]): string {
  if (!segments.length) return "";
  return `/${segments.map(segment => segment.replace(/~/g, "~0").replace(/\//g, "~1")).join("/")}`;
}

function displayPath(segments: string[]): string {
  if (segments.some(segment => isSensitiveName(segment) || isSuspiciousText(segment))) return "[sensitive path omitted]";
  return pointer(segments);
}

function scalarType(value: ConfigurationScalar): ConfigurationValueType {
  if (value === null) return "null";
  return typeof value as "string" | "number" | "boolean";
}

function addEntry(
  entries: ConfigurationEntry[],
  format: ConfigurationFormat,
  segments: string[],
  value: ConfigurationScalar,
  valueType: ConfigurationValueType,
  sourceLine: number,
  inheritedSensitive = false,
  numberLexeme?: string,
): void {
  if (entries.length >= CONFIG_LIMITS.maxRecords) fail("Configuration has too many records", sourceLine);
  if (segments.length > CONFIG_LIMITS.maxDepth) fail("Configuration nesting is too deep", sourceLine);
  if (segments.some(segment => segment.length > CONFIG_LIMITS.maxPathSegmentChars)) fail("Configuration path is too long", sourceLine);
  const sensitive = inheritedSensitive || segments.some(isSensitiveName) || segments.some(isSuspiciousText)
    || (typeof value === "string" && isSuspiciousText(value));
  const normalizedSegments = format === "ini" ? segments.map(segment => segment.toLocaleLowerCase("en-US")) : segments;
  entries.push({
    path: pointer(segments), normalizedPath: pointer(normalizedSegments), segments: [...segments],
    value, ...(numberLexeme === undefined ? {} : { numberLexeme }), valueType, sourceLine, sensitive,
  });
}

/** Parse the deliberately small MPU-supported INI-style subset. */
function parseIni(text: string): ParsedConfiguration {
  const entries: ConfigurationEntry[] = [];
  const sections = new Set<string>();
  const keysBySection = new Map<string, Set<string>>();
  let section = "";
  let sectionSensitive = false;
  const lines = text.split(/\r\n|\n|\r/);
  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index];
    const lineNumber = index + 1;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("#")) continue;
    if (/^\s/.test(raw)) fail("Indented and continuation lines are unsupported", lineNumber);
    const sectionMatch = /^\[([^\]\r\n]+)\]$/.exec(trimmed);
    if (sectionMatch) {
      section = sectionMatch[1].trim();
      if (!section || section.length > CONFIG_LIMITS.maxPathSegmentChars) fail("Invalid section", lineNumber);
      const folded = section.toLocaleLowerCase("en-US");
      if (sections.has(folded)) fail("Duplicate section", lineNumber);
      if (entries.length + sections.size >= CONFIG_LIMITS.maxRecords) fail("Configuration has too many records", lineNumber);
      sections.add(folded);
      sectionSensitive = isSensitiveName(section) || isSuspiciousText(section);
      keysBySection.set(folded, new Set());
      continue;
    }
    const equals = raw.indexOf("=");
    if (equals < 0) fail("Unsupported INI-style line", lineNumber);
    const key = raw.slice(0, equals).trim();
    if (!key || key.length > CONFIG_LIMITS.maxPathSegmentChars || !/^[A-Za-z0-9_.-]+$/.test(key)) fail("Invalid key", lineNumber);
    const foldedSection = section.toLocaleLowerCase("en-US");
    let keys = keysBySection.get(foldedSection);
    if (!keys) { keys = new Set(); keysBySection.set(foldedSection, keys); }
    const foldedKey = key.toLocaleLowerCase("en-US");
    if (keys.has(foldedKey)) fail("Duplicate key", lineNumber);
    if (entries.length + sections.size >= CONFIG_LIMITS.maxRecords) fail("Configuration has too many records", lineNumber);
    keys.add(foldedKey);
    const value = raw.slice(equals + 1);
    if (value.length > CONFIG_LIMITS.maxScalarChars) fail("Configuration value is too long", lineNumber);
    const segments = section ? [section, key] : [key];
    addEntry(entries, "ini", segments, value, "string", lineNumber, sectionSensitive);
  }
  return { format: "ini", entries };
}

class JsonScanner {
  private index = 0;
  private line = 1;
  private previousCarriageReturn = false;
  private readonly entries: ConfigurationEntry[] = [];

  constructor(private readonly source: string) {}

  parse(): ParsedConfiguration {
    this.skipWhitespace();
    if (this.peek() !== "{") fail("JSON configuration root must be an object", this.line);
    this.readValue([], 0, false);
    this.skipWhitespace();
    if (this.index !== this.source.length) fail("Unexpected data after JSON object", this.line);
    return { format: "json", entries: this.entries };
  }

  private peek(): string { return this.source[this.index] ?? ""; }
  private take(): string {
    const char = this.source[this.index++] ?? "";
    if (char === "\r") this.line++;
    else if (char === "\n" && !this.previousCarriageReturn) this.line++;
    this.previousCarriageReturn = char === "\r";
    return char;
  }
  private skipWhitespace(): void { while (/[\t\n\r ]/.test(this.peek()) && this.peek()) this.take(); }

  private readString(): string {
    const startLine = this.line;
    if (this.take() !== '"') fail("Invalid JSON string", startLine);
    let token = '"';
    while (this.index < this.source.length) {
      const char = this.take(); token += char;
      if (char === '"') {
        let decoded: unknown;
        try {
          decoded = JSON.parse(token);
        } catch { fail("Invalid JSON string", startLine); }
        if (typeof decoded !== "string") fail("Invalid JSON string", startLine);
        if (decoded.length > CONFIG_LIMITS.maxScalarChars) fail("JSON string is too long", startLine);
        return decoded;
      }
      if (char === "\\") {
        if (this.index >= this.source.length) fail("Invalid JSON escape", startLine);
        token += this.take();
      } else if (char < " ") fail("Invalid JSON string", startLine);
    }
    fail("Unterminated JSON string", startLine);
  }

  private readValue(segments: string[], depth: number, inheritedSensitive: boolean): void {
    this.skipWhitespace();
    const line = this.line;
    if (depth > CONFIG_LIMITS.maxDepth) fail("JSON nesting is too deep", line);
    const char = this.peek();
    if (char === "{") {
      this.take(); this.skipWhitespace();
      if (this.peek() === "}") { this.take(); if (segments.length) addEntry(this.entries, "json", segments, null, "object", line, inheritedSensitive); return; }
      if (segments.length) addEntry(this.entries, "json", segments, null, "object", line, inheritedSensitive);
      const keys = new Set<string>();
      while (true) {
        this.skipWhitespace();
        if (this.peek() !== '"') fail("Expected JSON object key", this.line);
        const keyLine = this.line;
        const key = this.readString();
        if (keys.has(key)) fail("Duplicate JSON object key", keyLine);
        keys.add(key);
        this.skipWhitespace(); if (this.take() !== ":") fail("Expected colon after JSON key", this.line);
        this.readValue([...segments, key], depth + 1, inheritedSensitive || isSensitiveName(key) || isSuspiciousText(key));
        this.skipWhitespace();
        const separator = this.take();
        if (separator === "}") return;
        if (separator !== ",") fail("Expected comma or closing brace", this.line);
      }
    }
    if (char === "[") {
      this.take(); this.skipWhitespace();
      if (this.peek() === "]") { this.take(); if (segments.length) addEntry(this.entries, "json", segments, null, "array", line, inheritedSensitive); return; }
      if (segments.length) addEntry(this.entries, "json", segments, null, "array", line, inheritedSensitive);
      let item = 0;
      while (true) {
        this.readValue([...segments, String(item)], depth + 1, inheritedSensitive); item++;
        this.skipWhitespace();
        const separator = this.take();
        if (separator === "]") return;
        if (separator !== ",") fail("Expected comma or closing bracket", this.line);
      }
    }
    let value: ConfigurationScalar;
    if (char === '"') value = this.readString();
    else if (this.source.startsWith("true", this.index)) { this.index += 4; value = true; }
    else if (this.source.startsWith("false", this.index)) { this.index += 5; value = false; }
    else if (this.source.startsWith("null", this.index)) { this.index += 4; value = null; }
    else {
      const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(this.source.slice(this.index));
      if (!match) fail("Invalid JSON value", line);
      if (match[0].length > CONFIG_LIMITS.maxScalarChars) fail("JSON number is too long", line);
      this.index += match[0].length; value = Number(match[0]);
      if (!Number.isFinite(value)) fail("JSON number is out of range", line);
      if (segments.length) addEntry(this.entries, "json", segments, value, "number", line, inheritedSensitive, match[0]);
      return;
    }
    if (segments.length) addEntry(this.entries, "json", segments, value, scalarType(value), line, inheritedSensitive);
  }
}

/** Parse a UTF-8-sized, named-format text file. Errors never include source snippets. */
export function parseConfiguration(text: string, format: ConfigurationFormat): ParsedConfiguration {
  if (typeof text !== "string") fail("Configuration must be text");
  if (format !== "ini" && format !== "json") fail("Unsupported configuration format");
  if (utf8Length(text) > CONFIG_LIMITS.maxBytes) fail("Configuration exceeds the byte limit");
  return format === "ini" ? parseIni(text) : new JsonScanner(text).parse();
}

function safeValue(value: ConfigurationScalar, type: ConfigurationValueType): string {
  if (type === "array") return "[array container; see child entries]";
  if (type === "object") return "[object container; see child entries]";
  if (type === "string") return value as string;
  if (type === "null") return "null";
  return String(value);
}

function quoted(value: string): string { return JSON.stringify(value); }

function visibleType(value: ConfigurationValueType | null): string {
  return value && ["string", "number", "boolean", "null", "array", "object"].includes(value) ? value : "—";
}

/** Compare only parsed records; a sensitive value on either side masks the pair before comparison. */
export function compareConfigurations(left: ParsedConfiguration, right: ParsedConfiguration): ConfigurationComparison {
  if (left.format !== right.format) fail("Compare files in the same supported format.");
  const leftEntries = new Map(left.entries.map(entry => [entry.normalizedPath, entry]));
  const rightEntries = new Map(right.entries.map(entry => [entry.normalizedPath, entry]));
  const paths = [...new Set([...leftEntries.keys(), ...rightEntries.keys()])].filter(path => path !== "").sort((a, b) => a.localeCompare(b));
  const sensitivePrefixes = [...left.entries, ...right.entries]
    .filter(entry => entry.sensitive || (typeof entry.value === "string" && isSuspiciousText(entry.value))
      || entry.segments.some(segment => isSensitiveName(segment) || isSuspiciousText(segment)))
    .map(entry => entry.normalizedPath).filter(path => path !== "");
  const differences: ConfigurationDifference[] = paths.map(path => {
    const before = leftEntries.get(path); const after = rightEntries.get(path);
    const segments = before?.segments ?? after?.segments ?? [];
    const sensitive = Boolean(before?.sensitive || after?.sensitive
      || segments.some(segment => isSensitiveName(segment) || isSuspiciousText(segment))
      || (before && typeof before.value === "string" && isSuspiciousText(before.value))
      || (after && typeof after.value === "string" && isSuspiciousText(after.value))
      || sensitivePrefixes.some(prefix => prefix === path || path.startsWith(`${prefix}/`)));
    if (sensitive) return {
      path: "[sensitive path omitted]", status: "not-compared", before: before ? "[REDACTED]" : null,
      after: after ? "[REDACTED]" : null, beforeType: null, afterType: null,
      leftLine: before?.sourceLine ?? null, rightLine: after?.sourceLine ?? null,
    };
    let status: ConfigurationDifferenceStatus;
    if (!before) status = "added";
    else if (!after) status = "removed";
    else if (before.valueType !== after.valueType) status = "type-changed";
    else status = before.valueType === "number"
      ? before.numberLexeme === after.numberLexeme ? "unchanged" : "changed"
      : JSON.stringify(before.value) === JSON.stringify(after.value) ? "unchanged" : "changed";
    return {
      path: displayPath(segments), status,
      before: before ? (before.numberLexeme ?? safeValue(before.value, before.valueType)) : null,
      after: after ? (after.numberLexeme ?? safeValue(after.value, after.valueType)) : null,
      beforeType: before?.valueType ?? null, afterType: after?.valueType ?? null,
      leftLine: before?.sourceLine ?? null, rightLine: after?.sourceLine ?? null,
    };
  });
  return { format: left.format, differences };
}

/** Render a plain-text review artifact. It intentionally contains no source file names. */
export function renderConfigurationComparison(report: ConfigurationComparison): string {
  const changed = report.differences.filter(item => item.status !== "unchanged").length;
  const lines = [
    "MPU local configuration comparison",
    `Format: ${report.format}`,
    `Records: ${report.differences.length}; changed, added, removed or not compared: ${changed}`,
    "",
    "Review and sanitize source files before import. Secret masking is conservative and cannot guarantee that every secret or business identifier is detected.",
    "This compares supported text only; formatting, comments, order, runtime expansion and effective server configuration are not established.",
    "Container rows compare types; child rows compare contents. JSON number tokens are compared exactly, including their notation.",
    "",
    "Status | Path | Before (type, line) | After (type, line)",
  ];
  for (const item of report.differences) {
    const before = item.before === null ? "[missing]" : item.before;
    const after = item.after === null ? "[missing]" : item.after;
    const status = ["added", "removed", "changed", "type-changed", "unchanged", "not-compared"].includes(item.status) ? item.status : "not-compared";
    lines.push(`${status} | ${quoted(item.path)} | ${quoted(before)} (${visibleType(item.beforeType)}, ${Number.isInteger(item.leftLine) ? item.leftLine : "—"}) | ${quoted(after)} (${visibleType(item.afterType)}, ${Number.isInteger(item.rightLine) ? item.rightLine : "—"})`);
  }
  const rendered = lines.join("\n");
  if (utf8Length(rendered) > CONFIG_LIMITS.maxReportBytes) fail("Comparison report exceeds the output limit");
  return rendered;
}
