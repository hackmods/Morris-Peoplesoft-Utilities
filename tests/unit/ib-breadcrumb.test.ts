import { describe, expect, it } from "vitest";
import { collectIbBreadcrumb, formatIbBreadcrumbPlain } from "@/features/ib-breadcrumb";
import type { ParsedPsUrl } from "@/adapters/ps-page";

const ibParsed: ParsedPsUrl = {
  href: "https://hr.example.edu/psp/ps/EMPLOYEE/HRMS/c/IB_MONITOR_MENU.IB_MONITOR_ASYNCH.GBL",
  baseURL: "https://hr.example.edu",
  origin: "https://hr.example.edu",
  servlet: "psp",
  site: "ps",
  siteNormalized: "ps",
  portal: "EMPLOYEE",
  node: "HRMS",
  kind: "component",
  menu: "IB_MONITOR_MENU",
  component: "IB_MONITOR_ASYNCH",
  market: "GBL",
};

describe("ib breadcrumb", () => {
  it("returns null on non-IB pages", () => {
    document.body.innerHTML = `<input id="JOB_EMPLID$0" />`;
    expect(collectIbBreadcrumb(document, { ...ibParsed, menu: "MENU", component: "COMP" })).toBeNull();
  });

  it("extracts service operation from visible fields", () => {
    document.body.innerHTML = `
      <input id="SERVICE_OPR_VW_SERVICE_OPRNAME" value="CAMPUS_EVENT_NOTIFY" />
      <span id="MSG_QUEUE_NAME">CAMPUS_QUEUE</span>
    `;
    const crumb = collectIbBreadcrumb(document, ibParsed);
    expect(crumb?.serviceOperation).toBe("CAMPUS_EVENT_NOTIFY");
    expect(crumb?.summary).toContain("SvcOp:");
    expect(formatIbBreadcrumbPlain(crumb!)).toBe(crumb!.summary);
  });
});
