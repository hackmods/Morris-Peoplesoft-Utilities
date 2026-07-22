import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { getTargetDocument } from "@/adapters/ps-page";
import {
  isFieldInspectorActive,
  startFieldInspector,
  stopFieldInspector,
  toggleFieldInspector,
  fieldNameFromId,
  getLockedFieldName,
  getLockedParsedRecField,
  syncFieldInspectorChrome,
  reinjectFieldInspector,
  inferRecordName,
  parseRecField,
  formatRecFieldPlain,
  formatRecFieldCopy,
  formatGetRowsetCopy,
  preferredFluidBoxHost,
  nearbyPageLabel,
  fieldDomAttrs,
  detectFieldContextChips,
  isFieldInViewport,
} from "@/features/field-inspector";
import { getInspectorContentRoot } from "@/adapters/ps-page";

describe("field inspector", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="mpu-bar">
        <button type="button" id="mpu-field">Inspect</button>
        <span id="mpu-recfield-name" class="mpu-recfield-name" hidden></span>
      </div>
      <div class="ps-field">
        <label>Emplid</label>
        <input id="JOB_EMPLID$0" value="1" />
      </div>
      <div class="ps-field">
        <span class="PSEDITBOX_DISPONLY" id="NAMES_NAME_DISPLAY">Ada</span>
      </div>
      <div class="ps-field">
        <input id="plain" value="no-underscore" />
      </div>
      <a id="ICSave">Save</a>
    `;
    stopFieldInspector(document);
  });

  afterEach(() => {
    stopFieldInspector(document);
    vi.useRealTimers();
  });

  it("formats field names like legacy (strip $occ, keep underscores)", () => {
    expect(fieldNameFromId("JOB_EMPLID$0")).toBe("JOB_EMPLID");
    expect(fieldNameFromId("STDNT_CAR_TERM_STRM")).toBe("STDNT_CAR_TERM_STRM");
  });

  it("splits record vs field using peer ids on the page", () => {
    const peers = ["NC_REHIRE_ELIG_TO_DATE", "NC_REHIRE_ELIG_FROM_DATE", "NC_REHIRE_ELIG_EMPLID"];
    expect(inferRecordName("NC_REHIRE_ELIG_TO_DATE", peers)).toBe("NC_REHIRE_ELIG");
    const parsed = parseRecField("NC_REHIRE_ELIG_TO_DATE$0", peers);
    expect(parsed.record).toBe("NC_REHIRE_ELIG");
    expect(parsed.field).toBe("TO_DATE");
    expect(parsed.occurrence).toBe("0");
    expect(formatRecFieldPlain(parsed)).toBe("NC_REHIRE_ELIG.TO_DATE (row 0)");
  });

  it("falls back to full id when peers do not share a record", () => {
    const parsed = parseRecField("JOB_EMPLID$0", ["NAMES_NAME_DISPLAY"]);
    expect(parsed.record).toBeUndefined();
    expect(formatRecFieldPlain(parsed)).toBe("JOB_EMPLID (row 0)");
  });

  it("flags DERIVED_ work records and finds nearby labels", () => {
    document.body.innerHTML = `
      <div class="ps-field">
        <label class="PSEDITBOXLABEL" for="DERIVED_HR_EMPLID$0">Empl ID</label>
        <input id="DERIVED_HR_EMPLID$0" />
      </div>
      <div class="ps-field"><input id="DERIVED_HR_NAME$0" /></div>
    `;
    const peers = ["DERIVED_HR_EMPLID", "DERIVED_HR_NAME"];
    const el = document.getElementById("DERIVED_HR_EMPLID$0")!;
    const parsed = parseRecField("DERIVED_HR_EMPLID$0", peers, el);
    expect(parsed.record).toBe("DERIVED_HR");
    expect(parsed.field).toBe("EMPLID");
    expect(parsed.workRecord).toBe(true);
    expect(parsed.pageLabel).toBe("Empl ID");
    expect(formatRecFieldCopy(parsed)).toBe("DERIVED_HR.EMPLID");
    expect(formatRecFieldCopy(parsed, "ampersand")).toBe("&DERIVED_HR.EMPLID");
    expect(formatRecFieldCopy(parsed, "getfield")).toBe("GetField(Field.EMPLID)");
    expect(formatGetRowsetCopy(parsed)).toBe(
      "GetLevel0().GetRow(0).GetRecord(Record.DERIVED_HR).GetField(Field.EMPLID)",
    );
  });

  it("toggles active state and exits on Escape", () => {
    expect(isFieldInspectorActive()).toBe(false);
    expect(toggleFieldInspector(document)).toBe(true);
    expect(isFieldInspectorActive()).toBe(true);
    expect(document.querySelectorAll(".mpu-recfield-icon").length).toBeGreaterThan(0);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(isFieldInspectorActive()).toBe(false);
    expect(document.querySelectorAll(".mpu-recfield-icon").length).toBe(0);
  });

  it("injects inline SVG icons only for PeopleSoft-style ids containing underscore", () => {
    startFieldInspector(document);
    const icons = Array.from(document.querySelectorAll(".mpu-recfield-icon"));
    expect(icons.length).toBe(2);
    expect(icons.every((el) => el.namespaceURI === "http://www.w3.org/2000/svg")).toBe(true);
    expect(icons.every((el) => el.querySelector("circle[stroke='#E36B22']"))).toBe(true);
    expect(document.querySelector(".mpu-recfield-area")).toBeTruthy();
    expect(document.querySelector("a#ICSave")?.closest(".mpu-recfield-area")).toBeNull();
    stopFieldInspector(document);
    expect(document.getElementById("JOB_EMPLID$0")).toBeTruthy();
    expect(document.querySelector(".mpu-recfield-area")).toBeNull();
  });

  it("shows broken-out Rec/Fld labels on hover and lock", () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    document.body.innerHTML = `
      <div id="mpu-bar">
        <button type="button" id="mpu-field">Inspect</button>
        <span id="mpu-recfield-name" class="mpu-recfield-name" hidden></span>
        <button type="button" id="mpu-copy-field" hidden>Copy field</button>
      </div>
      <div class="ps-field"><input id="NC_REHIRE_ELIG_TO_DATE$0" value="01/01/2050" /></div>
      <div class="ps-field"><input id="NC_REHIRE_ELIG_FROM_DATE$0" value="01/01/2000" /></div>
    `;
    startFieldInspector(document);
    syncFieldInspectorChrome(document);
    expect(document.getElementById("mpu-field")?.textContent).toBe("Inspect ON");

    const icon = document.querySelector(
      '.mpu-recfield-icon[data-mpu-field-id="NC_REHIRE_ELIG_TO_DATE$0"]',
    ) as SVGElement;
    expect(icon).toBeTruthy();

    icon.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    const panel = document.getElementById("mpu-recfield-name")!;
    expect(panel.querySelector(".mpu-rf-rec .mpu-rf-val")?.textContent).toBe("NC_REHIRE_ELIG");
    expect(panel.querySelector(".mpu-rf-fld .mpu-rf-val")?.textContent).toBe("TO_DATE");
    expect(panel.querySelector(".mpu-rf-occ .mpu-rf-val")?.textContent).toBe("0");
    expect(panel.getAttribute("title")).toBe("NC_REHIRE_ELIG.TO_DATE (row 0)");

    icon.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(getLockedFieldName()).toBe("NC_REHIRE_ELIG.TO_DATE (row 0)");
    expect(getLockedParsedRecField()?.record).toBe("NC_REHIRE_ELIG");
    expect(getLockedParsedRecField()?.field).toBe("TO_DATE");
    expect(icon.querySelector("circle")?.getAttribute("stroke")).toBe("#5DA027");
    expect(writeText).toHaveBeenCalledWith("NC_REHIRE_ELIG.TO_DATE");

    stopFieldInspector(document);
    syncFieldInspectorChrome(document);
    expect(getLockedFieldName()).toBeNull();
    expect(document.getElementById("mpu-field")?.textContent).toBe("Inspect");
  });

  it("hides empty name panel until a field is hovered", () => {
    startFieldInspector(document);
    syncFieldInspectorChrome(document);
    const panel = document.getElementById("mpu-recfield-name")!;
    expect(panel.getAttribute("data-mpu-empty")).toBe("true");
    expect(panel.textContent).toBe("");
  });

  it("reinjects icons after DOM wipe while still active", () => {
    startFieldInspector(document);
    expect(document.querySelectorAll(".mpu-recfield-icon").length).toBe(2);
    document.querySelectorAll(".mpu-recfield-icon, .mpu-recfield-area").forEach((el) => {
      if (el.classList.contains("mpu-recfield-icon")) el.remove();
      else {
        const area = el;
        const parent = area.parentElement!;
        while (area.firstChild) parent.insertBefore(area.firstChild, area);
        area.remove();
      }
    });
    expect(document.querySelectorAll(".mpu-recfield-icon").length).toBe(0);
    expect(reinjectFieldInspector(document)).toBe(2);
    expect(document.querySelectorAll(".mpu-recfield-icon").length).toBe(2);
  });

  it("toggle off returns false when already active", () => {
    expect(toggleFieldInspector(document)).toBe(true);
    expect(toggleFieldInspector(document)).toBe(false);
    expect(isFieldInspectorActive()).toBe(false);
  });

  it("polls until Classic iframe content appears", async () => {
    vi.useFakeTimers();
    stopFieldInspector(document);
    document.body.innerHTML = `
      <div id="mpu-bar">
        <button type="button" id="mpu-field">Inspect</button>
        <span id="mpu-recfield-name" hidden></span>
      </div>
      <iframe id="ptifrmtgtframe" name="TargetContent"></iframe>
    `;
    const iframe = document.getElementById("ptifrmtgtframe") as HTMLIFrameElement;
    iframe.contentDocument!.open();
    iframe.contentDocument!.write(`<!doctype html><html><body></body></html>`);
    iframe.contentDocument!.close();

    startFieldInspector(document);
    expect(iframe.contentDocument!.querySelectorAll(".mpu-recfield-icon").length).toBe(0);

    iframe.contentDocument!.body.innerHTML = `<div><input id="JOB_EMPLID$0" /></div>`;
    await vi.advanceTimersByTimeAsync(300);
    expect(iframe.contentDocument!.querySelectorAll(".mpu-recfield-icon").length).toBe(1);
    stopFieldInspector(document);
  });

  it("injects into Classic TargetContent iframe document", () => {
    stopFieldInspector(document);
    document.body.innerHTML = `
      <div id="mpu-bar">
        <button type="button" id="mpu-field">Inspect</button>
        <span id="mpu-recfield-name" hidden></span>
      </div>
      <div id="ptifrmtarget">
        <iframe id="ptifrmtgtframe" name="TargetContent"></iframe>
      </div>
    `;
    const iframe = document.getElementById("ptifrmtgtframe") as HTMLIFrameElement;
    const iframeDoc = iframe.contentDocument!;
    iframeDoc.open();
    iframeDoc.write(`
      <!doctype html><html><body>
        <div><input id="JOB_EMPLID$0" value="1" /></div>
        <div><span class="PSEDITBOX_DISPONLY" id="NAMES_NAME_DISPLAY">Ada</span></div>
      </body></html>
    `);
    iframeDoc.close();

    expect(iframeDoc.querySelector("input") instanceof HTMLElement).toBe(false);
    expect(getTargetDocument(document)).toBe(iframeDoc);

    startFieldInspector(document);
    expect(iframe.contentDocument!.querySelectorAll(".mpu-recfield-icon").length).toBe(2);
    expect(document.querySelectorAll(".mpu-recfield-icon").length).toBe(0);
    stopFieldInspector(document);
    expect(iframe.contentDocument!.querySelectorAll(".mpu-recfield-icon").length).toBe(0);
  });

  it("exposes HTML type/maxlength/disabled chips", () => {
    document.body.innerHTML = `
      <div id="mpu-bar">
        <button type="button" id="mpu-field">Inspect</button>
        <span id="mpu-recfield-name" class="mpu-recfield-name" hidden></span>
      </div>
      <div class="ps-field">
        <input id="JOB_EMPLID$0" type="text" maxlength="11" disabled />
      </div>
      <div class="ps-field"><input id="JOB_EMPL_RCD$0" type="number" /></div>
    `;
    const el = document.getElementById("JOB_EMPLID$0")!;
    expect(fieldDomAttrs(el)).toEqual({ inputType: "text", maxLength: 11, disabled: true });
    startFieldInspector(document);
    syncFieldInspectorChrome(document);
    const icon = document.querySelector(
      '.mpu-recfield-icon[data-mpu-field-id="JOB_EMPLID$0"]',
    ) as SVGElement;
    icon.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    const panel = document.getElementById("mpu-recfield-name")!;
    expect(panel.querySelector(".mpu-rf-itype .mpu-rf-val")?.textContent).toBe("text");
    expect(panel.querySelector(".mpu-rf-maxlen .mpu-rf-val")?.textContent).toBe("11");
    expect(panel.querySelector(".mpu-rf-dis .mpu-rf-val")?.textContent).toBe("disabled");
    stopFieldInspector(document);
  });

  it("treats zero-size rects as in-viewport for jsdom / pre-layout", () => {
    document.body.innerHTML = `<input id="JOB_EMPLID$0" />`;
    const el = document.getElementById("JOB_EMPLID$0")!;
    expect(isFieldInViewport(el)).toBe(true);
  });

  it("measures the field itself — not a Classic tr host with off-screen geometry", () => {
    document.body.innerHTML = `
      <table>
        <tr id="row">
          <td><input id="NC_ADVANCE_TERM$0" value="1252" /></td>
        </tr>
      </table>
    `;
    const input = document.getElementById("NC_ADVANCE_TERM$0")!;
    const row = document.getElementById("row")!;
    // Simulate Classic table row reporting far off-screen while the field is visible
    vi.spyOn(row, "getBoundingClientRect").mockReturnValue({
      top: -8000,
      bottom: -7800,
      left: 0,
      right: 800,
      width: 800,
      height: 200,
      x: 0,
      y: -8000,
      toJSON() {
        return {};
      },
    } as DOMRect);
    vi.spyOn(input, "getBoundingClientRect").mockReturnValue({
      top: 120,
      bottom: 140,
      left: 80,
      right: 280,
      width: 200,
      height: 20,
      x: 80,
      y: 120,
      toJSON() {
        return {};
      },
    } as DOMRect);
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 700 });
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1100 });

    expect(isFieldInViewport(input)).toBe(true);

    stopFieldInspector(document);
    document.body.innerHTML = `
      <div id="mpu-bar">
        <button type="button" id="mpu-field">Inspect</button>
        <span id="mpu-recfield-name" hidden></span>
      </div>
      <div id="ptifrmtarget">
        <iframe id="ptifrmtgtframe" name="TargetContent"></iframe>
      </div>
    `;
    const iframe = document.getElementById("ptifrmtgtframe") as HTMLIFrameElement;
    const iframeDoc = iframe.contentDocument!;
    iframeDoc.open();
    iframeDoc.write(`<!doctype html><html><body>
      <table><tr id="bad-row"><td><input id="NC_ADVANCE_TERM$0" value="1252" /></td></tr></table>
    </body></html>`);
    iframeDoc.close();
    const iframeInput = iframeDoc.getElementById("NC_ADVANCE_TERM$0")!;
    const iframeRow = iframeDoc.getElementById("bad-row")!;
    vi.spyOn(iframeRow, "getBoundingClientRect").mockReturnValue({
      top: -8000,
      bottom: -7800,
      left: 0,
      right: 800,
      width: 800,
      height: 200,
      x: 0,
      y: -8000,
      toJSON() {
        return {};
      },
    } as DOMRect);
    vi.spyOn(iframeInput, "getBoundingClientRect").mockReturnValue({
      top: 120,
      bottom: 140,
      left: 80,
      right: 280,
      width: 200,
      height: 20,
      x: 80,
      y: 120,
      toJSON() {
        return {};
      },
    } as DOMRect);
    Object.defineProperty(iframeDoc.defaultView!, "innerHeight", { configurable: true, value: 700 });
    Object.defineProperty(iframeDoc.defaultView!, "innerWidth", { configurable: true, value: 1100 });

    startFieldInspector(document);
    expect(iframeDoc.querySelectorAll(".mpu-recfield-icon").length).toBe(1);
    stopFieldInspector(document);
  });

  it("decorates Classic TargetContent even when an empty nested iframe exists", () => {
    stopFieldInspector(document);
    document.body.innerHTML = `
      <div id="mpu-bar">
        <button type="button" id="mpu-field">Inspect</button>
        <span id="mpu-recfield-name" hidden></span>
      </div>
      <div id="ptifrmtarget">
        <iframe id="ptifrmtgtframe" name="TargetContent"></iframe>
      </div>
    `;
    const iframe = document.getElementById("ptifrmtgtframe") as HTMLIFrameElement;
    const iframeDoc = iframe.contentDocument!;
    iframeDoc.open();
    iframeDoc.write(`<!doctype html><html><body>
      <div><input id="PRCSRUNCNTL_RUN_CNTL_ID" value="TEST" /></div>
      <iframe class="ps_target-iframe"></iframe>
    </body></html>`);
    iframeDoc.close();
    const nested = iframeDoc.querySelector(".ps_target-iframe") as HTMLIFrameElement;
    nested.contentDocument!.open();
    nested.contentDocument!.write(`<!doctype html><html><body></body></html>`);
    nested.contentDocument!.close();

    expect(getTargetDocument(document).getElementById("PRCSRUNCNTL_RUN_CNTL_ID")).toBeTruthy();
    startFieldInspector(document);
    expect(iframeDoc.querySelectorAll(".mpu-recfield-icon").length).toBe(1);
    stopFieldInspector(document);
  });

  it("detects prompt, display-only, and deferred context chips (PC-04)", () => {
    document.body.innerHTML = `
      <div class="ps-field">
        <label>Empl ID</label>
        <input id="JOB_EMPLID$0" />
        <a id="JOB_EMPLID$prompt" title="Lookup">Lookup</a>
      </div>
      <div class="ps-field">
        <span class="PSEDITBOX_DISPONLY" id="NAMES_NAME_DISPLAY">Ada</span>
      </div>
      <div class="ps-field">
        <input id="DERIVED_HR_STATUS$0" title="Deferred processing scheduled" />
      </div>
    `;
    const promptEl = document.getElementById("JOB_EMPLID$0")!;
    const displayEl = document.getElementById("NAMES_NAME_DISPLAY")!;
    const deferredEl = document.getElementById("DERIVED_HR_STATUS$0")!;
    expect(detectFieldContextChips(promptEl)).toContain("Prompt");
    expect(detectFieldContextChips(displayEl)).toContain("Display");
    expect(detectFieldContextChips(deferredEl)).toContain("Deferred");

    const parsed = parseRecField("JOB_EMPLID$0", ["JOB_EMPLID"], promptEl);
    expect(parsed.contextChips).toContain("Prompt");
  });

  it("wraps Fluid ps_box hosts without swallowing the whole group", () => {
    document.body.innerHTML = `
      <div id="mpu-bar">
        <button type="button" id="mpu-field">Inspect</button>
        <span id="mpu-recfield-name" hidden></span>
      </div>
      <div class="ps_box-group">
        <div class="ps_box-label">Emplid</div>
        <div class="ps_box-control">
          <div class="ps_box-edit"><input id="JOB_EMPLID$0" /></div>
        </div>
        <div class="ps_box-control">
          <div class="ps_box-edit"><input id="JOB_EMPL_RCD$0" /></div>
        </div>
      </div>
    `;
    const input = document.getElementById("JOB_EMPLID$0")!;
    expect(preferredFluidBoxHost(input)?.classList.contains("ps_box-edit")).toBe(true);

    startFieldInspector(document);
    expect(document.querySelectorAll(".mpu-recfield-icon").length).toBe(2);
    expect(document.querySelector(".ps_box-group > .mpu-recfield-area")).toBeNull();
    expect(document.querySelector(".ps_box-control .mpu-recfield-area .ps_box-edit")).toBeTruthy();
    const el = document.getElementById("JOB_EMPLID$0")!;
    expect(nearbyPageLabel(el)).toBe("Emplid");
    stopFieldInspector(document);
  });

  it("does not wrap a shared Fluid ps_box-control that holds multiple fields", () => {
    document.body.innerHTML = `
      <div id="mpu-bar">
        <button type="button" id="mpu-field">Inspect</button>
        <span id="mpu-recfield-name" hidden></span>
      </div>
      <div class="ps_box-control" id="shared-control">
        <input id="JOB_EMPLID$0" />
        <input id="JOB_EMPL_RCD$0" />
      </div>
    `;
    const a = document.getElementById("JOB_EMPLID$0")!;
    expect(preferredFluidBoxHost(a)).toBeNull();

    startFieldInspector(document);
    expect(document.querySelectorAll(".mpu-recfield-icon").length).toBe(2);
    // Shared control itself must not become the AREA — each input is wrapped tightly
    expect(document.getElementById("shared-control")?.classList.contains("mpu-recfield-area")).toBe(
      false,
    );
    expect(document.getElementById("JOB_EMPLID$0")?.closest(".mpu-recfield-area")).toBeTruthy();
    expect(document.getElementById("JOB_EMPL_RCD$0")?.closest(".mpu-recfield-area")).toBeTruthy();
    expect(document.querySelectorAll("#shared-control > .mpu-recfield-area").length).toBe(2);
    stopFieldInspector(document);
  });

  it("Classic: wraps each field tightly when multiple inputs share a TD", () => {
    document.body.innerHTML = `
      <div id="mpu-bar">
        <button type="button" id="mpu-field">Inspect</button>
        <span id="mpu-recfield-name" hidden></span>
      </div>
      <table>
        <tr>
          <td id="cell">
            <input id="JOB_EMPLID$0" />
            <input id="JOB_EMPL_RCD$0" />
          </td>
        </tr>
      </table>
    `;
    startFieldInspector(document);
    expect(document.querySelectorAll(".mpu-recfield-icon").length).toBe(2);
    expect(document.querySelector("#cell > .mpu-recfield-area input#JOB_EMPLID\\$0")).toBeTruthy();
    expect(document.querySelectorAll("#cell > .mpu-recfield-area").length).toBe(2);
    stopFieldInspector(document);
  });

  it("Fluid menu shell: decorates Classic fields in nested TargetContent iframe", () => {
    stopFieldInspector(document);
    document.body.innerHTML = `
      <div id="mpu-bar">
        <button type="button" id="mpu-field">Inspect</button>
        <span id="mpu-recfield-name" hidden></span>
      </div>
      <div id="PT_HEADER"></div>
      <iframe class="ps_target-iframe"></iframe>
    `;
    const shell = document.querySelector(".ps_target-iframe") as HTMLIFrameElement;
    const shellDoc = shell.contentDocument!;
    shellDoc.open();
    shellDoc.write(`<!doctype html><html><body>
      <div class="ps_box-group">
        <div class="ps_box-edit"><input id="DERIVED_FLUID_SEARCH$0" /></div>
      </div>
      <iframe id="ptifrmtgtframe" name="TargetContent"></iframe>
    </body></html>`);
    shellDoc.close();

    const classic = shellDoc.querySelector("#ptifrmtgtframe") as HTMLIFrameElement;
    const classicDoc = classic.contentDocument!;
    classicDoc.open();
    classicDoc.write(`<!doctype html><html><body>
      <table><tr><td id="cell">
        <input id="JOB_EMPLID$0" />
        <input id="JOB_EMPL_RCD$0" />
      </td></tr></table>
    </body></html>`);
    classicDoc.close();

    expect(getInspectorContentRoot(document)).toBe(shellDoc);
    expect(getTargetDocument(document).getElementById("JOB_EMPLID$0")).toBeTruthy();

    startFieldInspector(document);
    // Fluid shell field + both Classic fields (tight wraps, not one container)
    expect(shellDoc.querySelectorAll(".mpu-recfield-icon").length).toBe(1);
    expect(classicDoc.querySelectorAll(".mpu-recfield-icon").length).toBe(2);
    expect(classicDoc.querySelectorAll("#cell > .mpu-recfield-area").length).toBe(2);
    stopFieldInspector(document);
    expect(classicDoc.querySelectorAll(".mpu-recfield-icon").length).toBe(0);
  });

  it("polls until Classic page appears inside Fluid nav iframe", async () => {
    vi.useFakeTimers();
    stopFieldInspector(document);
    document.body.innerHTML = `
      <div id="mpu-bar">
        <button type="button" id="mpu-field">Inspect</button>
        <span id="mpu-recfield-name" hidden></span>
      </div>
      <div id="PT_HEADER"></div>
      <iframe class="ps_target-iframe"></iframe>
    `;
    const shell = document.querySelector(".ps_target-iframe") as HTMLIFrameElement;
    shell.contentDocument!.open();
    shell.contentDocument!.write(`<!doctype html><html><body></body></html>`);
    shell.contentDocument!.close();

    startFieldInspector(document);
    expect(shell.contentDocument!.querySelectorAll(".mpu-recfield-icon").length).toBe(0);

    shell.contentDocument!.body.innerHTML = `<div><input id="JOB_EMPLID$0" /></div>`;
    await vi.advanceTimersByTimeAsync(300);
    expect(shell.contentDocument!.querySelectorAll(".mpu-recfield-icon").length).toBe(1);
    stopFieldInspector(document);
  });
});
