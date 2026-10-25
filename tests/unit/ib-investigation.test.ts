import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { IB_LIMITS, parseIbEvidence, renderIbInvestigation } from "@/features/ib-investigation";

const fixture = (name: string) => readFileSync(resolve(process.cwd(), "tests/fixtures/ib-investigation", name), "utf8");
const envelope = (record: unknown = { serviceOperation: "SYNTHETIC" }) => JSON.stringify({ format: "mpu-ib-evidence", version: 1, records: [record] });
describe("mpu-ib-evidence version 1", () => {
  it("preserves cited operation/contract evidence without merging or interpreting status", () => {
    const report = renderIbInvestigation([fixture("operation.json"), fixture("contract.json")], false);
    expect(report).toContain('serviceOperation | Source 1:L6 /records/0/serviceOperation | "SYNTHETIC_OPERATION"');
    expect(report).toContain('stage | Source 1:L14 /records/0/stage | "operation"');
    expect(report).toContain('stage | Source 2:L12 /records/0/stage | "publication-contract"');
    expect(report).toContain('"Done"'); expect(report).toContain('"Error"');
    expect(report).toContain("routing | unknown / not supplied");
    expect(report).toContain("MANUAL ROUTING / ERROR CHECKLIST");
    expect(report).not.toMatch(/SYNTHETIC-BUSINESS-CONTEXT|9007199254740993|PRIVATE/);
  });
  it("masks sensitive paths/subtrees and suspicious values before returning evidence, including personal names and markup", () => {
    const input = fixture("operation.json"); const parsed = parseIbEvidence(input);
    expect(JSON.stringify(parsed)).not.toMatch(/PRIVATE|employeeId|password|credentials|synthetic.invalid/);
    const report = renderIbInvestigation([input], true);
    expect(report).toContain("SYNTHETIC-BUSINESS-CONTEXT"); expect(report).toContain("9007199254740993");
    expect(report).toContain("[masked path]"); expect(report).not.toMatch(/PRIVATE|employeeId|\/password|\/credentials|synthetic.invalid/);
    for (const value of ["Bearer PRIVATE", "password=PRIVATE", "https://private.invalid", "C:\\private\\path", "/private/path", "private@example.invalid", '{"password":"PRIVATE"}', "<root>PRIVATE</root>"]) expect(renderIbInvestigation([envelope({ error: value, payload: { public: value, fullName: "PRIVATE" } })], true)).not.toContain("PRIVATE");
    expect(renderIbInvestigation([envelope({ senderNode: "password=PRIVATE" })], false)).toContain("senderNode | Source 1:L1 /records/0/senderNode | [masked]");
  });
  it("retains source lines across BOM/CR/LF, escaped pointers, arrays, blank strings and exact numbers", () => {
    const input = '\ufeff{\r"format":"mpu-ib-evidence",\r"version":1,\r"records":[{\r"reportedStatus":"",\r"payload":{"a/b~c":[false,null,1.000,9007199254740993]}\r}]}';
    const report = renderIbInvestigation([input], true);
    expect(report).toContain('reportedStatus | Source 1:L5 /records/0/reportedStatus | ""');
    expect(report).toContain('/records/0/payload/a~1b~0c/2" | 1.000');
    expect(report).toContain('/records/0/payload/a~1b~0c/3" | 9007199254740993');
    expect(report).toContain('Source 1:L6'); expect(report).toContain("operationType | unknown / not supplied");
  });
  it("accepts only the exact versioned envelope and whitelisted string fields/enums, with object/array payloads", () => {
    for (const input of ["{}", "[]", "null", envelope({}), envelope({ injected: "PRIVATE" }), envelope({ direction: "OUTBOUND" }), envelope({ operationType: "batch" }), envelope({ stage: "done" }), envelope({ serviceOperation: 1 }), envelope({ payload: "<xml>PRIVATE</xml>" }), envelope({ payload: null }), envelope({ payload: 1 }), '{"format":"mpu-ib-evidence","version":2,"records":[{}]}', '{"format":"mpu-ib-evidence","version":1,"records":{}}', '{"format":"mpu-ib-evidence","version":1,"records":[]}', '{"format":"mpu-ib-evidence","version":1,"records":[1]}', '{"format":"mpu-ib-evidence","version":1,"records":[{"stage":"operation"}],"__proto__":{}}']) {
      expect(() => parseIbEvidence(input)).toThrow("Unsupported IB evidence");
    }
    expect(parseIbEvidence(envelope({ operationType: "unknown", direction: "unknown", stage: "gateway", payload: [] })).records).toHaveLength(1);
  });
  it("rejects duplicate keys before discard, including decoded names and payload duplicates", () => {
    for (const input of [envelope().replace('"version":1', '"version":1,"version":1'), envelope({ serviceOperation: "A" }).replace('"serviceOperation":"A"', '"serviceOperation":"A","service\\u004fperation":"B"'), envelope({ payload: {} }).replace('"payload":{}', '"payload":{"safe":1,"safe":2}')]) expect(() => parseIbEvidence(input)).toThrow();
  });
  it("treats prototype-like payload keys and decoded credential keys as inert evidence, never executable properties", () => {
    const input = '{"format":"mpu-ib-evidence","version":1,"records":[{"payload":{"__proto__":{"polluted":true},"constructor":{"prototype":{"safe":true}},"pass\\u0077ord":"PRIVATE","a/b~c":"safe"}}]}';
    const report = renderIbInvestigation([input], true);
    expect(report).toContain("/__proto__/polluted"); expect(report).toContain("/a~1b~0c"); expect(report).not.toContain("PRIVATE");
    expect(Object.prototype).not.toHaveProperty("polluted");
    expect(() => parseIbEvidence(envelope({ serviceOperation: "x".repeat(200) }))).not.toThrow();
    expect(() => parseIbEvidence(envelope({ payload: { safe: "x".repeat(4000) } }))).not.toThrow();
  });
  it("rejects all resource overflow and control text without raw errors or partial reports", () => {
    const overflows = ["x".repeat(IB_LIMITS.maxBytes + 1), envelope({ error: "x".repeat(4001) }), envelope({ queue: "x".repeat(201) }), envelope({ payload: { ["x".repeat(257)]: 1 } }), envelope({ payload: Array.from({ length: 2001 }, () => 0) }), JSON.stringify({ format: "mpu-ib-evidence", version: 1, records: Array(51).fill({ stage: "operation" }) }), envelope({ error: "PRIVATE\u0000" }), envelope({ error: "PRIVATE\u202e" }), envelope({ payload: { "PRIVATE\u202e": 1 } })];
    let nested: unknown = {}; for (let i = 0; i < 18; i++) nested = { child: nested }; overflows.push(envelope({ payload: nested }));
    for (const input of overflows) {
      try { parseIbEvidence(input); throw new Error("Accepted overflow"); } catch (error) { expect(String(error)).toContain("Unsupported IB evidence"); expect(String(error)).not.toContain("PRIVATE"); }
    }
    expect(() => renderIbInvestigation([], false)).toThrow(); expect(() => renderIbInvestigation(Array(5).fill(envelope()), false)).toThrow();
    const large = envelope({ payload: Array(62).fill("x".repeat(4000)) });
    expect(new TextEncoder().encode(large).length).toBeLessThan(IB_LIMITS.maxBytes);
    expect(() => renderIbInvestigation(Array(4).fill(large), true)).toThrow("IB report limit exceeded");
  });
});
