import { describe, expect, it, beforeEach } from "vitest";
import {
  buildFindReplaceBuffer,
  captureFieldValues,
  clearSessionBuffer,
  ensureGridRows,
  fieldEntryKey,
  getSessionBuffer,
  listPageFields,
  matchBufferToPage,
  parseRecordFieldHeader,
  parseSheetPaste,
  parseProfilesImportJson,
  prepareSheetBuffer,
  profilesToExportJson,
  resolveLabelRowsAgainstPage,
  setSessionBuffer,
  applyEligibilityReport,
} from "@/features/field-entry";
import { parseFindReplaceText } from "@/features/field-entry-ui";
import {
  createDefaultSettings,
  normalizeFieldEntryProfiles,
  normalizeFieldEntryRow,
} from "@/storage/schema";
import { loadSettings, saveSettings } from "@/storage/settings";
import { resetChromeStorage } from "../setup/chrome-mock";

function mountJobForm(): void {
  document.body.innerHTML = `
    <div id="mpu-bar"><span id="mpu-live"></span></div>
    <form id="form">
      <label class="PSEDITBOXLABEL" for="JOB_EMPLID">Empl ID</label>
      <input id="JOB_EMPLID" type="text" value="1001" />
      <label class="PSEDITBOXLABEL" for="JOB_DEPTID">Dept</label>
      <input id="JOB_DEPTID" type="text" value="100" maxlength="10" />
      <label class="PSEDITBOXLABEL" for="JOB_JOBCODE">Job Code</label>
      <input id="JOB_JOBCODE" type="text" value="ABC" />
      <input id="PSWDFLD_PASSWORD" type="password" value="secret" />
      <span id="JOB_NAME$0" class="PSEDITBOX_DISPONLY">Display Only</span>
      <input id="JOB_STATUS" type="text" value="A" disabled />
    </form>
  `;
}

describe("field entry parsers", () => {
  it("parses RECORD.FIELD headers", () => {
    expect(parseRecordFieldHeader("JOB.EMPLID")).toEqual({ record: "JOB", field: "EMPLID" });
    expect(parseRecordFieldHeader("Empl ID")).toBeNull();
  });

  it("parses TSV sheet paste", () => {
    const text = "JOB.EMPLID\tJOB.DEPTID\n2002\t200";
    const { rows, error, dataRowCount } = parseSheetPaste(text);
    expect(error).toBeUndefined();
    expect(dataRowCount).toBe(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ record: "JOB", field: "EMPLID", value: "2002" });
    expect(rows[0].occurrence).toBeUndefined();
    expect(rows[1]).toMatchObject({ record: "JOB", field: "DEPTID", value: "200" });
  });

  it("assigns $occ for multi-row sheet paste", () => {
    const text = "JOB.DEPTID\tJOB.JOBCODE\n100\tA\n200\tB";
    const { rows, dataRowCount } = parseSheetPaste(text);
    expect(dataRowCount).toBe(2);
    expect(rows.filter((r) => r.occurrence === "0")).toHaveLength(2);
    expect(rows.filter((r) => r.occurrence === "1")).toHaveLength(2);
    expect(rows.find((r) => r.field === "DEPTID" && r.occurrence === "1")?.value).toBe("200");
  });

  it("parses CSV with quoted cells", () => {
    const text = 'JOB.EMPLID,JOB.DEPTID\n"2,002",200';
    const { rows } = parseSheetPaste(text);
    expect(rows[0].value).toBe("2,002");
  });

  it("parses find/replace pairs", () => {
    expect(parseFindReplaceText("100 → 200\nOLD=NEW")).toEqual([
      { find: "100", replace: "200" },
      { find: "OLD", replace: "NEW" },
    ]);
  });

  it("round-trips profile export JSON", () => {
    const profiles = normalizeFieldEntryProfiles([
      {
        id: "p1",
        name: "Guest defaults",
        updatedAt: 1,
        rows: [{ record: "JOB", field: "DEPTID", value: "200" }],
      },
    ]);
    const json = profilesToExportJson(profiles);
    const parsed = parseProfilesImportJson(json);
    expect(parsed.error).toBeUndefined();
    expect(parsed.profiles).toHaveLength(1);
    expect(parsed.profiles[0].name).toBe("Guest defaults");
  });

  it("normalizes field entry rows", () => {
    expect(normalizeFieldEntryRow({ record: "JOB", field: "EMPLID", value: "1" })).toEqual({
      record: "JOB",
      field: "EMPLID",
      value: "1",
      occurrence: undefined,
      pageLabel: undefined,
    });
    expect(normalizeFieldEntryRow({ record: "", field: "X" })).toBeNull();
  });
});

