import { describe, expect, it } from "vitest";
import { buildDiagnosticReport } from "@/features/diagnostics";
import { describeTraceRequest } from "@/features/trace-status";
import { createDefaultSettings, type TraceRequest } from "@/storage/schema";
import type { ParsedPsUrl } from "@/adapters/ps-page";

const parsed = { baseURL: "https://synthetic.example", siteNormalized: "ps" } as ParsedPsUrl;
const request: TraceRequest = { origin: parsed.baseURL, site: "ps", at: 1_000_000, target: "on", status: "confirmed" };

describe("trace request confidence", () => {
  it("distinguishes pending, last-acknowledged and incomplete requests", () => {
    expect(describeTraceRequest({ ...request, status: "requested" }, parsed, request.at + 1000).status).toBe("requested");
    expect(describeTraceRequest(request, parsed, request.at + 1000)).toMatchObject({ status: "last-confirmed", label: "Trace · last ON" });
    expect(describeTraceRequest({ ...request, status: "incomplete", target: "off" }, parsed, request.at + 1000).detail).toContain("may still be active");
  });

  it("does not carry confidence to another origin/site or an expired/future request", () => {
    for (const record of [undefined, { ...request, origin: "https://other.example" }, { ...request, site: "other" }, { ...request, at: 2_000_000 }, { ...request, at: 0 }]) {
      expect(describeTraceRequest(record, parsed, 1_000_000).status).toBe("unknown");
    }
    expect(describeTraceRequest({ ...request, status: "requested" }, parsed, request.at + 60_001).status).toBe("unknown");
    expect(describeTraceRequest(request, { ...parsed, baseURL: "invalid" }, request.at).status).toBe("unknown");
  });
});

describe("allowlisted diagnostics", () => {
  it("excludes private settings, field values and page/session context", () => {
    const settings = createDefaultSettings();
    settings.hostAllowlist = ["https://private-employer.example"];
    settings.environments = [{ label: "PRIVATE ENVIRONMENT", active: "Yes", trcProfRunning: "Yes", traceRequest: request }];
    settings.fieldEntryProfiles = [{ id: "secret", name: "Private profile", updatedAt: 1, rows: [{ record: "JOB", field: "EMPLID", value: "EMPLOYEE-SECRET" }] }];
    Object.assign(settings.features, { ICSID: "SESSION-SECRET" });
    const report = buildDiagnosticReport(settings, { version: "1.0.29", toolsRel: "8.62.06", uiMode: "fluid", traceStatus: "unknown" });
    expect(JSON.parse(report)).toMatchObject({ extensionVersion: "1.0.29", peopleTools: "8.62.06", uiMode: "fluid" });
    for (const secret of ["private-employer", "PRIVATE ENVIRONMENT", "Private profile", "EMPLOYEE-SECRET", "ICSID", "SESSION-SECRET", "synthetic.example"]) expect(report).not.toContain(secret);
    const invalid = buildDiagnosticReport(settings, { version: "1.0.29?token=secret", toolsRel: "8.62 token=secret", uiMode: "unknown private markup", traceStatus: "unknown" });
    expect(invalid).not.toContain("token=secret");
    expect(JSON.parse(invalid).peopleTools).toBe("unknown");
  });
});
