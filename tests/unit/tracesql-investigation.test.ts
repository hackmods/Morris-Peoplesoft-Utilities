import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compareTraceSqlByFrom, compareTraceSqlBySqlId, parseTraceSql, parseTraceSqlAsync, renderParsedTraceSqlInvestigations, renderTraceSqlInvestigation, renderTraceSqlInvestigations, renderTraceSqlSqlOnly, timedPeopleCodeEnds, TRACESQL_LIMITS } from "@/features/tracesql-investigation";
import { md5Bytes, traceMagicSqlId } from "@/features/tracesql-md5";

const fixture = (name: string) => readFileSync(resolve(process.cwd(), "tests/fixtures/tracesql-investigation", name), "utf8");

describe("PeopleSoft tracesql markers v1", () => {
  it("renders the same single and comparison evidence from already parsed reports", () => {
    const texts = [fixture("sample.tracesql"), "COM Stmt=SELECT B.DEPTID FROM PS_JOB B\n Dur=1.000 EXE"];
    // Captured from the pre-consolidation renderer at 7e2fa15, independently of the new path.
    const originalHashes = ["6bf182f60e94bd74d567b359cc1281eea6b33a3a78b280819e9b8158a7c0e887", "a5acc417b8937392fc89f78d0913fe85f564d551eef3d18f7a02858110a0788b"];
    for (const [index, selected] of [texts.slice(0, 1), texts].entries()) {
      const output = renderParsedTraceSqlInvestigations(selected.map(parseTraceSql));
      expect(createHash("sha256").update(output).digest("hex")).toBe(originalHashes[index]);
      expect(output).toBe(renderTraceSqlInvestigations(selected));
    }
    expect(() => renderParsedTraceSqlInvestigations([])).toThrow("file count");
    expect(() => renderParsedTraceSqlInvestigations(texts.concat(texts).map(parseTraceSql))).toThrow("file count");
  });
  it("extracts PS SQL, durations, binds, PeopleCode ends and error lines from the synthetic fixture", () => {
    const report = parseTraceSql(fixture("sample.tracesql"));
    expect(report.statements.map((s) => s.kind)).toEqual(["SELECT", "INSERT", "UPDATE", "DELETE"]);
    expect(report.statements.find((s) => s.kind === "SELECT")?.table).toContain("PS_PERSONAL_DATA");
    expect(report.statements.find((s) => s.kind === "SELECT")?.sql).toContain("'SYNTHETIC01'");
    expect(report.statements.find((s) => s.kind === "SELECT")?.where).toContain("EMPLID");
    expect(report.statements.find((s) => s.kind === "INSERT")?.sql).toContain("42");
    expect(report.statements.find((s) => s.kind === "INSERT")?.sql).not.toContain("'42'");
    expect(report.totals.selectCount).toBe(1);
    expect(report.totals.otherSqlCount).toBe(3);
    expect(report.events.some((e) => e.kind === "end" && e.duration === 0.05)).toBe(true);
    expect(report.totals.eventInternalCount).toBeGreaterThan(0);
    expect(timedPeopleCodeEnds(report, true)).toEqual([]);
    expect(renderTraceSqlSqlOnly(report)).toContain("SELECT");
    expect(renderTraceSqlSqlOnly(report)).not.toContain("DURATION CHART");
    expect(report.calls.some((c) => c.name === "internal")).toBe(true);
    expect(report.plan.some((n) => n.kind === "peoplecode" && n.label.includes("Nested"))).toBe(true);
    expect(report.plan.some((n) => n.kind === "sql")).toBe(true);
    expect(report.errors.map((e) => e.line)).toEqual([17, 18]);
    const text = renderTraceSqlInvestigation(fixture("sample.tracesql"));
    expect(text).toContain("Parser: PeopleSoft tracesql markers v1");
    expect(text).toContain("PS_PERSONAL_DATA");
    expect(text).toContain("Caught Exception");
    expect(text).toContain("PLAN TREE");
    expect(text).toContain("AGGREGATE BY WHERE");
    expect(text).toContain("DURATION CHART");
    expect(text).toContain("SQLID ");
    expect(text).toContain("Real PeopleTools patch compatibility unverified");
  });

  it("emits Trace Magic–compatible SQL IDs matching Node MD5 encoding", () => {
    const sql = "SELECT A FROM PS_X WHERE 1=1";
    const node = createHash("md5").update(Buffer.from(`${sql}\0`, "ascii")).digest();
    expect(Buffer.from(md5Bytes(Uint8Array.from(Buffer.from(`${sql}\0`, "ascii")))).equals(node)).toBe(true);
    const id = traceMagicSqlId(sql);
    expect(id).toHaveLength(13);
    expect(id).toMatch(/^[0-9a-z]+$/);
    expect(parseTraceSql(`COM Stmt=SELECT A FROM PS_X WHERE 1=1\n Dur=0.001 EXE`).statements[0].sqlId).toBe(id);
  });

  it("ignores non-PeopleSoft SELECT tables and rejects unsafe or oversized input", () => {
    expect(parseTraceSql("COM Stmt=SELECT X.COL FROM DUAL X\n Dur=0.001 EXE").statements).toHaveLength(0);
    expect(() => parseTraceSql("")).not.toThrow();
    expect(() => parseTraceSql("PRIVATE\u0000VALUE")).toThrow();
    expect(() => parseTraceSql("a".repeat(TRACESQL_LIMITS.maxLineChars + 1))).toThrow();
  });

  it("parses doc-based example fixtures without throwing", () => {
    const examples = [
      "example-volume-vs-slow.tracesql",
      "example-peoplecode-nesting.tracesql",
      "example-multiline-select.tracesql",
      "example-sql-errors.tracesql",
      "example-mixed-session.tracesql",
    ];
    for (const name of examples) {
      const report = parseTraceSql(fixture(name));
      expect(report.totalLines, name).toBeGreaterThan(0);
    }
    const volume = parseTraceSql(fixture("example-volume-vs-slow.tracesql"));
    expect(volume.statements.some((s) => s.table.includes("PS_JOB") && s.durationExec >= 0.4)).toBe(true);
    expect(volume.statements.filter((s) => s.table.includes("PS_PERSONAL_DATA")).length).toBeGreaterThan(1);
    const nesting = parseTraceSql(fixture("example-peoplecode-nesting.tracesql"));
    expect(nesting.events.some((e) => e.kind === "begin")).toBe(true);
    expect(nesting.events.some((e) => e.kind === "end" && e.external)).toBe(true);
    expect(nesting.calls.map((c) => c.name)).toEqual(expect.arrayContaining(["internal", "get", "set"]));
    const multi = parseTraceSql(fixture("example-multiline-select.tracesql"));
    expect(multi.statements.some((s) => s.table.includes("PS_NAMES"))).toBe(true);
    expect(multi.statements.every((s) => !s.table.includes("DUAL"))).toBe(true);
    const errors = parseTraceSql(fixture("example-sql-errors.tracesql"));
    expect(errors.errors.some((e) => e.text.includes("Caught Exception"))).toBe(true);
    expect(errors.errors.some((e) => e.text.startsWith("Called from:"))).toBe(true);
    expect(errors.errors.some((e) => e.text.startsWith("  Error Position:"))).toBe(true);
    const mixed = parseTraceSql(fixture("example-mixed-session.tracesql"));
    expect(mixed.statements.map((s) => s.kind).sort()).toEqual(["DELETE", "INSERT", "SELECT", "UPDATE"]);
  });

  it("compares two excerpts by SQLID and exact FROM text", () => {
    const left = fixture("sample.tracesql");
    const right = "COM Stmt=SELECT B.DEPTID FROM PS_JOB B WHERE B.EMPLID = :1\n Dur=1.000 EXE";
    const text = renderTraceSqlInvestigations([left, right]);
    expect(text).toContain("COMPARE BY SQLID");
    expect(text).toContain("COMPARE BY FROM");
    expect(text).toContain("SUMMARY A");
    expect(text).toContain("SUMMARY B");
    const from = compareTraceSqlByFrom(parseTraceSql(left), parseTraceSql(right));
    expect(from.some((row) => row.presence === "right" && row.label.includes("PS_JOB"))).toBe(true);
    expect(from.some((row) => row.presence === "left" && row.label.includes("PS_PERSONAL_DATA"))).toBe(true);
    const ids = compareTraceSqlBySqlId(parseTraceSql(left), parseTraceSql(left));
    expect(ids.every((row) => row.presence === "both")).toBe(true);
  });

  it("keeps alias differences explicit without claiming absent database tables", () => {
    const left = "COM Stmt=SELECT A.DEPTID FROM PS_JOB A\n Dur=1.000 EXE";
    const right = "COM Stmt=SELECT B.DEPTID FROM PS_JOB B\n Dur=1.000 EXE";
    const rows = compareTraceSqlByFrom(parseTraceSql(left), parseTraceSql(right));
    expect(rows.map((row) => row.presence).sort()).toEqual(["left", "right"]);
    const report = renderTraceSqlInvestigations([left, right]);
    expect(report).toContain("including aliases and joins");
    expect(report).toContain("Different text does not establish missing database tables");
    expect(report).toContain("COMPARE BY FROM — exact text");
  });

  it("aggregates hotspots by duration and nests plan levels", () => {
    const text = [
      ">>> start Nested App.Field.Event",
      "COM Stmt=SELECT A.X FROM PS_A A",
      " Dur=1.500 EXE",
      " Dur=0.100 Fetch",
      "COM Stmt=SELECT B.Y FROM PS_B B",
      " Dur=0.010 EXE",
      "<<< end Nested App.Field.Event Dur=0.050",
    ].join("\n");
    const parsed = parseTraceSql(text);
    expect(parsed.plan[0].level).toBe(0);
    expect(parsed.plan.find((n) => n.kind === "sql")?.level).toBe(1);
    const report = renderTraceSqlInvestigation(text);
    const section = report.split("TOP SQL BY DURATION")[1].split("PLAN TREE")[0];
    expect(section.indexOf("PS_A")).toBeLessThan(section.indexOf("PS_B"));
    expect(section).toContain("Dur 1.600");
    expect(report).toContain("AGGREGATE BY WHERE");
    expect(report).toContain("exec 1.500 | fetch 0.100 | duration 1.600");
    expect(report).toContain("PEOPLECODE INTERNAL ENDS");
    expect(report).toContain("PEOPLECODE EXTERNAL ENDS");
  });

  it("parses asynchronously with progress and abort", async () => {
    const bulky = "COM Stmt=SELECT A.X FROM PS_A A\n Dur=0.001 EXE\n".repeat(500);
    const ticks: number[] = [];
    const report = await parseTraceSqlAsync(bulky, { onProgress: (line) => ticks.push(line) });
    expect(report.statements).toHaveLength(500);
    expect(ticks.length).toBeGreaterThan(0);
    const controller = new AbortController();
    await expect(
      parseTraceSqlAsync(bulky, {
        signal: controller.signal,
        onProgress: () => controller.abort(),
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
