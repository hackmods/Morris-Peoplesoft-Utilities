import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseTraceSql, renderTraceSqlInvestigation, TRACESQL_LIMITS } from "@/features/tracesql-investigation";
import { md5Bytes, traceMagicSqlId } from "@/features/tracesql-md5";

const fixture = (name: string) => readFileSync(resolve(process.cwd(), "tests/fixtures/tracesql-investigation", name), "utf8");

describe("PeopleSoft tracesql markers v1", () => {
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
  });
});
