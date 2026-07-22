import { describe, expect, it } from "vitest";
import {
  collectProcessPack,
  formatProcessPackPlain,
  isProcessMonitorPage,
} from "@/features/process-pack";
import type { ParsedPsUrl } from "@/adapters/ps-page";

const pmParsed: ParsedPsUrl = {
  href: "https://hr.example.edu/psp/ps/EMPLOYEE/HRMS/c/PROCESS_SCHEDULER.PMN_PRCSLIST.GBL",
  baseURL: "https://hr.example.edu",
  origin: "https://hr.example.edu",
  servlet: "psp",
  site: "ps",
  siteNormalized: "ps",
  portal: "EMPLOYEE",
  node: "HRMS",
  kind: "component",
  menu: "PROCESS_SCHEDULER",
  component: "PMN_PRCSLIST",
  market: "GBL",
};

describe("process pack", () => {
  it("detects process monitor pages", () => {
    document.body.innerHTML = `<input id="PRCSINSTANCE" value="12345" />`;
    expect(isProcessMonitorPage(document, pmParsed)).toBe(true);
  });

  it("scrapes visible process monitor cells", () => {
    document.body.innerHTML = `
      <input id="PRCSINSTANCE" value="12345" />
      <span id="PRCSTYPE">Application Engine</span>
      <span id="PRCSNAME">MY_AE_PROGRAM</span>
      <input id="RUNCONTROL" value="RC_TEST" />
      <span id="OPRID">PS</span>
      <span id="RUNSTATUS">Success</span>
    `;
    const pack = collectProcessPack(document, pmParsed);
    expect(pack?.processInstance).toBe("12345");
    expect(pack?.processType).toBe("Application Engine");
    expect(pack?.processName).toBe("MY_AE_PROGRAM");
    const plain = formatProcessPackPlain(pack!);
    expect(plain).toContain("Process Instance: 12345");
    expect(plain).toContain("Run Status: Success");
  });
});
