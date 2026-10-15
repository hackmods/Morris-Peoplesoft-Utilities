import { describe, expect, it } from "vitest";
import {
  capturePageFingerprint,
  compareFingerprints,
  createWatchFromFingerprint,
  findWatchForParsed,
  listWatchesForParsed,
  formatDriftHandoffMarkdown,
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

  it("retains dated history rather than overwriting the previous baseline", () => {
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
    expect(list).toHaveLength(2);
    expect(list[0].label).toBe("Second");
    expect(watchKey("menu", "comp", "gbl")).toBe("MENU.COMP.GBL");
  });

  it("caps history per environment and requires an explicit cross-environment comparison", () => {
    let list: ReturnType<typeof createWatchFromFingerprint>[] = [];
    for (let index = 1; index <= 7; index++) list = upsertWatch(list, createWatchFromFingerprint({ fingerprint: fp({}), scope: "https://dev.example/ps", envLabel: "DEV", now: index }));
    const qa = createWatchFromFingerprint({ fingerprint: fp({ toolsRel: "8.62" }), scope: "https://qa.example/ps", envLabel: "QA", now: 8 });
    list = upsertWatch(list, qa);
    expect(list).toHaveLength(6);
    const parsed = { baseURL: "https://qa.example", siteNormalized: "ps", menu: "MENU", component: "COMP", market: "GBL" } as ParsedPsUrl;
    expect(findWatchForParsed(list, parsed)?.id).toBe(qa.id);
    expect(listWatchesForParsed(list, parsed)).toHaveLength(6);
    expect(findWatchForParsed(list, { ...parsed, baseURL: "https://prod.example" })).toBeUndefined();
    const report = compareFingerprints(qa.baseline, fp({ toolsRel: "8.63" }));
    expect(formatDriftHandoffMarkdown(qa, report, "TEST")).toContain("App Designer Compare Report / Change Assistant project: [attach verified evidence]");
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