describe("field entry capture / eligibility / apply", () => {
  beforeEach(() => {
    clearSessionBuffer();
    mountJobForm();
  });

  it("captures editable values and skips password / disabled", () => {
    const rows = captureFieldValues(document);
    const keys = rows.map(fieldEntryKey);
    expect(keys).toContain("JOB.EMPLID");
    expect(keys).toContain("JOB.DEPTID");
    expect(keys).toContain("JOB.JOBCODE");
    expect(keys.some((k) => /PASSWORD/i.test(k))).toBe(false);
    expect(keys).not.toContain("JOB.STATUS");
    expect(getSessionBuffer()).toHaveLength(rows.length);
  });

  it("classifies willWrite / unchanged / unmatched / skipped", () => {
    setSessionBuffer([
      { record: "JOB", field: "EMPLID", value: "1001" },
      { record: "JOB", field: "DEPTID", value: "200" },
      { record: "JOB", field: "STATUS", value: "I" },
      { record: "JOB", field: "MISSING", value: "x" },
      { record: "JOB", field: "DEPTID", value: "12345678901" }, // over maxlength when matched twice — use unique
    ]);
    // Replace last with a unique maxlength skip via dedicated row on DEPTID only once:
    setSessionBuffer([
      { record: "JOB", field: "EMPLID", value: "1001" },
      { record: "JOB", field: "DEPTID", value: "200" },
      { record: "JOB", field: "STATUS", value: "I" },
      { record: "JOB", field: "MISSING", value: "x" },
    ]);
    const report = matchBufferToPage(getSessionBuffer(), document);
    expect(report.unchanged).toBe(1); // EMPLID
    expect(report.willWrite).toBe(1); // DEPTID
    expect(report.skipped).toBe(1); // STATUS disabled
    expect(report.unmatched).toBe(1); // MISSING
  });

  it("skips values that exceed maxlength", () => {
    setSessionBuffer([{ record: "JOB", field: "DEPTID", value: "12345678901" }]);
    const report = matchBufferToPage(getSessionBuffer(), document);
    expect(report.skipped).toBe(1);
    expect(report.matches[0].reason).toMatch(/maxlength/i);
  });

  it("applies willWrite values", () => {
    setSessionBuffer([{ record: "JOB", field: "DEPTID", value: "200" }]);
    const report = matchBufferToPage(getSessionBuffer(), document);
    const n = applyEligibilityReport(report, document);
    expect(n).toBe(1);
    expect((document.getElementById("JOB_DEPTID") as HTMLInputElement).value).toBe("200");
  });

  it("builds find/replace buffer from current values", () => {
    const rows = buildFindReplaceBuffer([{ find: "100", replace: "200" }], document);
    expect(rows).toEqual([expect.objectContaining({ record: "JOB", field: "DEPTID", value: "200" })]);
  });

  it("resolves label headers against page labels", () => {
    const text = "Dept\n250";
    // Prefer previous-sibling labels when label[for] is unavailable in the test DOM
    const { rows } = parseSheetPaste(text);
    expect(rows[0].record).toBe("__LABEL__");
    const resolved = resolveLabelRowsAgainstPage(rows, document);
    expect(resolved).toEqual([
      expect.objectContaining({ record: "JOB", field: "DEPTID", value: "250" }),
    ]);
  });

  it("reads fields inside role=dialog modal hosts (Modify a Person style)", () => {
    document.body.innerHTML = `
      <input id="PERSONAL_DATA_EMPLID" value="1" />
      <input id="PERSONAL_DATA_FIRST_NAME" value="Pat" />
      <div role="dialog" id="pt_modals" class="ps_modal">
        <input id="ADDRESSES_ADDRESS1" value="1 Main" />
        <input id="ADDRESSES_CITY" value="Town" />
      </div>
    `;
    const keys = listPageFields(document).map((h) => fieldEntryKey(h.row));
    expect(keys).toContain("PERSONAL_DATA.EMPLID");
    expect(keys).toContain("PERSONAL_DATA.FIRST_NAME");
    expect(keys).toContain("ADDRESSES.ADDRESS1");
    expect(keys).toContain("ADDRESSES.CITY");
  });

  it("ensureGridRows clicks Add Row until enough occurrences exist", () => {
    document.body.innerHTML = `
      <table id="g"><tbody>
        <tr><td><input id="JOB_DEPTID$0" value="1" /><input id="JOB_JOBCODE$0" value="A" /></td></tr>
      </tbody></table>
      <a id="ICAddRow$0" href="#" data-mpu-fe-add-row>Add</a>
    `;
    document.getElementById("ICAddRow$0")!.addEventListener("click", (e) => {
      e.preventDefault();
      const tbody = document.querySelector("#g tbody")!;
      const n = tbody.querySelectorAll("tr").length;
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><input id="JOB_DEPTID$${n}" value="" /><input id="JOB_JOBCODE$${n}" value="" /></td>`;
      tbody.appendChild(tr);
    });
    const result = ensureGridRows(document, 3, "JOB");
    expect(result.ok).toBe(true);
    expect(result.clicked).toBe(2);
    expect(document.getElementById("JOB_DEPTID$2")).toBeTruthy();

    const prepared = prepareSheetBuffer("JOB.DEPTID\n10\n20\n30", document);
    expect(prepared.error).toBeUndefined();
    expect(prepared.rows.filter((r) => r.field === "DEPTID")).toHaveLength(3);
  });
});

describe("field entry settings persistence", () => {
  beforeEach(async () => {
    await resetChromeStorage();
  });

  it("defaults fieldEntryOption Off and empty profiles", async () => {
    const s = await loadSettings();
    expect(s.features.fieldEntryOption).toBe("No");
    expect(s.fieldEntryProfiles).toEqual([]);
  });

  it("persists named profiles", async () => {
    const s = createDefaultSettings();
    s.features.fieldEntryOption = "Yes";
    s.fieldEntryProfiles = [
      {
        id: "p1",
        name: "Guest",
        updatedAt: 1,
        rows: [{ record: "JOB", field: "DEPTID", value: "200" }],
      },
    ];
    await saveSettings(s);
    const loaded = await loadSettings();
    expect(loaded.features.fieldEntryOption).toBe("Yes");
    expect(loaded.fieldEntryProfiles).toHaveLength(1);
    expect(loaded.fieldEntryProfiles[0].name).toBe("Guest");
  });
});
