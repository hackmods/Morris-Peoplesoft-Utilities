import { describe, expect, it } from "vitest";
import { validateStoreScreenshots, MOCK_SCREENSHOT_MD5 } from "../../scripts/validate-store-screenshots.js";

describe("validateStoreScreenshots", () => {
  it("flags missing files as errors", () => {
    const issues = validateStoreScreenshots("/nonexistent-root");
    expect(issues.some((i) => i.level === "error")).toBe(true);
  });

  it("documents mock hashes for all five listing slots", () => {
    expect(Object.keys(MOCK_SCREENSHOT_MD5)).toHaveLength(5);
  });

  it("passes dimension checks on committed store screenshots", () => {
    const issues = validateStoreScreenshots();
    const errors = issues.filter((i) => i.level === "error");
    expect(errors).toEqual([]);
  });
});
