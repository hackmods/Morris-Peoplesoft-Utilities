import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CONFIG_LIMITS,
  compareConfigurations,
  parseConfiguration,
  renderConfigurationComparison,
} from "../../src/features/configuration-comparison";

describe("configuration comparison parser", () => {
  it("accepts the documented synthetic sample files without implying server compatibility", () => {
    for (const [name, format] of [["sample.ini", "ini"], ["sample.json", "json"]] as const) {
      const text = readFileSync(resolve(process.cwd(), "tests/fixtures/configuration-comparison", name), "utf8");
      const parsed = parseConfiguration(text, format);
      expect(parsed.entries.length).toBeGreaterThan(0);
      expect(compareConfigurations(parsed, parsed).differences.every(row => row.status === "unchanged")).toBe(true);
    }
  });
  it("parses a strict INI-style subset, retaining blank values, inline text and source lines", () => {
    const parsed = parseConfiguration("; comment\n[App]\nempty=\nmode=live # literal ; literal\n", "ini");
    expect(parsed.entries.map(entry => [entry.path, entry.value, entry.sourceLine])).toEqual([
      ["/App/empty", "", 3], ["/App/mode", "live # literal ; literal", 4],
    ]);
  });

  it("rejects ambiguous duplicate INI sections and keys case-insensitively", () => {
    expect(() => parseConfiguration("[App]\na=1\n[app]\nb=2", "ini")).toThrow("Duplicate section");
    expect(() => parseConfiguration("[App]\nName=1\nname=2", "ini")).toThrow("Duplicate key");
  });

  it("rejects continuation, override and malformed lines without echoing source", () => {
    const secretish = "password=hunter2";
    for (const source of [`[App]\na=1\n  ${secretish}`, `export ${secretish}`, "this is unsupported syntax"]) {
      expect(() => parseConfiguration(source, "ini")).toThrow();
      try { parseConfiguration(source, "ini"); } catch (error) { expect(String(error)).not.toContain("hunter2"); }
    }
  });

  it("flattens JSON with escaped pointer paths, explicit array indexes and lines", () => {
    const parsed = parseConfiguration('{\n  "a/b~c": ["", 2],\n  "empty": {},\n  "none": null\n}', "json");
    expect(parsed.entries.map(entry => [entry.path, entry.valueType, entry.sourceLine])).toEqual([
      ["/a~1b~0c", "array", 2], ["/a~1b~0c/0", "string", 2], ["/a~1b~0c/1", "number", 2],
      ["/empty", "object", 3], ["/none", "null", 4],
    ]);
  });

  it("rejects duplicate JSON keys before normalization can discard them", () => {
    expect(() => parseConfiguration('{"outer":{"key":1,"key":2}}', "json")).toThrow("Duplicate JSON object key");
    expect(() => parseConfiguration('{"a":1,"\\u0061":2}', "json")).toThrow("Duplicate JSON object key");
  });

  it("counts CR-only and CRLF JSON source lines correctly", () => {
    const cr = parseConfiguration('{\r"first":1,\r"second":2}', "json");
    const crlf = parseConfiguration('{\r\n"first":1,\r\n"second":2}', "json");
    expect(cr.entries.find(entry => entry.path === "/second")?.sourceLine).toBe(3);
    expect(crlf.entries.find(entry => entry.path === "/second")?.sourceLine).toBe(3);
  });

  it("rejects unsupported cross-format comparisons", () => {
    expect(() => compareConfigurations(parseConfiguration("x=1", "ini"), parseConfiguration('{"x":1}', "json")))
      .toThrow("same supported format");
  });

  it("compares container types even when their child paths happen to match", () => {
    const left = parseConfiguration('{"x":[1]}', "json");
    const right = parseConfiguration('{"x":{"0":1}}', "json");
    const report = compareConfigurations(left, right);
    expect(report.differences.find(item => item.path === "/x")).toMatchObject({ status: "type-changed", beforeType: "array", afterType: "object" });
  });

  it("preserves exact JSON numeric tokens rather than comparing rounded numbers", () => {
    const left = parseConfiguration('{"n":9007199254740992}', "json");
    const right = parseConfiguration('{"n":9007199254740993}', "json");
    expect(compareConfigurations(left, right).differences.find(item => item.path === "/n"))
      .toMatchObject({ status: "changed", before: "9007199254740992", after: "9007199254740993" });
  });

  it("preserves missing, blank, type and ordinary value distinctions", () => {
    const left = parseConfiguration('{"blank":"","number":1,"same":true,"gone":"x","empty":[]}', "json");
    const right = parseConfiguration('{"blank":null,"number":"1","same":true,"new":"","empty":[]}', "json");
    const report = compareConfigurations(left, right);
    const byPath = new Map(report.differences.map(item => [item.path, item]));
    expect(byPath.get("/blank")).toMatchObject({ status: "type-changed", before: "", after: "null" });
    expect(byPath.get("/number")).toMatchObject({ status: "type-changed", beforeType: "number", afterType: "string" });
    expect(byPath.get("/same")).toMatchObject({ status: "unchanged" });
    expect(byPath.get("/gone")).toMatchObject({ status: "removed", after: null });
    expect(byPath.get("/new")).toMatchObject({ status: "added", before: null, after: "" });
    expect(byPath.get("/empty")).toMatchObject({ status: "unchanged", beforeType: "array" });
  });

  it("masks a pair if either side has a sensitive key or value, before comparing", () => {
    const left = parseConfiguration('{"password":"example-secret-left","ordinary":"https://user:pass@example.test/path?token=x"}', "json");
    const right = parseConfiguration('{"password":"example-secret-right","ordinary":"safe"}', "json");
    const report = compareConfigurations(left, right);
    expect(report.differences).toHaveLength(2);
    expect(report.differences.every(item => item.status === "not-compared" && item.path === "[sensitive path omitted]"
      && (item.before === null || item.before === "[REDACTED]") && (item.after === null || item.after === "[REDACTED]")
      && item.beforeType === null && item.afterType === null)).toBe(true);
    const text = renderConfigurationComparison(report);
    for (const secret of ["password", "example-secret-left", "example-secret-right", "ordinary", "user:pass", "token=x"]) {
      expect(text).not.toContain(secret);
    }
    expect(text).toContain("conservative");
  });

  it("masks descendants on either side when their shared ancestor contains a suspicious value", () => {
    const left = parseConfiguration('{"scope":"https://person@host.example/path"}', "json");
    const right = parseConfiguration('{"scope":{"child":"ordinary"}}', "json");
    const report = compareConfigurations(left, right);
    expect(report.differences.every(item => item.status === "not-compared" && item.path === "[sensitive path omitted]"))
      .toBe(true);
    expect(renderConfigurationComparison(report)).not.toContain("ordinary");
  });

  it("redacts secret-bearing section and PEM content", () => {
    const parsed = parseConfiguration("[Credentials]\nname=operator\n", "ini");
    const left = parseConfiguration('{"certificate":"-----BEGIN PRIVATE KEY-----\\nnot-real\\n-----END PRIVATE KEY-----"}', "json");
    expect(renderConfigurationComparison(compareConfigurations(parsed, parsed))).not.toContain("Credentials");
    const pemReport = renderConfigurationComparison(compareConfigurations(left, left));
    expect(pemReport).not.toContain("not-real");
    expect(pemReport).toContain("[REDACTED]");
  });

  it("enforces UTF-8 byte, record, scalar, depth and work bounds", () => {
    expect(() => parseConfiguration("é".repeat(Math.floor(CONFIG_LIMITS.maxBytes / 2) + 1), "ini")).toThrow("byte limit");
    expect(() => parseConfiguration(`key=${"x".repeat(CONFIG_LIMITS.maxScalarChars + 1)}`, "ini")).toThrow("too long");
    expect(() => parseConfiguration(`{${Array.from({ length: CONFIG_LIMITS.maxRecords + 1 }, (_, i) => `"k${i}":${i}`).join(",")}}`, "json"))
      .toThrow("too many records");
    expect(() => parseConfiguration(Array.from({ length: CONFIG_LIMITS.maxRecords + 1 }, (_, i) => `[section${i}]`).join("\n"), "ini"))
      .toThrow("too many records");
    const nested = `${"{\"x\":".repeat(CONFIG_LIMITS.maxDepth + 2)}0${"}".repeat(CONFIG_LIMITS.maxDepth + 2)}`;
    expect(() => parseConfiguration(nested, "json")).toThrow("nesting is too deep");
    expect(() => parseConfiguration('{"x":"' + "s".repeat(CONFIG_LIMITS.maxScalarChars + 1) + '"}', "json")).toThrow("too long");
    expect(() => parseConfiguration(`{"n":1e${"9".repeat(CONFIG_LIMITS.maxScalarChars)}}`, "json")).toThrow("too long");
  });

  it("escapes control characters so values and paths cannot forge report rows", () => {
    const left = parseConfiguration('{"ordinary":"first\\nchanged | /fake | [missing]"}', "json");
    const rendered = renderConfigurationComparison(compareConfigurations(left, left));
    expect(rendered.split("\n").filter(line => line.includes("unchanged |"))).toHaveLength(1);
    expect(rendered).toContain("\\nchanged");
  });

  it("stops assembling a nested-path report when its byte budget is reached", () => {
    const key = "x".repeat(240);
    const parsed = parseConfiguration(`{"${key}":`.repeat(12) + JSON.stringify(Array(1000).fill("value")) + "}".repeat(12), "json");
    const comparison = compareConfigurations(parsed, parsed);
    const laterPath = vi.fn(() => "later record");
    Object.defineProperty(comparison.differences.at(-1)!, "path", { get: laterPath });
    expect(() => renderConfigurationComparison(comparison)).toThrow("output limit");
    expect(laterPath).not.toHaveBeenCalled();
  });
});
