import { renderSchedulerCase, type SchedulerCase } from "./scheduler-case";

/** Deliberately narrow text grammar, not a parser for every delivered Scheduler log. */
export const SCHEDULER_FORMAT = "ISO-labelled scheduler excerpts v1";
export const SCHEDULER_LIMITS = { maxFiles: 4, maxBytes: 256_000, maxLines: 2_000, maxLineChars: 4_000, maxPackChars: 4_000, maxReportBytes: 1_000_000 } as const;

export interface SchedulerLine {
  line: number;
  text: string;
  timestamp: string | null;
  instant: number | null;
  instance: string | null;
  parent: string | null;
  masked: boolean;
}
export interface SchedulerExcerpt { lines: SchedulerLine[]; totalLines: number }

const byteLength = (value: string) => new TextEncoder().encode(value).byteLength;
const timestampPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))(?=\s|$)/;

function timestamp(raw: string): { text: string; instant: number } | null {
  const match = timestampPattern.exec(raw);
  if (!match) return null;
  const text = match[1];
  const [year, month, day, hour, minute, second] = text.slice(0, 19).split(/[-T:]/).map(Number);
  const days = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const offset = /([+-])(\d{2}):(\d{2})$/.exec(text);
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59
    || (offset && (Number(offset[2]) > 23 || Number(offset[3]) > 59))) return null;
  const instant = Date.parse(text);
  return Number.isFinite(instant) ? { text, instant } : null;
}

// Mask whole records rather than trying to isolate a credential value. Follow-on
// lines stay masked until an independently timestamped record begins.
function sensitive(text: string): boolean {
  return /(?:pass(?:word|wd|phrase)|\bpwd\b|secret|token|credential|authorization|\bbearer\b|\bbasic\b|cookie|session|private[ _-]?key|certificate|connection[ _-]?string|\buser\b|\boprid\b|operator|run[ _-]?control|run_?cntl|database|\bdb(name)?\b|\bhost\b|\bserver\b|jdbc|odbc|ldap|wallet|signon|api[ _-]?key)/i.test(text)
    // Fixed substring checks avoid quadratic scans on long nonmatching lines.
    || text.includes("://") || text.includes("@")
    || /[A-Z]:[\\/]|\\\\|(?:^|\s)\/[\w.-]+\//i.test(text);
}

/** No native/localized date guessing, status mapping, inherited IDs or filenames. */
export function parseSchedulerExcerpt(input: string): SchedulerExcerpt {
  // Reject binary/control data and replacement characters without echoing it.
  // eslint-disable-next-line no-control-regex
  if (byteLength(input) > SCHEDULER_LIMITS.maxBytes || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\ufffd]/.test(input)) throw new Error("Unsupported excerpt size or text encoding.");
  const rawLines = input.replace(/^\ufeff/, "").split(/\r\n|\r|\n/);
  if (rawLines.length > SCHEDULER_LIMITS.maxLines || rawLines.some(line => line.length > SCHEDULER_LIMITS.maxLineChars)) throw new Error("Excerpt line limits exceeded.");
  const lines: SchedulerLine[] = [];
  let maskContinuation = false;
  let privateBlock = false;
  rawLines.forEach((raw, index) => {
    const time = timestamp(raw);
    if (time && !privateBlock) maskContinuation = false;
    if (/-----BEGIN\b/.test(raw)) privateBlock = true;
    const masked = privateBlock || maskContinuation || sensitive(raw);
    if (masked) maskContinuation = true;
    if (/-----END\b/.test(raw)) privateBlock = false;
    if (!raw.trim()) return;
    // Only exact, semicolon-delimited labels count as evidence. Multiple labels
    // are ambiguous even when values match. Parent labels cannot become child IDs.
    const content = time ? raw.slice(time.text.length).trimStart() : raw;
    const label = (name: string) => {
      const matches = content.split(";").map(part => part.trim()).filter(part => part.startsWith(`${name}:`));
      if (matches.length !== 1) return null;
      const value = matches[0].slice(name.length + 1).trim();
      return /^[1-9]\d{0,14}$/.test(value) ? value : null;
    };
    const instance = masked ? null : label("Process Instance");
    const parentLabel = masked ? null : label("Parent Process Instance");
    const parent = instance && parentLabel !== instance ? parentLabel : null;
    lines.push({ line: index + 1, text: masked ? "[record masked; review sanitized original locally]" : raw, timestamp: masked ? null : time?.text ?? null,
      instant: masked ? null : time?.instant ?? null, instance, parent, masked });
  });
  if (!lines.length) throw new Error("Excerpt is empty.");
  return { lines, totalLines: rawLines.length };
}

