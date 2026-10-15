import { afterEach, describe, expect, it, vi } from "vitest";
import { captureFieldValues, matchBufferToPage, applyEligibilityReport, prepareSheetBuffer, parseSheetPaste } from "@/features/field-entry";
import { collectFieldIdBases } from "@/features/upgrade-watch";
import { collectFluidStructure } from "@/features/fluid-structure";
import { collectPageTabs, detectUiModel, parsePsUrl } from "@/adapters/ps-page";
import { createDefaultSettings } from "@/storage/schema";
import { originAllowed } from "@/storage/settings";
import { isSettingsBackup, mergeSettingsBackup } from "@/storage/backup";
import { favoritesToCsv, parseFavoritesCsv } from "@/storage/favorites-io";
import { bindModalDialog } from "@/features/dialog";
import { runSearchOptions, stopSearchOptions } from "@/features/search";

afterEach(() => { stopSearchOptions(); vi.useRealTimers(); document.body.replaceChildren(); });

describe("review regressions: page isolation", () => {
  it.each(["", "https", "https://", "//hr.example.edu", "https://user:secret@hr.example.edu"])("rejects malformed allowlist entry %s", (entry) => {
    const s = createDefaultSettings(); s.features.hostAllowlistEnabled = "Yes"; s.hostAllowlist = [entry];
    expect(originAllowed("https://hr.example.edu/psp/ps/EMPLOYEE/HRMS/c/M.C.GBL", s)).toBe(false);
  });
  it("does not treat an arbitrary website's login command as PeopleSoft", () => {
    expect(parsePsUrl("https://example.org/?cmd=login").kind).toBe("unknown");
    expect(parsePsUrl("https://example.org/psp/hr_862/EMPLOYEE/HRMS/c/M.C.GBL").siteNormalized).toBe("hr");
    expect(parsePsUrl("https://example.org/psp/hr_862_test_2/EMPLOYEE/HRMS/c/M.C.GBL").siteNormalized).toBe("hr_862_test");
    expect(parsePsUrl("https://example.org/psc/hr_newwin/EMPLOYEE/HRMS/c/M.C.GBL").siteNormalized).toBe("hr");
  });
  it("cancels delayed search actions when disabled", () => {
    vi.useFakeTimers(); runSearchOptions(createDefaultSettings()); stopSearchOptions(); vi.runAllTimers();
    expect(document.querySelector("script[data-mpu-inject]")).toBeNull();
  });
});

describe("review regressions: Classic iframe fields", () => {
  function frame() {
    document.body.innerHTML = '<div id="PT_HEADER"></div><iframe id="ptifrmtgtframe"></iframe>';
    const doc = document.querySelector("iframe")!.contentDocument!;
    doc.body.innerHTML = '<table class="PSLEVEL1GRID" id="grid"><tr><td><input id="JOB_DEPTID$0" value="100"><input id="JOB_JOBCODE$0" value="ABC"><input id="JOB_PASSWORD" type="password" value="secret"></td></tr></table>';
    return doc;
  }
  it("captures, previews and writes fields belonging to another DOM realm", () => {
    const doc = frame();
    expect(detectUiModel(document)).toBe("classic");
    const rows = captureFieldValues(document);
    expect(rows.map((r) => r.value)).toEqual(["100", "ABC"]);
    const report = matchBufferToPage([{ record: "JOB", field: "DEPTID", occurrence: "0", value: "200" }]);
    expect(report.willWrite).toBe(1);
    expect(applyEligibilityReport(report)).toBe(1);
    expect((doc.getElementById("JOB_DEPTID$0") as HTMLInputElement).value).toBe("200");
    expect(collectFieldIdBases()).toContain("JOB_DEPTID");
    expect(collectFluidStructure().some((n) => n.id === "grid")).toBe(true);
    doc.body.insertAdjacentHTML("beforeend", '<div id="PSTAB"><a role="tab" id="tab1">Details</a></div>');
    expect(collectPageTabs(document).some((t) => t.label === "Details")).toBe(true);
  });
  it("skips hidden, disabled and non-text controls and invalid select choices", () => {
    frame();
    document.body.insertAdjacentHTML("beforeend", '<div hidden><input id="JOB_HIDDEN" value="hidden"></div><fieldset disabled><input id="JOB_DISABLED" value="disabled"></fieldset><input type="checkbox" id="JOB_CHECK" value="Y"><input type="file" id="JOB_FILE"><select id="JOB_STATUS"><option value="A">Active</option></select>');
    const rows = captureFieldValues();
    expect(rows.some((r) => ["HIDDEN", "DISABLED", "CHECK", "FILE"].includes(r.field))).toBe(false);
    expect(matchBufferToPage([{ record: "JOB", field: "STATUS", value: "INVALID" }]).skipped).toBe(1);
  });
  it("does not overwrite fields changed or replaced after preview", () => {
    const doc = frame();
    const report = matchBufferToPage([{ record: "JOB", field: "DEPTID", occurrence: "0", value: "200" }]);
    (doc.getElementById("JOB_DEPTID$0") as HTMLInputElement).value = "300";
    expect(applyEligibilityReport(report)).toBe(0);
    doc.getElementById("JOB_DEPTID$0")!.remove();
    expect(applyEligibilityReport(report)).toBe(0);
  });
  it("keeps spreadsheet preview read-only", () => {
    frame(); const click = vi.fn();
    const button = document.createElement("button"); button.id = "ICAddRow"; button.onclick = click; document.body.append(button);
    const parsed = prepareSheetBuffer("JOB.DEPTID\n200\n300");
    expect(parsed.rows).toHaveLength(2); expect(click).not.toHaveBeenCalled();
    expect(matchBufferToPage(parsed.rows).unmatched).toBe(1);
  });
  it("leaves duplicate labels on different records unmatched", () => {
    document.body.innerHTML = '<label for="JOB_DEPTID">Department</label><input id="JOB_DEPTID"><label for="OTHER_DEPTID">Department</label><input id="OTHER_DEPTID">';
    const prepared = prepareSheetBuffer("Department\n200");
    expect(matchBufferToPage(prepared.rows).willWrite).toBe(0);
    expect(matchBufferToPage(prepared.rows).unmatched).toBe(1);
  });
});

