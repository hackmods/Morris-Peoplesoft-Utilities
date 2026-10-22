/**
 * PeopleSoft tracesql / .trc excerpt parser for Options → Trace SQL.
 *
 * Clean reimplementation of the marker grammar observed in Oracle Trace Magic
 * (RETM legacy desktop tool). Not a vendor of Trace Magic source. Synthetic
 * fixtures only — real PeopleTools patch compatibility is unverified.
 */

export const TRACESQL_FORMAT = "PeopleSoft tracesql markers v1";
export const TRACESQL_LIMITS = {
  maxFiles: 1,
  maxBytes: 2_000_000,
  maxLines: 50_000,
  maxLineChars: 16_000,
  maxReportBytes: 1_500_000,
} as const;

export interface TraceSqlStatement {
  kind: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
  line: number;
  table: string;
  sql: string;
  durationExec: number;
  durationFetch: number;
  fetches: number;
  fingerprint: string;
}

export interface TracePeopleCodeEvent {
  kind: "start" | "end" | "begin" | "call";
  line: number;
  name: string;
  peopleCode: string;
  external: boolean;
  duration: number;
}

export interface TraceErrorLine {
  line: number;
  text: string;
}

export interface TraceSqlReport {
  statements: TraceSqlStatement[];
  events: TracePeopleCodeEvent[];
  calls: TracePeopleCodeEvent[];
  errors: TraceErrorLine[];
  totalLines: number;
  totals: {
    selectDuration: number;
    otherSqlDuration: number;
    eventDuration: number;
    selectCount: number;
    otherSqlCount: number;
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

function tryPeopleCode(reader: TraceReader, events: TracePeopleCodeEvent[]): boolean {
  const line = reader.current;
  const startAt = line.indexOf(">>> start");
  if (startAt >= 0) {
    let pos = startAt;
    ({ end: pos } = nextAtom(line, pos));
    ({ end: pos } = nextAtom(line, pos));
    ({ end: pos } = nextAtom(line, pos));
    const name = nextAtom(line, pos);
    const pc = nextAtom(line, name.end);
    events.push({
      kind: "start",
      line: reader.lineNumber,
      name: name.atom,
      peopleCode: pc.atom,
      external: false,
      duration: 0,
    });
    return true;
  }

  const extAt = line.indexOf("<<< end-ext");
  const endAt = extAt >= 0 ? extAt : line.indexOf("<<< end");
  const beginAt = line.indexOf(">>>>> Begin");
  if (endAt < 0 && beginAt < 0) return false;

  if (endAt >= 0) {
    const marker = extAt >= 0 ? "<<< end-ext" : "<<< end";
    const afterMarker = endAt + marker.length;
    const n = nextAtom(line, afterMarker);
    const p = nextAtom(line, n.end);
    events.push({
      kind: "end",
      line: reader.lineNumber,
      name: n.atom,
      peopleCode: p.atom,
      external: extAt >= 0,
      duration: parseDuration(line).value,
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
  });
  return true;
}

function tryCall(reader: TraceReader, calls: TracePeopleCodeEvent[]): boolean {
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
  });
  return true;
}

function trySelect(reader: TraceReader, statements: TraceSqlStatement[]): boolean {
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

  const whereAt = sqlBody.toUpperCase().indexOf(" WHERE ");
  const orderAt = sqlBody.toUpperCase().indexOf(" ORDER ");
  let where = "";
  if (whereAt >= 0) {
    where = orderAt > whereAt ? sqlBody.slice(whereAt, orderAt) : sqlBody.slice(whereAt);
    where = where.replace(/ WHERE /i, " ");
  }
  void where;

  statements.push({
    kind: "SELECT",
    line: startLine,
    table,
    sql: sqlBody,
    durationExec,
    durationFetch,
    fetches,
    fingerprint: fingerprint(sqlBody),
  });
  return true;
}

function tryOtherSql(reader: TraceReader, statements: TraceSqlStatement[]): boolean {
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
      statements.push({
        kind,
        line: startLine,
        table,
        sql: sqlBody,
        durationExec,
        durationFetch: 0,
        fetches: 0,
        fingerprint: fingerprint(sqlBody),
      });
      return true;
    }
    const bind = parseBind(next);
    if (bind) binds.push(bind);
  }
  return false;
}

