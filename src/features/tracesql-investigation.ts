/**
 * PeopleSoft tracesql / .trc excerpt parser for Options → Trace SQL.
 *
 * Clean reimplementation of the marker grammar observed in Oracle Trace Magic
 * (RETM legacy desktop tool). Not a vendor of Trace Magic source. Synthetic
 * fixtures only — real PeopleTools patch compatibility is unverified.
 */

import { traceMagicSqlId } from "./tracesql-md5";

export const TRACESQL_FORMAT = "PeopleSoft tracesql markers v1";
export const TRACESQL_LIMITS = {
  maxFiles: 2,
  maxBytes: 2_000_000,
  maxLines: 50_000,
  maxLineChars: 16_000,
  maxReportBytes: 1_500_000,
} as const;

export interface TraceSqlStatement {
  kind: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
  line: number;
  table: string;
  where: string;
  sql: string;
  durationExec: number;
  durationFetch: number;
  fetches: number;
  /** Trace Magic–compatible `getMD5Hash` SQL ID. */
  sqlId: string;
  fingerprint: string;
}

export interface TracePeopleCodeEvent {
  kind: "start" | "end" | "begin" | "call";
  line: number;
  name: string;
  peopleCode: string;
  external: boolean;
  duration: number;
  level: number;
}

export interface TracePlanNode {
  line: number;
  level: number;
  label: string;
  duration: number;
  kind: "peoplecode" | "sql" | "call";
}

export interface TraceErrorLine {
  line: number;
  text: string;
}

export interface TraceSqlReport {
  statements: TraceSqlStatement[];
  events: TracePeopleCodeEvent[];
  calls: TracePeopleCodeEvent[];
  plan: TracePlanNode[];
  errors: TraceErrorLine[];
  totalLines: number;
  totals: {
    selectDuration: number;
    otherSqlDuration: number;
    eventDuration: number;
    eventInternalDuration: number;
    eventExternalDuration: number;
    selectCount: number;
    otherSqlCount: number;
    eventInternalCount: number;
    eventExternalCount: number;
  };
}

type Bind = { placeholder: string; value: string; type: string };

const byteLength = (value: string) => new TextEncoder().encode(value).byteLength;

/** Reject binary/control data without echoing it. */
function assertSafeText(input: string): string {
  // eslint-disable-next-line no-control-regex
  if (byteLength(input) > TRACESQL_LIMITS.maxBytes || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\ufffd]/.test(input)) {
    throw new Error("Unsupported tracesql size or text encoding.");
  }
  const text = input.replace(/^\ufeff/, "");
  const lines = text.split(/\r\n|\r|\n/);
  if (lines.length > TRACESQL_LIMITS.maxLines || lines.some((line) => line.length > TRACESQL_LIMITS.maxLineChars)) {
    throw new Error("Tracesql line limits exceeded.");
  }
  return text;
}

