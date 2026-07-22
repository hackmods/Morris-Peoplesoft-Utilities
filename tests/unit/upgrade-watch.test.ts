import { describe, expect, it } from "vitest";
import {
  capturePageFingerprint,
  compareFingerprints,
  createWatchFromFingerprint,
  findWatchForParsed,
  upsertWatch,
  watchKey,
} from "@/features/upgrade-watch";
import type { PageFingerprint } from "@/storage/schema";
import type { ParsedPsUrl } from "@/adapters/ps-page";

function fp(partial: Partial<PageFingerprint>): PageFingerprint {
  return {
    menu: "MENU",
    component: "COMP",
    market: "GBL",
    page: "PAGE1",
    toolsRel: "8.60",
    uiMode: "classic",
    tabLabels: ["General", "Pages"],
    structureLabels: ["group:Header"],
    fieldIds: ["JOB_EMPLID", "JOB_EFFDT"],
    ...partial,
  };
}

describe("upgrade-watch", () => {
  it("reports clean when fingerprints match", () => {
    const baseline = fp({});
    const report = compareFingerprints(baseline, { ...baseline });
    expect(report.severity).toBe("clean");
    expect(report.findings).toHaveLength(0);
  });

  it("flags tools-only when only ToolsRel changes", () => {
    const baseline = fp({});
    const report = compareFingerprints(baseline, fp({ toolsRel: "8.61" }));
    expect(report.severity).toBe("tools-only");
    expect(report.findings.some((f) => f.code === "toolsRel")).toBe(true);
  });

  it("flags drifted when fields or tabs change", () => {
    const baseline = fp({});
    const report = compareFingerprints(
      baseline,
      fp({
        fieldIds: ["JOB_EMPLID", "JOB_NEWFIELD"],
        tabLabels: ["General", "Audit"],
      }),
    );
    expect(report.severity).toBe("drifted");
    expect(report.findings.some((f) => f.code === "fields")).toBe(true);
    expect(report.findings.some((f) => f.code === "tabs")).toBe(true);
  });

  it("upserts by menu.component.market key", () => {
    const a = createWatchFromFingerprint({
      fingerprint: fp({}),
      label: "First",
      now: 1,
    });
    const b = createWatchFromFingerprint({
      fingerprint: fp({ toolsRel: "8.61" }),
      label: "Second",
      now: 2,
    });
    const list = upsertWatch(upsertWatch([], a), b);
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe("Second");
    expect(watchKey("menu", "comp", "gbl")).toBe("MENU.COMP.GBL");
  });

  it("finds watch for parsed URL", () => {
    const watch = createWatchFromFingerprint({ fingerprint: fp({}), now: 1 });
    const parsed = {
      menu: "MENU",
      component: "COMP",
      market: "GBL",
    } as ParsedPsUrl;
    expect(findWatchForParsed([watch], parsed)?.id).toBe(watch.id);
  });

  it("captures fingerprint from DOM fixture", () => {
    document.body.innerHTML = `
      <div id="pt_pageinfo" menu="M" component="C" page="P"></div>
      <div id="pstabs"><a>One</a><a>Two</a></div>
      <div class="ps_box-group" aria-label="Main"></div>
      <input id="JOB_EMPLID$0" />
      <input id="JOB_EFFDT$0" />
    `;
    const parsed = {
      menu: "M",
      component: "C",
      market: "GBL",
      kind: "component",
    } as ParsedPsUrl;
    const snap = capturePageFingerprint(document, parsed);
    expect(snap.menu).toBe("M");
    expect(snap.component).toBe("C");
    expect(snap.tabLabels).toEqual(["One", "Two"]);
    expect(snap.fieldIds).toContain("JOB_EMPLID");
    expect(snap.fieldIds).toContain("JOB_EFFDT");
  });
});
