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

  it("refuses two visible process rows instead of combining their fields", () => {
    document.body.innerHTML = `
      <table><tbody>
        <tr><td><span id="PRCSINSTANCE$0">101</span></td></tr>
        <tr><td><span id="PRCSINSTANCE$1">202</span></td><td><span id="PRCSNAME$1">NAME_B</span></td></tr>
      </tbody></table>
    `;
    expect(collectProcessPack(document, pmParsed)).toBeNull();
  });

  it("refuses separate rows even when their process instances match", () => {
    document.body.innerHTML = `
      <table><tbody>
        <tr><td><span id="PRCSINSTANCE$0">101</span></td><td><span id="PRCSNAME$0">NAME_A</span></td></tr>
        <tr><td><span id="PRCSINSTANCE$1">101</span></td><td><span id="PRCSNAME$1">NAME_B</span></td></tr>
      </tbody></table>
    `;
    expect(collectProcessPack(document, pmParsed)).toBeNull();
  });

  it("takes only fields in the sole process row", () => {
    document.body.innerHTML = `
      <table><tbody><tr><td><span id="PRCSINSTANCE$0">101</span></td></tr></tbody></table>
      <span id="PRCSNAME_OUTSIDE">UNRELATED_NAME</span>
    `;
    expect(collectProcessPack(document, pmParsed)).toEqual({ processInstance: "101" });
  });

  it("does not follow a selected row label to another row's control", () => {
    document.body.innerHTML = `<table><tr aria-selected="true"><td><span id="PRCSINSTANCE_A">101</span><label for="elsewhere">Process Name</label></td></tr><tr><td><span id="PRCSINSTANCE_B">202</span><input id="elsewhere" value="NAME_B"></td></tr></table>`;
    expect(collectProcessPack(document, pmParsed)).toEqual({ processInstance: "101" });
  });

  it("uses an explicitly selected process row and its own fields", () => {
    document.body.innerHTML = `
      <table><tbody>
        <tr role="row"><td><span id="PRCSINSTANCE$0">101</span></td><td><span id="PRCSNAME$0">NAME_A</span></td></tr>
        <tr role="row" aria-selected="true"><td><span id="PRCSINSTANCE$1">202</span></td><td><span id="PRCSNAME$1">NAME_B</span></td></tr>
      </tbody></table>
    `;
    expect(collectProcessPack(document, pmParsed)).toEqual({ processInstance: "202", processName: "NAME_B" });
  });

  it("does not treat an unrelated checked row control as process selection", () => {
    document.body.innerHTML = `
      <table><tbody>
        <tr><td><span id="PRCSINSTANCE$0">101</span></td></tr>
        <tr><td><input type="checkbox" checked aria-label="Subscribe to updates" /></td><td><span id="PRCSINSTANCE$1">202</span></td></tr>
      </tbody></table>
    `;
    expect(collectProcessPack(document, pmParsed)).toBeNull();
  });

  it("ignores hidden, password, and extension UI evidence and skips empty candidates", () => {
    document.body.innerHTML = `
      <input id="PRCSINSTANCE_HIDDEN" type="hidden" value="999" />
      <input id="PRCSINSTANCE_PASSWORD" type="password" value="SECRET" />
      <div id="mpu-bar"><span id="PRCSINSTANCE_MPU">777</span><span id="PRCSNAME_MPU">MPU_NAME</span></div>
      <input id="PRCSINSTANCE" value="101" />
      <span id="PRCSNAME_EMPTY"></span><span id="PRCSNAME_VISIBLE">NAME_A</span>
      <span id="STATUS_OTHER">Unrelated status</span>
    `;
    expect(collectProcessPack(document, pmParsed)).toEqual({ processInstance: "101", processName: "NAME_A" });
  });

  it("does not include hidden descendant text in a visible field", () => {
    document.body.innerHTML = `
      <input id="PRCSINSTANCE" value="101" />
      <span id="PRCSNAME"><span hidden>SECRET</span><span>NAME_A</span></span>
    `;
    expect(collectProcessPack(document, pmParsed)?.processName).toBe("NAME_A");
  });

  it("preserves a singleton detail view using adjacent labels and values", () => {
    document.body.innerHTML = `
      <div><label for="detail-instance">Process Instance</label><input id="detail-instance" value="101" /></div>
      <div><span>Process Name</span><span>NAME_A</span></div>
      <div><span>Run Status</span><span>Success</span></div>
    `;
    expect(collectProcessPack(document, pmParsed)).toEqual({
      processInstance: "101", processName: "NAME_A", runStatus: "Success",
    });
  });

  it("reads the owning nested target document instead of portal decoys", () => {
    document.body.innerHTML = `
      <input id="PRCSINSTANCE_PORTAL" value="999" />
      <iframe id="ptifrmtgtframe" name="TargetContent"></iframe>
    `;
    const outer = document.getElementById("ptifrmtgtframe") as HTMLIFrameElement;
    const outerDoc = outer.contentDocument!;
    outerDoc.open();
    outerDoc.write('<!doctype html><html><body><iframe class="ps_target-iframe"></iframe></body></html>');
    outerDoc.close();
    const nested = outerDoc.querySelector(".ps_target-iframe") as HTMLIFrameElement;
    nested.contentDocument!.open();
    nested.contentDocument!.write(`<!doctype html><html><body>
      <table><tbody><tr><td><span id="PRCSINSTANCE$0">101</span></td><td><span id="PRCSNAME$0">NAME_A</span></td></tr></tbody></table>
    </body></html>`);
    nested.contentDocument!.close();

    expect(collectProcessPack(document, pmParsed)).toEqual({ processInstance: "101", processName: "NAME_A" });
  });
});
