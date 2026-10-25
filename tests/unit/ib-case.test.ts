import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ibRecordChoices, parseIbEvidence, renderIbInvestigation, type IbCaseReview } from "@/features/ib-investigation";

const source = (records: unknown[], version = 2) => JSON.stringify({ format: "mpu-ib-evidence", version, records });
const xmlSource = (payloadXml: string) => source([{ payloadXml }]);
describe("extended local IB case workflow", () => {
  it("keeps v1 strict, adds v2 observation fields and stable explicit choices", () => {
    expect(() => parseIbEvidence(source([{ environmentLabel: "TEST" }], 1))).toThrow();
    const input = source([{ environmentLabel: "TEST", operationVersion: "v1", correlationId: "EXAMPLE", subQueue: "EXAMPLE", payloadRole: "request", errorLocation: "gateway", evidenceNote: "manual" }, { stage: "unknown" }]);
    expect(ibRecordChoices([input])).toEqual([{ value: "1:1", label: "Source 1, record 1 (JSON L1)" }, { value: "1:2", label: "Source 1, record 2 (JSON L1)" }]);
    expect(renderIbInvestigation([input], false)).toContain('environmentLabel | Source 1:L1 /records/0/environmentLabel | "TEST"');
    expect(() => parseIbEvidence(source([{ payloadRole: "inferred" }]))).toThrow();
    expect(() => parseIbEvidence(source([{ payloadVariant: "inferred" }]))).toThrow();
  });
  it("parses inert XML/SOAP with opening-tag citations, namespaces omitted, attributes, CDATA and repeated elements", () => {
    const input = readFileSync(resolve("tests/fixtures/ib-investigation/soap-v2.json"), "utf8"); const evidence = parseIbEvidence(input);
    expect(JSON.stringify(evidence)).not.toMatch(/SYNTHETIC-PRIVATE|Authorization|schemas.xmlsoap.org/);
    const report = renderIbInvestigation([input], true);
    expect(report).toContain("decoded XML opening-tag L3"); expect(report).toContain("Item[2]/#text"); expect(report).toContain('"two"'); expect(report).toContain("@code");
    expect(report).not.toContain("SYNTHETIC-PRIVATE"); expect(report).toContain("XML namespace/schema/semantic equivalence");
    expect(renderIbInvestigation([xmlSource('<?xml version="1.0"?><Root>one &amp; two</Root>')], true)).toContain('"one & two"');
    expect(renderIbInvestigation([xmlSource('<Root><!-- ignored --><A value="x&gt;y"/></Root>')], false)).not.toContain("ignored");
  });
  it("rejects DTDs/entities/PIs, invalid XML/namespaces, controls, excess depth/length and simultaneous JSON/XML", () => {
    for (const xml of ['<!DOCTYPE r SYSTEM "https://example.invalid/x"><r/>', '<!DOCTYPE r [<!ENTITY x "boom">]><r>&x;</r>', '<?xml-stylesheet href="https://example.invalid/x"?><r/>', '<r>&custom;</r>', '<r><a></r>', '<x:r/>', '<r>&#x202e;</r>', '<r>\u0000</r>', '<r>'.repeat(18) + '</r>'.repeat(18), '<r>' + "x".repeat(4000) + '</r>', '<r a="1" a="2"/>', '<r>' + '<a/>'.repeat(998) + '</r>']) expect(() => parseIbEvidence(xmlSource(xml))).toThrow();
    expect(() => parseIbEvidence(source([{ payload: {}, payloadXml: "<r/>" }]))).toThrow();
    expect(() => parseIbEvidence(xmlSource(""))).toThrow();
  });
  it("sorts valid offsets only, leaving malformed, missing and masked observation times unknown", () => {
    const report = renderIbInvestigation([source([{ observedAt: "2026-10-21T14:00:02Z" }, { observedAt: "2026-10-21T10:00:01-04:00" }, { observedAt: "2026-02-30T10:00:00Z" }, { observedAt: "2026-10-21T25:00:00Z" }, { observedAt: "2026-10-21T10:00:00+25:00" }, { observedAt: "local time" }])], false);
    const timeline = report.split("OBSERVATION TIMELINE")[1]; expect(timeline.indexOf("record 2")).toBeLessThan(timeline.indexOf("record 1"));
    expect(timeline).toContain("4 record(s) have unknown");
  });
  it("compares only an explicit valid pair, warns about scope and keeps missing, blank, type and exact numeric differences", () => {
    const input = source([{ environmentLabel: "A", serviceOperation: "EXAMPLE", payloadVariant: "original", payload: { empty: "", value: 1, removed: true } }, { environmentLabel: "B", serviceOperation: "EXAMPLE", payloadVariant: "transformed", payload: { empty: null, value: "1", added: false } }]);
    const report = renderIbInvestigation([input], true, { comparison: { left: "1:1", right: "1:2" }, draftFirst: true });
    expect(report).toContain("EXPLICIT RECORD COMPARISON — 1:1 -> 1:2"); expect(report).toContain("Scope warning: environmentLabel");
    expect(report).toContain("Scope warning: payloadVariant");
    expect(report).toContain("type differs"); expect(report).toContain("only left"); expect(report).toContain("only right"); expect(report).toContain("explicitly prepared draft");
    expect(renderIbInvestigation([input], false, { comparison: { left: "1:1", right: "1:2" } })).toContain("Payload comparison omitted");
    for (const pair of [{ left: "1:1", right: "1:1" }, { left: "1:1", right: "1:3" }, { left: "garbage", right: "1:2" }]) expect(() => renderIbInvestigation([input], true, { comparison: pair })).toThrow();
  });
  it("never compares masked payloads or exposes a counterpart value through the comparison", () => {
    const input = source([{ payload: { safe: "token=PRIVATE" }, reportedStatus: "password=PRIVATE" }, { payload: { safe: "COUNTERPART" }, reportedStatus: "COUNTERPART" }]);
    const comparison = renderIbInvestigation([input], true, { comparison: { left: "1:1", right: "1:2" } }).split("EXPLICIT RECORD COMPARISON")[1];
    expect(comparison).toContain("not-compared"); expect(comparison).toContain("Payload comparison not performed"); expect(comparison).not.toMatch(/PRIVATE|COUNTERPART/);
    const mixed = source([{ payload: {} }, { payloadXml: "<r/>" }]);
    expect(renderIbInvestigation([mixed], true, { comparison: { left: "1:1", right: "1:2" } })).toContain("different JSON/XML formats");
    expect(renderIbInvestigation([source([{ payloadXml: "<r><a>one</a></r>" }, { payloadXml: "<r><a>two</a></r>" }])], true, { comparison: { left: "1:1", right: "1:2" } })).toContain("text differs");
  });
  it("exports bounded manual case assertions and dispositions with sensitive notes masked", () => {
    const input = source([{ stage: "operation" }]);
    const report = renderIbInvestigation([input], false, { review: { caseLabel: "Example", owner: "team", expected: "expected", actual: "observed", checks: { scope: { disposition: "evidence-recorded", note: "Source 1 record 1" }, errors: { disposition: "needs-follow-up", note: "password=PRIVATE" } } } });
    expect(report).toContain("caseLabel: \"Example\""); expect(report).toContain("scope | evidence-recorded"); expect(report).toContain("errors | needs-follow-up"); expect(report).toContain("[masked manual text]"); expect(report).not.toContain("PRIVATE");
    const invalid: IbCaseReview[] = [{ expected: "x".repeat(2001) }, { actual: "\u202e" }, { checks: { injected: { disposition: "unreviewed", note: "" } } }, { checks: { scope: { disposition: "automatic-success", note: "" } } }];
    for (const review of invalid) expect(() => renderIbInvestigation([input], false, { review })).toThrow();
  });
});
