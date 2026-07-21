import { describe, expect, it } from "vitest";
import {
  applyTracePreset,
  summarizeActiveTraceFlags,
  TRACE_PRESET_META,
} from "@/features/trace-presets";
import { DEFAULT_TRACE } from "@/storage/schema";
import { computePeopleCodeMask, computeSqlMask } from "@/features/trace";

describe("trace presets", () => {
  it("exposes named presets", () => {
    expect(TRACE_PRESET_META.map((p) => p.id)).toEqual([
      "off",
      "default",
      "sql",
      "peoplecode",
      "verbose",
    ]);
  });

  it("off clears every flag", () => {
    const t = applyTracePreset("off");
    expect(computePeopleCodeMask(t)).toBe(0);
    expect(computeSqlMask(t)).toBe(0);
    expect(summarizeActiveTraceFlags(t)).toContain("None");
  });

  it("default matches schema defaults", () => {
    expect(applyTracePreset("default")).toEqual(DEFAULT_TRACE);
  });

  it("sql and peoplecode are mutually focused", () => {
    const sql = applyTracePreset("sql");
    expect(computePeopleCodeMask(sql)).toBe(0);
    expect(computeSqlMask(sql)).toBe(1 | 2);

    const pc = applyTracePreset("peoplecode");
    expect(computeSqlMask(pc)).toBe(0);
    expect(computePeopleCodeMask(pc)).toBe(4 | 64);
  });

  it("verbose turns on a broader debug set", () => {
    const t = applyTracePreset("verbose");
    expect(computePeopleCodeMask(t)).toBeGreaterThan(0);
    expect(computeSqlMask(t)).toBeGreaterThan(0);
    expect(summarizeActiveTraceFlags(t)).toContain("SQL Stmt");
  });
});