/** Plain text uses JSON string escaping to keep imported text inside one cell. */
export function renderSchedulerInvestigation(inputs: string[], pack: string, caseData: SchedulerCase = {}): string {
  if (!inputs.length || inputs.length > SCHEDULER_LIMITS.maxFiles || pack.length > SCHEDULER_LIMITS.maxPackChars) throw new Error("Investigation limits exceeded.");
  const excerpts = inputs.map(parseSchedulerExcerpt);
  const rows = excerpts.flatMap((excerpt, source) => excerpt.lines.map(line => ({ ...line, source: source + 1 })));
  const ref = (row: { source: number; line: number }) => `Source ${row.source}:L${row.line}`;
  const out = new SchedulerReportLines(["MPU Process Scheduler investigation — report v2", `Parser: ${SCHEDULER_FORMAT}`,
    "Local excerpts and manually pasted ticket evidence only. Filenames omitted. Review all unmasked text before sharing.",
    "Evidence limits: synthetic parser coverage; real PeopleTools 8.62 log compatibility unverified. No server access or status verification.",
    "Timestamp order assumes comparable clocks and supplied offsets. No durations, root cause, run/distribution status, dependency or job execution order is inferred.",
    "Repeated instance numbers may belong to different environments or runs. Confirm scope in the originals; adjacency and matching numbers do not prove a relationship.",
    "Only explicit semicolon-delimited Process Instance and Parent Process Instance labels are extracted. Other IDs and dates remain unknown.",
    ...renderSchedulerCase(caseData, excerpts), "", "MANUALLY PASTED TICKET EVIDENCE"]);
  if (pack.trim()) out.push(...parseSchedulerExcerpt(pack).lines.map(line => `Ticket:L${line.line} | ${JSON.stringify(line.text)}`));
  else out.push("Not supplied. Copy the existing Process Monitor ticket pack explicitly, then paste sanitized evidence here if useful.");
  out.push("", "SOURCE COVERAGE");
  excerpts.forEach((excerpt, index) => out.push(`Source ${index + 1}: ${excerpt.totalLines} physical lines; ${excerpt.lines.length} nonblank records; ${excerpt.lines.filter(line => line.masked).length} masked; ${excerpt.lines.filter(line => line.instant === null).length} without a usable timestamp.`));
  out.push("", "TIMELINE — explicit offset timestamps only");
  const timed = rows.filter(row => row.instant !== null).sort((a, b) => a.instant! - b.instant! || a.source - b.source || a.line - b.line);
  if (!timed.length) out.push("No supported timestamps. Chronology unknown.");
  timed.forEach(row => out.push(`${ref(row)} | ${row.timestamp} | Instance ${row.instance ?? "unknown"} | ${JSON.stringify(row.text)}`));
  out.push("", "EXPLICIT PARENT LABEL EVIDENCE — reported claims, not verified dependencies");
  const relationships = rows.filter(row => row.parent);
  if (!relationships.length) out.push("No unambiguous explicit parent/child labels. Relationships unknown.");
  relationships.forEach(row => out.push(`${ref(row)} | Parent ${row.parent} -> Instance ${row.instance}`));
  const parentsByChild = new Map<string, Set<string>>();
  relationships.forEach(row => { const parents = parentsByChild.get(row.instance!) ?? new Set<string>(); parents.add(row.parent!); parentsByChild.set(row.instance!, parents); });
  for (const [child, parents] of parentsByChild) if (parents.size > 1) out.push(`Conflicting parent labels for Instance ${child}; resolve using cited source lines. No authoritative parent selected.`);
  out.push("", "ALL SOURCE RECORDS — original order; no timestamp/instance inheritance");
  rows.forEach(row => out.push(`${ref(row)} | Time ${row.timestamp ?? "unknown"} | Instance ${row.instance ?? "unknown"} | ${JSON.stringify(row.text)}`));
  out.push("", "FOLLOW-UP CHECKS (manual)", "Confirm environment, process instance and capture window; obtain missing original lines and clock/offset context.",
    "Check Process Monitor run status and distribution evidence separately; confirm job relationships in authorized system evidence.",
    "Review masked and unsupported records locally. A success word, missing error or timestamp gap does not establish completion or a cause.");
  return out.join();
}

class SchedulerReportLines {
  private lines: string[] = [];
  private bytes = 0;
  constructor(lines: string[]) { this.push(...lines); }
  push(...lines: string[]): void {
    for (const line of lines) {
      this.bytes += byteLength(line) + (this.lines.length ? 1 : 0);
      if (this.bytes > SCHEDULER_LIMITS.maxReportBytes) throw new Error("Report limit exceeded. Use smaller excerpts.");
      this.lines.push(line);
    }
  }
  join(): string { return this.lines.join("\n"); }
}