function fingerprint(sql: string): string {
  let hash = 2166136261;
  for (let i = 0; i < sql.length; i++) {
    hash ^= sql.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `mpu${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function idsFor(sql: string): { sqlId: string; fingerprint: string } {
  return { sqlId: traceMagicSqlId(sql), fingerprint: fingerprint(sql) };
}

function extractWhere(sql: string): string {
  const upper = sql.toUpperCase();
  const whereAt = upper.indexOf(" WHERE ");
  if (whereAt < 0) return "";
  const orderAt = upper.indexOf(" ORDER ");
  const slice = orderAt > whereAt ? sql.slice(whereAt, orderAt) : sql.slice(whereAt);
  return slice.replace(/ WHERE /i, " ").trim();
}

function nextAtom(line: string, start: number): { atom: string; end: number } {
  let i = start;
  while (i < line.length && line[i] === " ") i++;
  let atom = "";
  for (; i < line.length; i++) {
    if (line[i] === " ") return { atom, end: i };
    atom += line[i];
  }
  return { atom, end: i };
}

function parseDuration(line: string, at = 0): { value: number; end: number } {
  const idx = at > 0 ? at : line.indexOf(" Dur=");
  if (idx < 0) return { value: 0, end: 0 };
  const { atom, end } = nextAtom(line, idx + 5);
  const value = Number(atom);
  return { value: Number.isFinite(value) ? value : 0, end };
}

function replaceBinds(sql: string, binds: Bind[]): string {
  let out = sql;
  for (let i = binds.length - 1; i >= 0; i--) {
    const bind = binds[i];
    const at = out.indexOf(bind.placeholder);
    if (at < 0) continue;
    const quoted = bind.type === "18" || bind.type === "19" ? bind.value : `'${bind.value}'`;
    out = out.slice(0, at) + quoted + out.slice(at + bind.placeholder.length);
  }
  return out;
}

function parseBind(line: string): Bind | null {
  const at = line.indexOf(" Bind-");
  if (at < 0) return null;
  let i = at + 6;
  let placeholder = "";
  while (i < line.length && line[i] !== " ") {
    placeholder += line[i];
    i++;
  }
  i += 6;
  let type = "";
  while (i < line.length && line[i] !== " ") {
    type += line[i];
    i++;
  }
  let value = "";
  let j = line.length - 1;
  while (j >= 0 && line[j] !== "=") {
    value = line[j] + value;
    j--;
  }
  if (j < 0) return null;
  return { placeholder: `:${placeholder}`, value, type };
}

function isPeopleSoftTable(token: string): boolean {
  const upper = token.toUpperCase();
  return upper.startsWith("PS_") || upper.startsWith("PS");
}

function isErrorLine(line: string): boolean {
  return (
    line.includes("Caught Exception:") ||
    line.includes("ErrorReturn->") ||
    line.startsWith("Called from:") ||
    line.includes("SQL error. Function:") ||
    line.startsWith("  Error Position:") ||
    line.startsWith("  Return:") ||
    line.startsWith("  Statement:") ||
    line.startsWith("  Original Statement:")
  );
}

class TraceReader {
  private lines: string[];
  private index = 0;
  private pushback: string | null = null;
  lineNumber = 0;
  current = "";

  constructor(text: string) {
    this.lines = text.split(/\r\n|\r|\n/);
  }

  get totalLines(): number {
    return this.lines.length;
  }

  peek(): boolean {
    return this.pushback !== null || this.index < this.lines.length;
  }

  read(): string {
    if (this.pushback !== null) {
      this.current = this.pushback;
      this.pushback = null;
      return this.current;
    }
    if (this.index >= this.lines.length) {
      this.current = "";
      return this.current;
    }
    this.current = this.lines[this.index++];
    this.lineNumber++;
    return this.current;
  }

  unread(line: string): void {
    this.pushback = line;
  }
}

function tryPeopleCode(
  reader: TraceReader,
  events: TracePeopleCodeEvent[],
  plan: TracePlanNode[],
  nest: { level: number },
): boolean {
  const line = reader.current;
  const startAt = line.indexOf(">>> start");
  if (startAt >= 0) {
    let pos = startAt;
    ({ end: pos } = nextAtom(line, pos));
    ({ end: pos } = nextAtom(line, pos));
    ({ end: pos } = nextAtom(line, pos));
    const name = nextAtom(line, pos);
    const pc = nextAtom(line, name.end);
    const label = `${name.atom} --- ${pc.atom}`;
    events.push({
      kind: "start",
      line: reader.lineNumber,
      name: name.atom,
      peopleCode: pc.atom,
      external: false,
      duration: 0,
      level: nest.level,
    });
    plan.push({ line: reader.lineNumber, level: nest.level, label, duration: 0, kind: "peoplecode" });
    nest.level++;
    return true;
  }

  const extAt = line.indexOf("<<< end-ext");
  const endAt = extAt >= 0 ? extAt : line.indexOf("<<< end");
  const beginAt = line.indexOf(">>>>> Begin");
  if (endAt < 0 && beginAt < 0) return false;

  if (endAt >= 0) {
    nest.level = Math.max(0, nest.level - 1);
    const marker = extAt >= 0 ? "<<< end-ext" : "<<< end";
    const afterMarker = endAt + marker.length;
    const n = nextAtom(line, afterMarker);
    const p = nextAtom(line, n.end);
    const duration = parseDuration(line).value;
    events.push({
      kind: "end",
      line: reader.lineNumber,
      name: n.atom,
      peopleCode: p.atom,
      external: extAt >= 0,
      duration,
      level: nest.level,
    });
    plan.push({
      line: reader.lineNumber,
      level: nest.level,
      label: `${extAt >= 0 ? "end-ext" : "end"} ${n.atom} --- ${p.atom}`,
      duration,
      kind: "peoplecode",
    });
    return true;
  }

  let name = "";
  const peopleCode = nextAtom(line, beginAt + ">>>>> Begin".length).atom;
  if (reader.peek()) {
    const next = reader.read();
    const methodAt = next.indexOf(": method");
    const fnAt = next.indexOf(": function");
    const getAt = next.indexOf(": get");
    const setAt = next.indexOf(": set");
    if (methodAt >= 0) name = `method:   ${nextAtom(next, methodAt + 8).atom}`;
    else if (fnAt >= 0) name = `function: ${nextAtom(next, fnAt + 10).atom}`;
    else if (getAt >= 0) name = `get:      ${nextAtom(next, getAt + 5).atom}`;
    else if (setAt >= 0) name = `set:      ${nextAtom(next, setAt + 5).atom}`;
    else reader.unread(next);
  }
  events.push({
    kind: "begin",
    line: reader.lineNumber,
    name,
    peopleCode,
    external: false,
    duration: 0,
    level: nest.level,
  });
  plan.push({
    line: reader.lineNumber,
    level: nest.level,
    label: `begin ${name || peopleCode}`,
    duration: 0,
    kind: "peoplecode",
  });
  return true;
}

function tryCall(reader: TraceReader, calls: TracePeopleCodeEvent[], plan: TracePlanNode[], nest: { level: number }): boolean {
  const at = reader.current.indexOf("    call ");
  if (at < 0) return false;
  const kindAtom = nextAtom(reader.current, at + 9);
  const target = nextAtom(reader.current, kindAtom.end);
  let name = kindAtom.atom;
  if (name === "int") name = "internal";
  else if (name === "getter") name = "get";
  else if (name === "setter") name = "set";
  calls.push({
    kind: "call",
    line: reader.lineNumber,
    name,
    peopleCode: target.atom,
    external: false,
    duration: 0,
    level: nest.level,
  });
  plan.push({
    line: reader.lineNumber,
    level: nest.level,
    label: `${name} --- ${target.atom}`,
    duration: 0,
    kind: "call",
  });
  return true;
}

function trySelect(reader: TraceReader, statements: TraceSqlStatement[], plan: TracePlanNode[], nest: { level: number }): boolean {
  let text = reader.current;
  let upper = text.toUpperCase();
  let at = upper.indexOf("COM STMT=SELECT");
  if (at < 0) {
    at = upper.indexOf("COM STMT= SELECT");
    if (at < 0) return false;
  }
  const startLine = reader.lineNumber;
  let pos = at + 15;
  while (!upper.includes(" FROM ")) {
    if (!reader.peek()) return false;
    text += reader.read();
    upper = text.toUpperCase();
  }
  let sqlBody = upper.slice(at + 9);
  let atom = nextAtom(upper, pos);
  while (atom.atom.endsWith(",") || atom.atom.toUpperCase() !== "FROM") {
    atom = nextAtom(upper, atom.end);
    if (!atom.atom) break;
  }
  let table = nextAtom(upper, atom.end).atom.toUpperCase();
  pos = nextAtom(upper, atom.end).end;
  let peopleSoft = isPeopleSoftTable(table);
  while (true) {
    atom = nextAtom(upper, pos);
    const token = atom.atom.toUpperCase();
    pos = atom.end;
    if (!token || token === "WHERE" || token === "ORDER") break;
    table = `${table} ${token}`;
    if (token.startsWith("PS_")) peopleSoft = true;
  }
  if (!peopleSoft) return false;

  let durationExec = 0;
  let durationFetch = 0;
  let fetches = 0;
  const binds: Bind[] = [];
  while (reader.peek()) {
    const next = reader.read();
    const dur = parseDuration(next);
    if (dur.value) durationExec += dur.value;
    if (next.endsWith("EXE") || next.endsWith("Disconnect")) break;
    const bind = parseBind(next);
    if (bind) binds.push(bind);
  }

  sqlBody = replaceBinds(sqlBody, binds);
  while (reader.peek()) {
    const next = reader.read();
    const durAt = next.indexOf(" Dur=");
    if (durAt < 0) {
      reader.unread(next);
      break;
    }
    const { value, end } = parseDuration(next, durAt);
    const label = nextAtom(next, end).atom;
    if (label === "Fetch") {
      fetches++;
      durationFetch += value;
      continue;
    }
    if (label === "GLS" || label === "RLO" || label === "ELO") {
      durationFetch += value;
      continue;
    }
    reader.unread(next);
    break;
  }

  const where = extractWhere(sqlBody);
  const id = idsFor(sqlBody);
  statements.push({
    kind: "SELECT",
    line: startLine,
    table,
    where,
    sql: sqlBody,
    durationExec,
    durationFetch,
    fetches,
    sqlId: id.sqlId,
    fingerprint: id.fingerprint,
  });
  plan.push({
    line: startLine,
    level: nest.level,
    label: `SELECT FROM ${table} (Dur=${(durationExec + durationFetch).toFixed(3)})`,
    duration: durationExec + durationFetch,
    kind: "sql",
  });
  return true;
}

function tryOtherSql(reader: TraceReader, statements: TraceSqlStatement[], plan: TracePlanNode[], nest: { level: number }): boolean {
  const upper = reader.current.toUpperCase();
  let kind: TraceSqlStatement["kind"] | null = null;
  let at = upper.indexOf("COM STMT=INSERT");
  if (at >= 0) kind = "INSERT";
  else {
    at = upper.indexOf("COM STMT=UPDATE");
    if (at >= 0) kind = "UPDATE";
    else {
      at = upper.indexOf("COM STMT=DELETE");
      if (at >= 0) kind = "DELETE";
    }
  }
  if (kind === null || at < 0) return false;

  const startLine = reader.lineNumber;
  let sqlBody = upper.slice(at + 9);
  let pos = at + 15;
  if (kind !== "UPDATE") ({ end: pos } = nextAtom(upper, pos));
  let table = nextAtom(upper, pos).atom.toUpperCase();
  const paren = table.indexOf("(");
  if (paren >= 0) table = table.slice(0, paren);

  let durationExec = 0;
  const binds: Bind[] = [];
  while (reader.peek()) {
    const next = reader.read();
    const dur = parseDuration(next);
    if (dur.value) durationExec += dur.value;
    if (next.endsWith("EXE") || next.endsWith("Disconnect")) {
      sqlBody = replaceBinds(sqlBody, binds);
      const id = idsFor(sqlBody);
      statements.push({
        kind,
        line: startLine,
        table,
        where: extractWhere(sqlBody),
        sql: sqlBody,
        durationExec,
        durationFetch: 0,
        fetches: 0,
        sqlId: id.sqlId,
        fingerprint: id.fingerprint,
      });
      plan.push({
        line: startLine,
        level: nest.level,
        label: `${kind} ${table} (Dur=${durationExec.toFixed(3)})`,
        duration: durationExec,
        kind: "sql",
      });
      return true;
    }
    const bind = parseBind(next);
    if (bind) binds.push(bind);
  }
  return false;
}

function finishReport(
  reader: TraceReader,
  statements: TraceSqlStatement[],
  events: TracePeopleCodeEvent[],
  calls: TracePeopleCodeEvent[],
  plan: TracePlanNode[],
  errors: TraceErrorLine[],
): TraceSqlReport {
  const selects = statements.filter((s) => s.kind === "SELECT");
  const others = statements.filter((s) => s.kind !== "SELECT");
  const timedEnds = events.filter((e) => e.kind === "end" && e.duration > 0);
  const internal = timedEnds.filter((e) => !e.external);
  const external = timedEnds.filter((e) => e.external);
  return {
    statements,
    events,
    calls,
    plan,
    errors,
    totalLines: reader.totalLines,
    totals: {
      selectDuration: selects.reduce((sum, s) => sum + s.durationExec + s.durationFetch, 0),
      otherSqlDuration: others.reduce((sum, s) => sum + s.durationExec + s.durationFetch, 0),
      eventDuration: events.reduce((sum, e) => sum + e.duration, 0),
      eventInternalDuration: internal.reduce((sum, e) => sum + e.duration, 0),
      eventExternalDuration: external.reduce((sum, e) => sum + e.duration, 0),
      selectCount: selects.length,
      otherSqlCount: others.length,
      eventInternalCount: internal.length,
      eventExternalCount: external.length,
    },
  };
}

function consumeCurrentLine(
  reader: TraceReader,
  statements: TraceSqlStatement[],
  events: TracePeopleCodeEvent[],
  calls: TracePeopleCodeEvent[],
  plan: TracePlanNode[],
  errors: TraceErrorLine[],
  nest: { level: number },
): void {
  if (!reader.current) return;
  if (isErrorLine(reader.current)) errors.push({ line: reader.lineNumber, text: reader.current });
  tryPeopleCode(reader, events, plan, nest) ||
    tryCall(reader, calls, plan, nest) ||
    trySelect(reader, statements, plan, nest) ||
    tryOtherSql(reader, statements, plan, nest);
}

/** Parse one sanitized tracesql / .trc excerpt in memory. */
export function parseTraceSql(input: string): TraceSqlReport {
  const reader = new TraceReader(assertSafeText(input));
  const statements: TraceSqlStatement[] = [];
  const events: TracePeopleCodeEvent[] = [];
  const calls: TracePeopleCodeEvent[] = [];
  const plan: TracePlanNode[] = [];
  const errors: TraceErrorLine[] = [];
  const nest = { level: 0 };
  while (reader.peek()) {
    reader.read();
    consumeCurrentLine(reader, statements, events, calls, plan, errors, nest);
  }
  return finishReport(reader, statements, events, calls, plan, errors);
}

/** Same parse with abort and progress so Options can cancel large excerpts. */
export async function parseTraceSqlAsync(
  input: string,
  options: { signal?: AbortSignal; onProgress?: (line: number, total: number) => void } = {},
): Promise<TraceSqlReport> {
  const reader = new TraceReader(assertSafeText(input));
  const statements: TraceSqlStatement[] = [];
  const events: TracePeopleCodeEvent[] = [];
  const calls: TracePeopleCodeEvent[] = [];
  const plan: TracePlanNode[] = [];
  const errors: TraceErrorLine[] = [];
  const nest = { level: 0 };
  let steps = 0;
  while (reader.peek()) {
    if (options.signal?.aborted) throw new DOMException("The operation was aborted.", "AbortError");
    reader.read();
    consumeCurrentLine(reader, statements, events, calls, plan, errors, nest);
    steps++;
    if (steps % 400 === 0) {
      options.onProgress?.(reader.lineNumber, reader.totalLines);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  return finishReport(reader, statements, events, calls, plan, errors);
}

export function aggregateByTable(statements: TraceSqlStatement[]): Array<{
  table: string;
  kind: string;
  calls: number;
  duration: number;
  durationExec: number;
  durationFetch: number;
}> {
  const map = new Map<string, { table: string; kind: string; calls: number; duration: number; durationExec: number; durationFetch: number }>();
  for (const stmt of statements) {
    const key = `${stmt.kind}|${stmt.table}`;
    const row = map.get(key) ?? { table: stmt.table, kind: stmt.kind, calls: 0, duration: 0, durationExec: 0, durationFetch: 0 };
    row.calls++;
    row.durationExec += stmt.durationExec;
    row.durationFetch += stmt.durationFetch;
    row.duration += stmt.durationExec + stmt.durationFetch;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.duration - a.duration || a.table.localeCompare(b.table));
}

export function aggregateByWhere(statements: TraceSqlStatement[]): Array<{
  sql: string;
  where: string;
  table: string;
  calls: number;
  duration: number;
  durationExec: number;
  durationFetch: number;
  sqlId: string;
}> {
  const map = new Map<string, {
    sql: string;
    where: string;
    table: string;
    calls: number;
    duration: number;
    durationExec: number;
    durationFetch: number;
    sqlId: string;
  }>();
  for (const stmt of statements) {
    const row = map.get(stmt.sql) ?? {
      sql: stmt.sql,
      where: stmt.where,
      table: stmt.table,
      calls: 0,
      duration: 0,
      durationExec: 0,
      durationFetch: 0,
      sqlId: stmt.sqlId,
    };
    row.calls++;
    row.durationExec += stmt.durationExec;
    row.durationFetch += stmt.durationFetch;
    row.duration += stmt.durationExec + stmt.durationFetch;
    map.set(stmt.sql, row);
  }
  return [...map.values()].sort((a, b) => b.duration - a.duration || a.sqlId.localeCompare(b.sqlId));
}

/** Unique post-bind SQL text only — no durations, charts or filenames. */
export function renderTraceSqlSqlOnly(report: TraceSqlReport): string {
  const rows = aggregateByWhere(report.statements);
  const out = new ReportLines([
    "MPU Trace SQL statements only",
    `Parser: ${TRACESQL_FORMAT}`,
    "No stats, charts or filenames. Review for sensitive literals before sharing.",
    "",
  ]);
  if (!rows.length) out.push("No PeopleSoft SQL statements recognized.");
  else for (const row of rows) out.push(row.sql);
  return out.join();
}

export function timedPeopleCodeEnds(report: TraceSqlReport, external: boolean): TracePeopleCodeEvent[] {
  return report.events
    .filter((event) => event.kind === "end" && event.external === external && event.duration > 0)
    .sort((a, b) => b.duration - a.duration);
}

function asciiBar(value: number, max: number, width = 24): string {
  if (max <= 0 || value <= 0) return "".padEnd(width, "·");
  const filled = Math.max(1, Math.round((value / max) * width));
  return `${"#".repeat(filled)}${"·".repeat(Math.max(0, width - filled))}`;
}

class ReportLines {
  private lines: string[] = [];
  private bytes = 0;
  constructor(seed: string[]) {
    this.push(...seed);
  }
  push(...lines: string[]): void {
    for (const line of lines) {
      const next = this.bytes + byteLength(line) + (this.lines.length ? 1 : 0);
      if (next > TRACESQL_LIMITS.maxReportBytes) throw new Error("Report limit exceeded.");
      this.bytes = next;
      this.lines.push(line);
    }
  }
  join(): string {
    return this.lines.join("\n");
  }
}

export interface TraceSqlCompareRow {
  key: string;
  label: string;
  leftDuration: number;
  rightDuration: number;
  presence: "both" | "left" | "right";
}

function compareMaps(left: Map<string, { label: string; duration: number }>, right: Map<string, { label: string; duration: number }>): TraceSqlCompareRow[] {
  const keys = new Set([...left.keys(), ...right.keys()]);
  const rows: TraceSqlCompareRow[] = [];
  for (const key of keys) {
    const l = left.get(key);
    const r = right.get(key);
    rows.push({
      key,
      label: l?.label ?? r?.label ?? key,
      leftDuration: l?.duration ?? 0,
      rightDuration: r?.duration ?? 0,
      presence: l && r ? "both" : l ? "left" : "right",
    });
  }
  return rows.sort((a, b) => Math.abs(b.rightDuration - b.leftDuration) - Math.abs(a.rightDuration - a.leftDuration) || a.label.localeCompare(b.label));
}

export function compareTraceSqlBySqlId(left: TraceSqlReport, right: TraceSqlReport): TraceSqlCompareRow[] {
  const collect = (report: TraceSqlReport) => {
    const map = new Map<string, { label: string; duration: number }>();
    for (const stmt of report.statements) {
      const row = map.get(stmt.sqlId) ?? { label: `${stmt.sqlId} ${stmt.kind} ${stmt.table}`, duration: 0 };
      row.duration += stmt.durationExec + stmt.durationFetch;
      map.set(stmt.sqlId, row);
    }
    return map;
  };
  return compareMaps(collect(left), collect(right));
}

export function compareTraceSqlByFrom(left: TraceSqlReport, right: TraceSqlReport): TraceSqlCompareRow[] {
  const collect = (report: TraceSqlReport) => {
    const map = new Map<string, { label: string; duration: number }>();
    for (const row of aggregateByTable(report.statements)) {
      map.set(`${row.kind}|${row.table}`, { label: `${row.kind} ${row.table}`, duration: row.duration });
    }
    return map;
  };
  return compareMaps(collect(left), collect(right));
}

function renderCompareSection(out: ReportLines, title: string, rows: TraceSqlCompareRow[]): void {
  out.push("", title);
  if (!rows.length) {
    out.push("No SQL statements to compare.");
    return;
  }
  for (const row of rows.slice(0, 80)) {
    const delta = row.rightDuration - row.leftDuration;
    out.push(
      `${row.presence} | ${JSON.stringify(row.label)} | Dur A ${row.leftDuration.toFixed(3)} | Dur B ${row.rightDuration.toFixed(3)} | delta ${delta.toFixed(3)}`,
    );
  }
}

/** One or two sanitized excerpts. Filenames omitted. Session memory only. */
export function renderTraceSqlInvestigations(texts: string[]): string {
  if (texts.length < 1 || texts.length > TRACESQL_LIMITS.maxFiles) throw new Error("Unsupported tracesql file count.");
  if (texts.length === 1) return renderTraceSqlInvestigation(texts[0]);
  const left = parseTraceSql(texts[0]);
  const right = parseTraceSql(texts[1]);
  const out = new ReportLines([
    "MPU Trace SQL investigation — report v1",
    `Parser: ${TRACESQL_FORMAT}`,
    "Two sanitized excerpts compared in this browser tab. Filenames omitted. Nothing is stored or sent over the network.",
    "Real PeopleTools patch compatibility unverified.",
    "",
    "SUMMARY A",
    `Physical lines: ${left.totalLines} | SELECT ${left.totals.selectCount} Dur ${left.totals.selectDuration.toFixed(3)} | DML ${left.totals.otherSqlCount} Dur ${left.totals.otherSqlDuration.toFixed(3)}`,
    "SUMMARY B",
    `Physical lines: ${right.totalLines} | SELECT ${right.totals.selectCount} Dur ${right.totals.selectDuration.toFixed(3)} | DML ${right.totals.otherSqlCount} Dur ${right.totals.otherSqlDuration.toFixed(3)}`,
  ]);
  renderCompareSection(out, "COMPARE BY SQLID — present in one side or duration delta", compareTraceSqlBySqlId(left, right));
  out.push("", "FROM comparison matches exact parsed text, including aliases and joins. Different text does not establish missing database tables.");
  renderCompareSection(out, "COMPARE BY FROM — exact text present in one side or duration delta", compareTraceSqlByFrom(left, right));
  out.push("", "EXCERPT A — full hotspot report", renderTraceSqlInvestigation(texts[0]), "", "EXCERPT B — full hotspot report", renderTraceSqlInvestigation(texts[1]));
  return out.join();
}

/** Plain-text investigation report. Session memory only — no storage or network. */
export function renderTraceSqlInvestigation(input: string): string {
  const report = parseTraceSql(input);
  const byTable = aggregateByTable(report.statements);
  const byWhere = aggregateByWhere(report.statements);
  const topSql = [...report.statements]
    .sort((a, b) => b.durationExec + b.durationFetch - (a.durationExec + a.durationFetch))
    .slice(0, 40);
  const topEvents = [...report.events]
    .filter((e) => e.duration > 0)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 40);
  const chartMax = Math.max(0, ...byTable.map((row) => row.duration), ...topEvents.map((e) => e.duration));

  const out = new ReportLines([
    "MPU Trace SQL investigation — report v1",
    `Parser: ${TRACESQL_FORMAT}`,
    "Local sanitized .tracesql / .trc excerpt only. Filename omitted. Nothing is stored or sent over the network.",
    "Clean reimplementation of Trace Magic-style markers for browser use. Real PeopleTools patch compatibility unverified.",
    "SELECT statements without PS_/PS table tokens are ignored (legacy Trace Magic filter). Durations come from Dur= atoms.",
    "SQLID values use Trace Magic getMD5Hash encoding; fingerprint is an MPU-only FNV id.",
    "",
    "SUMMARY",
    `Physical lines: ${report.totalLines}`,
    `SELECT statements: ${report.totals.selectCount} (duration ${report.totals.selectDuration.toFixed(3)})`,
    `INSERT/UPDATE/DELETE: ${report.totals.otherSqlCount} (duration ${report.totals.otherSqlDuration.toFixed(3)})`,
    `PeopleCode events with duration: ${topEvents.length} (recorded event duration sum ${report.totals.eventDuration.toFixed(3)})`,
    `Plan nodes: ${report.plan.length}`,
    `Error / exception lines: ${report.errors.length}`,
    "",
    "DURATION CHART — tables (accessible text bars)",
  ]);
  if (!byTable.length) out.push("No PeopleSoft SQL statements recognized.");
  else {
    for (const row of byTable.slice(0, 15)) {
      out.push(`${asciiBar(row.duration, chartMax)} ${row.duration.toFixed(3)}s | ${row.kind} ${JSON.stringify(row.table)} ×${row.calls}`);
    }
  }

  out.push("", "DURATION CHART — PeopleCode ends");
  if (!topEvents.length) out.push("No timed PeopleCode end markers.");
  else {
    for (const event of topEvents.slice(0, 15)) {
      out.push(
        `${asciiBar(event.duration, chartMax)} ${event.duration.toFixed(3)}s | L${event.line} ${JSON.stringify(event.name)} ${JSON.stringify(event.peopleCode)}`,
      );
    }
  }

  out.push("", "AGGREGATE BY EXACT FROM TEXT (aliases retained) — highest duration first");
  if (!byTable.length) out.push("No PeopleSoft SQL statements recognized.");
  else {
    for (const row of byTable) {
      out.push(`${row.kind} ${JSON.stringify(row.table)} | calls ${row.calls} | duration ${row.duration.toFixed(3)}`);
    }
  }

  out.push("", "AGGREGATE BY WHERE (unique post-bind SQL) — highest duration first");
  if (!byWhere.length) out.push("No SQL statements.");
  else {
    for (const row of byWhere.slice(0, 40)) {
      out.push(
        `SQLID ${row.sqlId} | calls ${row.calls} | duration ${row.duration.toFixed(3)} | table ${JSON.stringify(row.table)} | where ${JSON.stringify(row.where.slice(0, 200))} | ${JSON.stringify(row.sql.slice(0, 300))}`,
      );
    }
  }

  out.push("", "TOP SQL BY DURATION — original order citations");
  if (!topSql.length) out.push("No SQL statements.");
  else {
    for (const stmt of topSql) {
      out.push(
        `L${stmt.line} | ${stmt.kind} | Dur ${(stmt.durationExec + stmt.durationFetch).toFixed(3)} (exec ${stmt.durationExec.toFixed(3)} fetch ${stmt.durationFetch.toFixed(3)}) | fetches ${stmt.fetches} | SQLID ${stmt.sqlId} | ${stmt.fingerprint} | ${JSON.stringify(stmt.table)} | ${JSON.stringify(stmt.sql.slice(0, 500))}`,
      );
    }
  }

  out.push("", "PLAN TREE — nest level from >>> start / <<< end (text stand-in for Trace Magic PlanTreeView)");
  if (!report.plan.length) out.push("No plan nodes.");
  else {
    for (const node of report.plan.slice(0, 200)) {
      const indent = "  ".repeat(node.level);
      const dur = node.duration > 0 ? ` Dur=${node.duration.toFixed(3)}` : "";
      out.push(`${indent}L${node.line} [${node.kind}] ${node.label}${dur}`);
    }
  }

  out.push("", "PEOPLECODE EVENTS WITH DURATION");
  if (!topEvents.length) out.push("No timed PeopleCode end/begin markers.");
  else {
    for (const event of topEvents) {
      out.push(
        `L${event.line} | ${event.kind}${event.external ? " ext" : ""} | level ${event.level} | Dur ${event.duration.toFixed(3)} | ${JSON.stringify(event.name)} | ${JSON.stringify(event.peopleCode)}`,
      );
    }
  }

  out.push("", "CALL MARKERS (count only)");
  const callCounts = new Map<string, number>();
  for (const call of report.calls) {
    const key = `${call.name}~${call.peopleCode}`;
    callCounts.set(key, (callCounts.get(key) ?? 0) + 1);
  }
  if (!callCounts.size) out.push("No call markers.");
  else {
    for (const [key, count] of [...callCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) {
      out.push(`${count} × ${JSON.stringify(key)}`);
    }
  }

  out.push("", "ERROR / EXCEPTION LINES");
  if (!report.errors.length) out.push("None detected.");
  else {
    for (const err of report.errors.slice(0, 100)) {
      out.push(`L${err.line} | ${JSON.stringify(err.text)}`);
    }
  }

  out.push(
    "",
    "FOLLOW-UP",
    "Confirm the excerpt matches the intended environment and capture window.",
    "Sanitize binds and PII before sharing. Review every unmasked SQL string.",
    "Cross-check hotspots in Process Monitor / SQL logs; this report does not prove root cause.",
  );
  return out.join();
}
