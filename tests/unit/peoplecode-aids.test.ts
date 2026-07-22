import { describe, expect, it } from "vitest";
import {
  buildPeopleCodeStubs,
  formatObjectPackPlain,
  formatRecFieldCopyExtended,
} from "@/features/peoplecode-aids";
import { formatGetRowsetCopy } from "@/features/field-inspector";
import type { ParsedPsUrl } from "@/adapters/ps-page";

const parsed: ParsedPsUrl = {
  href: "https://hr.example.edu/psp/ps/EMPLOYEE/HRMS/c/MENU.COMP.GBL",
  baseURL: "https://hr.example.edu",
  origin: "https://hr.example.edu",
  servlet: "psp",
  site: "ps",
  siteNormalized: "ps",
  portal: "EMPLOYEE",
  node: "HRMS",
  kind: "component",
  menu: "MENU",
  component: "COMP",
  market: "GBL",
};

describe("peoplecode aids", () => {
  it("builds stubs with FieldChange and GetRowset", () => {
    const stubs = buildPeopleCodeStubs({
      record: "JOB",
      field: "EMPLID",
      menu: "MENU",
      component: "COMP",
      page: "PAGE1",
      occurrence: "2",
    });
    const ids = stubs.map((s) => s.id);
    expect(ids).toContain("fieldchange");
    expect(ids).toContain("getrowset");
    const fieldChange = stubs.find((s) => s.id === "fieldchange");
    expect(fieldChange?.stub).toContain("JOB.EMPLID.FieldChange");
    const getRowset = stubs.find((s) => s.id === "getrowset");
    expect(getRowset?.stub).toContain("GetLevel0()");
    expect(getRowset?.stub).toContain("GetRow(2)");
  });

  it("object pack includes Menu and Component", () => {
    const pack = formatObjectPackPlain({
      parsed,
      meta: { menu: "M", component: "C", page: "P", uiMode: "fluid", toolsRel: "8.60" },
      lockedField: "JOB.EMPLID",
    });
    expect(pack).toContain("Menu: M");
    expect(pack).toContain("Component: C");
    expect(pack).toContain("Locked field: JOB.EMPLID");
  });

  it("getrowset format includes GetLevel0 and GetRow", () => {
    const text = formatGetRowsetCopy({
      raw: "JOB_EMPLID$3",
      base: "JOB_EMPLID",
      record: "JOB",
      field: "EMPLID",
      occurrence: "3",
    });
    expect(text).toContain("GetLevel0()");
    expect(text).toContain("GetRow(3)");
    expect(text).toContain("GetRecord(Record.JOB)");
    expect(text).toContain("GetField(Field.EMPLID)");
    expect(formatRecFieldCopyExtended(
      { raw: "JOB_EMPLID$3", base: "JOB_EMPLID", record: "JOB", field: "EMPLID", occurrence: "3" },
      "getrowset",
    )).toBe(text);
  });
});
