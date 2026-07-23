import { describe, expect, it, beforeEach } from "vitest";
import { buildEnvContextRows, formatEnvContextPlain } from "@/adapters/env-context";
import { parsePsUrl } from "@/adapters/ps-page";

describe("env context", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.body.innerHTML = "";
  });

  it("builds rows with URL context and optional theme / CREF", () => {
    document.documentElement.className = "ptal-theme-redwood";
    document.body.innerHTML = `
      <!-- User=BA1; ToolsRel=8.61.15; AppServ=//h:1 -->
      <nav class="ps_breadcrumb"><a href="#">Home</a><span>Admin</span></nav>
    `;
    const parsed = parsePsUrl("https://hr.example.edu/psp/ps/EMPLOYEE/HRMS/c/M.C.GBL");
    const rows = buildEnvContextRows(
      { toolsRel: "8.61.15", userId: "BA1" },
      parsed,
      "DEV",
      document,
    );
    expect(rows.map((r) => r.label)).toEqual([
      "Environment",
      "Site",
      "Portal",
      "Node",
      "ToolsRel",
      "Theme",
      "CREF path",
    ]);
    expect(rows.find((r) => r.label === "Portal")?.value).toBe("EMPLOYEE");
    expect(formatEnvContextPlain({ toolsRel: "8.61.15" }, parsed, "DEV", document)).toContain(
      "ToolsRel: 8.61.15",
    );
  });

  it("omits theme and CREF when absent", () => {
    const parsed = parsePsUrl("https://hr.example.edu/psp/ps/EMPLOYEE/HRMS/c/M.C.GBL");
    const rows = buildEnvContextRows({}, parsed, "QA", document);
    expect(rows.map((r) => r.label)).toEqual([
      "Environment",
      "Site",
      "Portal",
      "Node",
      "ToolsRel",
    ]);
    expect(rows.find((r) => r.label === "ToolsRel")?.value).toBe("—");
  });
});