/** Parse one sanitized tracesql / .trc excerpt in memory. */
export function parseTraceSql(input: string): TraceSqlReport {
  const text = assertSafeText(input);
  const reader = new TraceReader(text);
  const statements: TraceSqlStatement[] = [];
  const events: TracePeopleCodeEvent[] = [];
  const calls: TracePeopleCodeEvent[] = [];
  const errors: TraceErrorLine[] = [];

  while (reader.peek()) {
    reader.read();
    if (!reader.current) continue;
    if (isErrorLine(reader.current)) {
      errors.push({ line: reader.lineNumber, text: reader.current });
    }
    if (tryPeopleCode(reader, events) || tryCall(reader, calls) || trySelect(reader, statements) || tryOtherSql(reader, statements)) {
      continue;
    }
  }

  const selects = statements.filter((s) => s.kind === "SELECT");
  const others = statements.filter((s) => s.kind !== "SELECT");
  return {
    statements,
    events,
    calls,
    errors,
    totalLines: reader.totalLines,
    totals: {
      selectDuration: selects.reduce((sum, s) => sum + s.durationExec + s.durationFetch, 0),
      otherSqlDuration: others.reduce((sum, s) => sum + s.durationExec + s.durationFetch, 0),
      eventDuration: events.reduce((sum, e) => sum + e.duration, 0),
      selectCount: selects.length,
      otherSqlCount: others.length,
    },
  };
}

function aggregateByTable(statements: TraceSqlStatement[]): Array<{ table: string; kind: string; calls: number; duration: number }> {
  const map = new Map<string, { table: string; kind: string; calls: number; duration: number }>();
  for (const stmt of statements) {
    const key = `${stmt.kind}|${stmt.table}`;
    const row = map.get(key) ?? { table: stmt.table, kind: stmt.kind, calls: 0, duration: 0 };
    row.calls++;
    row.duration += stmt.durationExec + stmt.durationFetch;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.duration - a.duration || a.table.localeCompare(b.table));
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

/** Plain-text investigation report. Session memory only — no storage or network. */
export function renderTraceSqlInvestigation(input: string): string {
  const report = parseTraceSql(input);
  const byTable = aggregateByTable(report.statements);
  const topSql = [...report.statements]
    .sort((a, b) => b.durationExec + b.durationFetch - (a.durationExec + a.durationFetch))
    .slice(0, 40);
  const topEvents = [...report.events]
    .filter((e) => e.duration > 0)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 40);

  const out = new ReportLines([
    "MPU Trace SQL investigation — report v1",
    `Parser: ${TRACESQL_FORMAT}`,
    "Local sanitized .tracesql / .trc excerpt only. Filename omitted. Nothing is stored or sent over the network.",
    "Clean reimplementation of Trace Magic-style markers for browser use. Real PeopleTools patch compatibility unverified.",
    "SELECT statements without PS_/PS table tokens are ignored (legacy Trace Magic filter). Durations come from Dur= atoms.",
    "",
    "SUMMARY",
    `Physical lines: ${report.totalLines}`,
    `SELECT statements: ${report.totals.selectCount} (duration ${report.totals.selectDuration.toFixed(3)})`,
    `INSERT/UPDATE/DELETE: ${report.totals.otherSqlCount} (duration ${report.totals.otherSqlDuration.toFixed(3)})`,
    `PeopleCode events with duration: ${topEvents.length} (recorded event duration sum ${report.totals.eventDuration.toFixed(3)})`,
    `Error / exception lines: ${report.errors.length}`,
    "",
    "AGGREGATE BY TABLE — highest duration first",
  ]);
  if (!byTable.length) out.push("No PeopleSoft SQL statements recognized.");
  else {
    for (const row of byTable) {
      out.push(`${row.kind} ${JSON.stringify(row.table)} | calls ${row.calls} | duration ${row.duration.toFixed(3)}`);
    }
  }

  out.push("", "TOP SQL BY DURATION — original order citations");
  if (!topSql.length) out.push("No SQL statements.");
  else {
    for (const stmt of topSql) {
      out.push(
        `L${stmt.line} | ${stmt.kind} | Dur ${(stmt.durationExec + stmt.durationFetch).toFixed(3)} (exec ${stmt.durationExec.toFixed(3)} fetch ${stmt.durationFetch.toFixed(3)}) | fetches ${stmt.fetches} | ${stmt.fingerprint} | ${JSON.stringify(stmt.table)} | ${JSON.stringify(stmt.sql.slice(0, 500))}`,
      );
    }
  }

  out.push("", "PEOPLECODE EVENTS WITH DURATION");
  if (!topEvents.length) out.push("No timed PeopleCode end/begin markers.");
  else {
    for (const event of topEvents) {
      out.push(
        `L${event.line} | ${event.kind}${event.external ? " ext" : ""} | Dur ${event.duration.toFixed(3)} | ${JSON.stringify(event.name)} | ${JSON.stringify(event.peopleCode)}`,
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