describe("review regressions: imports and modal keyboard", () => {
  it.each([{}, { favorites: null }, { features: { traceOption: "maybe" } }, { environments: [{ label: "DEV", active: "Yes", trcProfRunning: "No", creds: {} }] }, { urlSites: { bad: null } }, { fieldEntryProfiles: [null] }, { schemaVersion: 999 }])("rejects malformed backup %j", (data) => {
    expect(isSettingsBackup(data)).toBe(false);
  });
  it("round-trips current backups and preserves other feature flags on partial restore", () => {
    const s = createDefaultSettings();
    expect(isSettingsBackup(JSON.parse(JSON.stringify(s)))).toBe(true);
    const patch = { features: { traceOption: "Yes" } };
    expect(isSettingsBackup(patch)).toBe(true);
    if (isSettingsBackup(patch)) expect(mergeSettingsBackup(s, patch).features.pageInfoOption).toBe("Yes");
  });
  it("preserves multiline CSV and trailing blank spreadsheet cells", () => {
    const row = { Servlet: "psp" as const, Menu: "M", Component: "C", Market: "GBL", Parameters: "", Category: "", SubCategory: "", Description: "A", Notes: 'line 1\nline "2"' };
    expect(parseFavoritesCsv(favoritesToCsv([row]))).toEqual([row]);
    expect(parseSheetPaste('JOB.DESCR,JOB.DEPTID\n"line 1\nline 2",').rows.map((r) => r.value)).toEqual(["line 1\nline 2", ""]);
    expect(parseSheetPaste("JOB.DESCR\tJOB.DEPTID\nname\t").rows.map((r) => r.value)).toEqual(["name", ""]);
    expect(parseSheetPaste('JOB.DESCR\n"unfinished').error).toBeTruthy();
    expect(parseSheetPaste("JOB.DEPTID,JOB.DESCR\n,\n200,Second").rows[2].occurrence).toBe("1");
  });
  it("returns focus to the corresponding toolbar button after a settings-driven rebuild", () => {
    document.body.innerHTML = '<div id="mpu-bar"><button id="mpu-pageinfo">Page Info</button></div><div id="mpu-dialog"><div role="dialog"><button>Close</button></div></div>';
    const opener = document.getElementById("mpu-pageinfo") as HTMLButtonElement;
    opener.focus();
    const close = bindModalDialog(document, document.getElementById("mpu-dialog")!, document.querySelector('[role="dialog"]') as HTMLElement);
    document.getElementById("mpu-bar")!.innerHTML = '<button id="mpu-pageinfo">Page Info</button>';
    close();
    expect(document.activeElement).toBe(document.getElementById("mpu-pageinfo"));
  });

  it("traps focus and closes on Escape after typing, restoring the opener", () => {
    document.body.innerHTML = '<button id="opener">Open</button><div id="mpu-dialog"><div role="dialog"><input><button>Close</button></div></div>';
    const opener = document.getElementById("opener")!; opener.focus();
    const backdrop = document.getElementById("mpu-dialog")!;
    const dialog = backdrop.firstElementChild as HTMLElement;
    bindModalDialog(document, backdrop, dialog);
    const input = dialog.querySelector("input")!, last = dialog.querySelector("button")!;
    last.focus(); last.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(input);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.getElementById("mpu-dialog")).toBeNull(); expect(document.activeElement).toBe(opener);
  });
});
