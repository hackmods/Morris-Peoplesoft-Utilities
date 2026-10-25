import { describe, expect, it } from "vitest";
import { parseSchedulerExcerpt } from "@/features/scheduler-investigation";
import {
  renderSchedulerCase,
  schedulerFocusChoices,
  SCHEDULER_CASE_FIELDS,
  type SchedulerCase,
} from "@/features/scheduler-case";

const excerpts = () => [
  parseSchedulerExcerpt([
    "2026-10-20T13:00:00Z Process Instance: 101; started",
    "",
    "2026-10-20T13:00:01Z Process Instance: 101; ended",
    "2026-10-20T13:00:02Z Process Instance: 202; other",
  ].join("\n")),
  parseSchedulerExcerpt([
    "2026-10-20T14:00:00Z Process Instance: 101; token=PRIVATE-VALUE",
    "2026-10-20T14:00:01Z Process Instance: 101; separate source",
    "2026-10-20T14:00:02Z Process Instance: 303; separate process",
  ].join("\n")),
];

const render = (draft: SchedulerCase) => renderSchedulerCase(draft, excerpts()).join("\n");

describe("manual Scheduler case", () => {
  it("offers unique source-bound focuses and omits IDs in masked records", () => {
    expect(schedulerFocusChoices(excerpts())).toEqual([
      { value: "1:101", label: "Source 1 — Process Instance 101" },
      { value: "1:202", label: "Source 1 — Process Instance 202" },
      { value: "2:101", label: "Source 2 — Process Instance 101" },
      { value: "2:303", label: "Source 2 — Process Instance 303" },
    ]);
    expect(schedulerFocusChoices([parseSchedulerExcerpt("Process Instance: 909; token=PRIVATE-VALUE")])).toEqual([]);
  });

  it("reports only explicit matching rows in the chosen source", () => {
    const first = render({ focus: "1:101" });
    expect(first).toContain("Selected process focus: Source 1; Process Instance 101");
    expect(first).toContain("Selected focus references: Source 1:L1, Source 1:L3");
    expect(first).not.toContain("Selected focus references: Source 2:L2");
    const second = render({ focus: "2:101" });
    expect(second).toContain("Selected focus references: Source 2:L2");
    expect(second).not.toContain("Source 2:L1");
    expect(render({})).toContain("Selected process focus: unknown");
  });

  it("accepts exact citations to nonblank physical lines, including masked lines without extraction", () => {
    const report = render({ evidenceRefs: "Source 1:L3, Source 2:L1" });
    expect(report).toContain("Evidence references: Source 1:L3, Source 2:L1 [masked; no detail extracted] | Manual citations, unverified");
    expect(report).not.toContain("PRIVATE-VALUE");
    expect(render({})).toContain("Evidence references: unknown");
  });

  it("rejects malformed, blank, out-of-source, and out-of-range citations with a generic error", () => {
    for (const evidenceRefs of [
      "Source 1:L2", // Blank physical line omitted by the parser.
      "Source 1:L9", "Source 3:L1", "Source 0:L1", "Source 1:L0",
      "Source 01:L1", "Source 1:L01", "Source 1:L1,", "Source 1:L1; Source 2:L2",
      "Source 1:L1\u202ePRIVATE-VALUE", "Source 1:L1".repeat(51),
    ]) {
      expect(() => render({ evidenceRefs })).toThrowError("Unsupported Scheduler case draft.");
    }
  });

  it("rejects unsupported focuses, unknown properties, bounds, and unsafe text without echoing values", () => {
    const bad: SchedulerCase[] = [
      { focus: "2:999" }, { focus: "3:101" }, { focus: "01:101" }, { focus: "1:0" },
      { focus: "1:101\u202ePRIVATE-VALUE" },
      { caseLabel: "x".repeat(201) }, { findings: "x".repeat(2_001) },
      { caseLabel: "PRIVATE\u0000VALUE" }, { expected: "PRIVATE\u2066VALUE" },
      { unexpected: "PRIVATE-VALUE" } as SchedulerCase,
    ];
    for (const draft of bad) {
      try {
        render(draft);
        throw new Error("Expected case validation to reject input.");
      } catch (error) {
        expect((error as Error).message).toBe("Unsupported Scheduler case draft.");
        expect((error as Error).message).not.toContain("PRIVATE-VALUE");
      }
    }
    expect(render({ caseLabel: "x".repeat(200), findings: "x".repeat(2_000) })).toContain("Manual assertion, unverified");
    expect(SCHEDULER_CASE_FIELDS).toHaveLength(11);
    expect(SCHEDULER_CASE_FIELDS.filter(field => field.maxLength === 200)).toHaveLength(5);
    expect(SCHEDULER_CASE_FIELDS.filter(field => field.maxLength === 2_000)).toHaveLength(6);
  });

  it("quotes manual assertions, labels unknowns, and warns when manual instance conflicts with focus", () => {
    const report = render({ caseLabel: 'Issue "A"', processInstance: "202", focus: "1:101" });
    expect(report).toContain('Case label: "Issue \\"A\\"" | Manual assertion, unverified');
    expect(report).toContain('Process instance: "202" | Manual assertion, unverified');
    expect(report).toContain("Environment label: unknown");
    expect(report).toContain("Scope warning: manually entered process instance differs from selected source labels.");
    expect(render({ processInstance: "101", focus: "1:101" })).not.toContain("Scope warning:");
  });

  it("masks credential, path, continuation, and private-key block lines in manual notes", () => {
    const report = render({
      expected: "safe first line\nAuthorization: Basic PRIVATE-A\nPRIVATE-CONTINUATION",
      observed: "C:\\private\\file\n/private/path\nhttps://private.invalid",
      runObservation: "-----BEGIN PRIVATE KEY-----\nPRIVATE-KEY-MATERIAL",
      distributionObservation: "MORE-PRIVATE-MATERIAL\n-----END PRIVATE KEY-----",
      findings: "safe after block",
    });
    expect(report).toContain('Expected: "safe first line\\n[masked manual text]\\n[masked manual text]"');
    expect(report).toContain('Run observation: "[masked manual text]\\n[masked manual text]"');
    expect(report).toContain('Distribution observation: "[masked manual text]\\n[masked manual text]"');
    expect(report).toContain('Findings: "safe after block"');
    expect(report).not.toMatch(/PRIVATE-A|PRIVATE-CONTINUATION|private\\file|\/private\/path|private\.invalid|PRIVATE-KEY-MATERIAL|MORE-PRIVATE-MATERIAL/);
  });
});
