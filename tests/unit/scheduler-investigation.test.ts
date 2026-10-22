import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseSchedulerExcerpt, renderSchedulerInvestigation, SCHEDULER_LIMITS } from "@/features/scheduler-investigation";

const fixture = (name: string) => readFileSync(resolve(process.cwd(), "tests/fixtures/scheduler-investigation", name), "utf8");
describe("ISO-labelled scheduler excerpts v1", () => {
  it("uses synthetic sources, preserves physical lines and reports parent conflicts without selecting a winner", () => {
    const input = fixture("scheduler.txt");
    expect(parseSchedulerExcerpt(input).lines.find(line => line.line === 5)?.instance).toBe("90002");
    const report = renderSchedulerInvestigation([input, fixture("distribution.txt")], "Process Instance: 90002\nUser: SYNTHETIC-PRIVATE-USER\nPRIVATE-CONTINUATION");
    expect(report).toContain("Source 1:L3 | Parent 90001 -> Instance 90002");
    expect(report).toContain("Source 2:L3 | Parent 90003 -> Instance 90002");
    expect(report).toContain("Conflicting parent labels for Instance 90002");
    expect(report).toContain("Ticket:L1");
    expect(report).not.toMatch(/SYNTHETIC-SECRET|SYNTHETIC-SENSITIVE|SYNTHETIC-TOKEN|PRIVATE-USER|PRIVATE-CONTINUATION/);
    expect(report).toContain("real PeopleTools 8.62 log compatibility unverified");
  });
  it("orders only supported offset timestamps, keeping ties stable and unknown records separate", () => {
    const report = renderSchedulerInvestigation([
      "2026-10-20T13:00:02Z Process Instance: 2; second\n2026-10-20T09:00:01-04:00 Process Instance: 1; first\nno date",
      "2026-10-20T13:00:02.000+00:00 Process Instance: 3; third",
    ], "");
    const timeline = report.split("TIMELINE —")[1].split("EXPLICIT PARENT")[0];
    expect(timeline.indexOf("first")).toBeLessThan(timeline.indexOf("second"));
    expect(timeline.indexOf("second")).toBeLessThan(timeline.indexOf("third"));
    expect(timeline).not.toContain("no date");
    expect(report).toContain('Source 1:L3 | Time unknown | Instance unknown | "no date"');
  });
  it("validates calendar dates and time parts without locale or rollover guesses", () => {
    const bad = ["2025-02-29T00:00:00Z", "2026-04-31T00:00:00Z", "2026-00-01T00:00:00Z", "2026-13-01T00:00:00Z", "2026-01-00T00:00:00Z", "2026-01-01T24:00:00Z", "2026-01-01T00:60:00Z", "2026-01-01T00:00:60Z", "2026-01-01T00:00:00+24:00", "2026-01-01T00:00:00+00:60", "2026-01-01T00:00:00", "[2026-01-01T00:00:00Z]", "01/01/2026 10:00:00"];
    expect(parseSchedulerExcerpt(bad.join("\n")).lines.every(line => line.instant === null)).toBe(true);
    expect(parseSchedulerExcerpt("2024-02-29T00:00:00.125Z event").lines[0].instant).not.toBeNull();
  });
  it("does not inherit IDs, confuse OS/parent IDs or accept ambiguous, self or invalid labels", () => {
    const input = ["Process Instance: 10; Parent Process Instance: 20", "Parent Process Instance: 20", "PID: 10; Transfer Instance: 12", "continuation", "Process Instance: 10; Process Instance: 0; Parent Process Instance: 20", "Process Instance: 10; Parent Process Instance: 10", "Process Instance: 10; Parent Process Instance: 20; Parent Process Instance: 30", "Process Instance: 01", "Process Instance: 1234567890123456", "Process Instance: 10 extra", "message Process Instance: 10"].join("\n");
    const rows = parseSchedulerExcerpt(input).lines;
    expect(rows[0].parent).toBe("20");
    expect(rows.slice(1).every(row => row.parent === null)).toBe(true);
    expect(rows.filter(row => row.instance).map(row => row.line)).toEqual([1, 6, 7]);
  });
  it("preserves BOM/CRLF/CR source lines, blank lines and duplicate observations", () => {
    const rows = parseSchedulerExcerpt("\ufeffProcess Instance: 1\r\n\r\nProcess Instance: 1\rProcess Instance: 2");
    expect(rows.totalLines).toBe(4); expect(rows.lines.map(row => row.line)).toEqual([1, 3, 4]);
    expect(renderSchedulerInvestigation(["unknown"], "")).toContain("No supported timestamps. Chronology unknown.");
    expect(renderSchedulerInvestigation(["unknown"], "")).toContain("Relationships unknown.");
  });
  it("masks sensitive records and continuations before extraction, including timestamps inside private blocks", () => {
    const text = ["2026-01-01T00:00:00Z Process Instance: 99; token=PRIVATE-A", "PRIVATE-B", "-----BEGIN PRIVATE KEY-----", "2026-01-01T00:00:01Z Process Instance: 98; PRIVATE-C", "-----END PRIVATE KEY-----", "PRIVATE-D", "2026-01-01T00:00:02Z Process Instance: 97; safe"].join("\n");
    const rows = parseSchedulerExcerpt(text).lines;
    expect(rows.slice(0, -1).every(row => row.masked && !row.instance && !row.timestamp)).toBe(true);
    expect(rows.at(-1)?.instance).toBe("97");
    expect(renderSchedulerInvestigation([text], "")).not.toMatch(/PRIVATE-[ABCD]|Instance 9[89]/);
    for (const privateText of ["C:\\private\\file", "/private/path", "https://private.invalid", "secret@private.invalid", "User: private", "Run Control: private", "database=private", "Authorization: Basic private"]) expect(parseSchedulerExcerpt(privateText).lines[0].masked).toBe(true);
  });
  it("escapes imported report cells and rejects encoding, empty or overflowing inputs without echoing contents", () => {
    expect(renderSchedulerInvestigation(['<script>"test"</script>'], "")).toContain('\\"test\\"');
    for (const input of ["", " \n", "PRIVATE\u0000VALUE", "PRIVATE\ufffdVALUE", "a".repeat(SCHEDULER_LIMITS.maxLineChars + 1), "\n".repeat(SCHEDULER_LIMITS.maxLines), "é".repeat(SCHEDULER_LIMITS.maxBytes)]) expect(() => parseSchedulerExcerpt(input)).toThrow();
    expect(() => renderSchedulerInvestigation([], "")).toThrow();
    expect(() => renderSchedulerInvestigation(Array(5).fill("event"), "")).toThrow();
    expect(() => renderSchedulerInvestigation(["event"], "a".repeat(SCHEDULER_LIMITS.maxPackChars + 1))).toThrow();
    const large = Array(60).fill(`2026-01-01T00:00:00Z ${"a".repeat(3900)}`).join("\n");
    expect(() => renderSchedulerInvestigation(Array(4).fill(large), "")).toThrow("Report limit");
  });
});
