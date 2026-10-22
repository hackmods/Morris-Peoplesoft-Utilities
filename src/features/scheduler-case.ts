import type { SchedulerExcerpt } from "./scheduler-investigation";

export const SCHEDULER_CASE_FIELDS = [
  { key: "caseLabel", label: "Case label", maxLength: 200 },
  { key: "environmentLabel", label: "Environment label", maxLength: 200 },
  { key: "captureWindow", label: "Capture window", maxLength: 200 },
  { key: "processInstance", label: "Process instance", maxLength: 200 },
  { key: "owner", label: "Owner", maxLength: 200 },
  { key: "expected", label: "Expected", maxLength: 2_000 },
  { key: "observed", label: "Observed", maxLength: 2_000 },
  { key: "runObservation", label: "Run observation", maxLength: 2_000 },
  { key: "distributionObservation", label: "Distribution observation", maxLength: 2_000 },
  { key: "findings", label: "Findings", maxLength: 2_000 },
  { key: "followUp", label: "Follow-up", maxLength: 2_000 },
] as const;

type SchedulerCaseField = (typeof SCHEDULER_CASE_FIELDS)[number]["key"];
export type SchedulerCase = Partial<Record<SchedulerCaseField, string>> & { evidenceRefs?: string; focus?: string };

const INSTANCE = /^[1-9]\d{0,14}$/;
const REF = /^Source ([1-9]\d*):L([1-9]\d*)$/;
// Manual text is rendered on one physical report line. Reject controls and
// directional formatting before any value can reach the report or an error.
// eslint-disable-next-line no-control-regex
const UNSAFE_TEXT = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069\ufffd]/;
const PRIVATE_BEGIN = /-----BEGIN\b/i;
const PRIVATE_END = /-----END\b/i;

function invalid(): never {
  throw new Error("Unsupported Scheduler case draft.");
}

function sensitive(value: string): boolean {
  return /(?:pass(?:word|wd|phrase)|\bpwd\b|secret|token|credential|authorization|\bbearer\b|\bbasic\b|cookie|session|private[ _-]?key|certificate|connection[ _-]?string|\buser\b|\boprid\b|operator|run[ _-]?control|run_?cntl|database|\bdb(name)?\b|\bhost\b|\bserver\b|jdbc|odbc|ldap|wallet|signon|api[ _-]?key)/i.test(value)
    || value.includes("://") || value.includes("@")
    || /[A-Z]:[\\/]|\\\\|(?:^|\s)\/[\w.-]+\//i.test(value);
}

function supportedFocus(value: string, excerpts: SchedulerExcerpt[]): { source: number; instance: string } {
  const match = /^([1-9]\d*):([1-9]\d{0,14})$/.exec(value);
  if (!match || !INSTANCE.test(match[2]!)) return invalid();
  const source = Number(match[1]);
  const instance = match[2]!;
  if (!Number.isSafeInteger(source) || source > excerpts.length ||
      !excerpts[source - 1]?.lines.some(line => !line.masked && line.instance === instance)) return invalid();
  return { source, instance };
}

/** Choices are source-scoped. Equal instance numbers in different files stay separate. */
export function schedulerFocusChoices(excerpts: SchedulerExcerpt[]): Array<{ value: string; label: string }> {
  const choices: Array<{ value: string; label: string }> = [];
  const seen = new Set<string>();
  excerpts.forEach((excerpt, index) => {
    for (const line of excerpt.lines) {
      if (line.masked || !line.instance || !INSTANCE.test(line.instance)) continue;
      const value = `${index + 1}:${line.instance}`;
      if (seen.has(value)) continue;
      seen.add(value);
      choices.push({ value, label: `Source ${index + 1} — Process Instance ${line.instance}` });
    }
  });
  return choices;
}

/** Pure report lines for a local, manually asserted case draft. */
export function renderSchedulerCase(caseData: SchedulerCase, excerpts: SchedulerExcerpt[]): string[] {
  if (!caseData || typeof caseData !== "object" || Array.isArray(caseData) || !Array.isArray(excerpts)) return invalid();
  const allowed = new Set<string>([...SCHEDULER_CASE_FIELDS.map(field => field.key), "evidenceRefs", "focus"]);
  if (Object.keys(caseData).some(key => !allowed.has(key))) return invalid();

  const out = ["", "MANUAL SCHEDULER CASE — reviewer assertions; not verified by MPU"];
  let privateBlock = false;
  for (const field of SCHEDULER_CASE_FIELDS) {
    const value = caseData[field.key];
    if (value === undefined || value === "") {
      out.push(`${field.label}: unknown`);
      continue;
    }
    if (typeof value !== "string" || value.length > field.maxLength || UNSAFE_TEXT.test(value)) return invalid();
    if (!value.trim()) {
      out.push(`${field.label}: unknown`);
      continue;
    }
    let continuation = false;
    const redacted = value.split(/\r\n|\r|\n/).map(line => {
      if (PRIVATE_BEGIN.test(line)) privateBlock = true;
      const masked = privateBlock || continuation || sensitive(line);
      if (masked) continuation = true;
      if (PRIVATE_END.test(line)) privateBlock = false;
      return masked ? "[masked manual text]" : line;
    }).join("\n");
    const cell = JSON.stringify(redacted);
    out.push(`${field.label}: ${cell} | Manual assertion, unverified`);
    if (PRIVATE_END.test(value)) privateBlock = false;
  }

  const refs = caseData.evidenceRefs;
  if (refs === undefined || refs === "") {
    out.push("Evidence references: unknown");
  } else {
    if (typeof refs !== "string" || refs.length > 500 || UNSAFE_TEXT.test(refs)) return invalid();
    const citations = refs.split(",").map(ref => ref.trim());
    if (!citations.length || citations.some(ref => !REF.test(ref))) return invalid();
    const checked = citations.map(ref => {
      const match = REF.exec(ref)!;
      const source = Number(match[1]);
      const lineNumber = Number(match[2]);
      if (!Number.isSafeInteger(source) || !Number.isSafeInteger(lineNumber)) return invalid();
      const line = excerpts[source - 1]?.lines.find(record => record.line === lineNumber);
      if (!line || !line.text.trim()) return invalid();
      return `${ref}${line.masked ? " [masked; no detail extracted]" : ""}`;
    });
    out.push(`Evidence references: ${checked.join(", ")} | Manual citations, unverified`);
  }

  const focus = caseData.focus;
  if (focus === undefined || focus === "") {
    out.push("Selected process focus: unknown");
  } else {
    if (typeof focus !== "string" || focus.length > 32 || UNSAFE_TEXT.test(focus)) return invalid();
    const { source, instance } = supportedFocus(focus, excerpts);
    const lines = excerpts[source - 1]!.lines
      .filter(line => !line.masked && line.instance === instance)
      .map(line => `Source ${source}:L${line.line}`);
    out.push(`Selected process focus: Source ${source}; Process Instance ${instance} | Explicit labels in this source only; scope unverified`);
    if (caseData.processInstance?.trim() && caseData.processInstance.trim() !== instance) out.push("Scope warning: manually entered process instance differs from selected source labels. Resolve before sharing.");
    out.push(`Selected focus references: ${lines.join(", ")}`);
  }
  return out;
}
