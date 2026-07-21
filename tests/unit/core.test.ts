import { describe, expect, it } from "vitest";
import { parsePsUrl, detectUiModel } from "@/adapters/ps-page";
import { migrateFromLegacy, originAllowed } from "@/storage/settings";
import { createDefaultSettings, isYes } from "@/storage/schema";
import { computePeopleCodeMask, computeSqlMask } from "@/features/trace";

describe("parsePsUrl", () => {
  it("parses component URLs", () => {
    const p = parsePsUrl(
      "https://hr.example.edu/psp/ps/EMPLOYEE/HRMS/c/ROLE_MANAGER.COMP.GBL",
    );
    expect(p.kind).toBe("component");
    expect(p.servlet).toBe("psp");
    expect(p.menu).toBe("ROLE_MANAGER");
    expect(p.component).toBe("COMP");
    expect(p.market).toBe("GBL");
    expect(p.siteNormalized).toBe("ps");
  });

  it("strips window suffix from site", () => {
    const p = parsePsUrl(
      "https://hr.example.edu/psp/ps_2/EMPLOYEE/HRMS/c/MENU.COMP.GBL",
    );
    expect(p.siteNormalized).toBe("ps");
  });

  it("detects login", () => {
    const p = parsePsUrl("https://hr.example.edu/psp/ps/?cmd=login&languageCd=ENG");
    expect(p.kind).toBe("login");
  });

  it("detects homepage and worklist", () => {
    expect(
      parsePsUrl("https://x/psp/ps/EMPLOYEE/HRMS/h/?tab=DEFAULT").kind,
    ).toBe("homepage");
    expect(
      parsePsUrl("https://x/psc/ps/EMPLOYEE/HRMS/w/WORKLIST").kind,
    ).toBe("worklist");
  });
});

describe("detectUiModel", () => {
  it("detects fluid header", () => {
    document.body.innerHTML = `<div id="PT_HEADER"></div>`;
    expect(detectUiModel(document)).toBe("fluid");
  });

  it("detects classic frame", () => {
    document.body.innerHTML = `<iframe id="ptifrmtgtframe"></iframe>`;
    expect(detectUiModel(document)).toBe("classic");
  });
});

describe("settings migration and allowlist", () => {
  it("migrates legacy favorites and strips nothing required", () => {
    const migrated = migrateFromLegacy({
      userIdOption: "Yes",
      shortcutstable: [
        {
          Servlet: "psp",
          Menu: "M",
          Component: "C",
          Market: "GBL",
          Parameters: "",
          Category: "",
          SubCategory: "",
          Description: "Test",
        },
      ],
      psutilEnvs: [{ label: "DEV", active: "Yes", trcProfRunning: "No", creds: { u: "x" } }],
    });
    expect(migrated.favorites).toHaveLength(1);
    expect(migrated.environments[0].label).toBe("DEV");
    expect(migrated.schemaVersion).toBe(1);
  });

  it("allowlist opt-in defaults to open", () => {
    const s = createDefaultSettings();
    expect(isYes(s.features.hostAllowlistEnabled)).toBe(false);
    expect(originAllowed("https://hr.example.edu/psp/ps/c/x", s)).toBe(true);
  });

  it("allowlist restricts when enabled", () => {
    const s = createDefaultSettings();
    s.features.hostAllowlistEnabled = "Yes";
    s.hostAllowlist = ["https://hr.college.edu"];
    expect(originAllowed("https://hr.college.edu/psp/ps/c/x", s)).toBe(true);
    expect(originAllowed("https://other.edu/psp/ps/c/x", s)).toBe(false);
  });
});

describe("trace masks", () => {
  it("computes PC and SQL masks", () => {
    const t = createDefaultSettings().traceSettings;
    expect(computePeopleCodeMask(t)).toBe(4 | 64);
    expect(computeSqlMask(t)).toBe(1 | 2);
  });
});
