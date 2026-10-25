import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runSearchOptions, stopSearchOptions } from "@/features/search";
import { createDefaultSettings } from "@/storage/schema";

let doc: Document;
const settings = () => {
  const value = createDefaultSettings();
  value.features.correctHistoryOption = "Yes";
  value.features.advSearchOption = "Yes";
  return value;
};
const controls = '<input type="radio" id="PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C"><button id="PTS_MORE_LESS_OPT" aria-expanded="false">Advanced Search</button>';
function clicks() {
  const corr = vi.fn(); const advanced = vi.fn();
  doc.getElementById("PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C")?.addEventListener("click", corr);
  doc.getElementById("PTS_MORE_LESS_OPT")?.addEventListener("click", advanced);
  return { corr, advanced };
}
beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '<iframe id="ptifrmtgtframe"></iframe>';
  doc = document.querySelector("iframe")!.contentDocument!;
  doc.body.className = "PSSRCHPAGE";
  doc.body.innerHTML = controls;
});
afterEach(() => { stopSearchOptions(); vi.useRealTimers(); });

describe("guarded search helpers", () => {
  it("runs owning-frame controls once across retries and repeated bootstrap", () => {
    const { corr, advanced } = clicks();
    runSearchOptions(settings());
    expect(corr).toHaveBeenCalledTimes(1);
    expect(advanced).not.toHaveBeenCalled();
    vi.runAllTimers();
    runSearchOptions(settings()); vi.runAllTimers();
    expect(corr).toHaveBeenCalledTimes(1);
    expect(advanced).toHaveBeenCalledTimes(1);
    expect(document.querySelector("script")).toBeNull();
  });
  it("does not repeat an action when AJAX replaces its control", () => {
    runSearchOptions(settings());
    doc.body.innerHTML = controls;
    const { corr, advanced } = clicks();
    vi.runAllTimers();
    expect(corr).not.toHaveBeenCalled();
    expect(advanced).toHaveBeenCalledTimes(1);
  });
  it("ignores a Fluid collection containing global search and misleading More controls", () => {
    doc.body.className = "";
    doc.body.innerHTML = '<div class="ps_box-search"></div><div id="PSSRCH_COLLECTION"></div>' + controls + '<button>More</button><button>Expand</button>';
    const click = vi.fn(); doc.body.addEventListener("click", click);
    runSearchOptions(settings()); vi.runAllTimers();
    expect(click).not.toHaveBeenCalled();
  });
  it("leaves selected, expanded, unknown, disabled and hidden controls alone", () => {
    (doc.querySelector("input") as HTMLInputElement).checked = true;
    const toggle = doc.querySelector("button")!;
    const click = vi.fn(); doc.body.addEventListener("click", click);
    for (const state of ["true", "unknown", ""]) {
      toggle.setAttribute("aria-expanded", state);
      runSearchOptions(settings()); vi.runAllTimers();
    }
    toggle.setAttribute("aria-expanded", "false"); toggle.disabled = true;
    runSearchOptions(settings()); vi.runAllTimers();
    toggle.disabled = false; toggle.hidden = true;
    runSearchOptions(settings()); vi.runAllTimers();
    expect(click).not.toHaveBeenCalled();
  });
  it("never clicks generic More/Expand or ambiguous exact controls on a search page", () => {
    doc.body.innerHTML = '<button>More</button><button>Expand</button><button>Advanced Search</button>' + controls + controls;
    const click = vi.fn(); doc.body.addEventListener("click", click);
    runSearchOptions(settings()); vi.runAllTimers();
    expect(click).not.toHaveBeenCalled();
  });
  it("limits actions to the explicit search container", () => {
    doc.body.className = "";
    doc.body.innerHTML = '<div id="ptsrchpage"><button id="PTS_MORE_LESS_OPT" aria-expanded="false">More options</button></div><button>Expand</button>';
    const click = vi.fn(); const outside = vi.fn();
    doc.querySelector("#ptsrchpage button")!.addEventListener("click", click);
    doc.body.lastElementChild!.addEventListener("click", outside);
    runSearchOptions(settings()); vi.runAllTimers();
    expect(click).toHaveBeenCalledTimes(1); expect(outside).not.toHaveBeenCalled();
  });
  it("cancels delayed work and respects disabled feature flags", () => {
    doc.body.innerHTML = "";
    runSearchOptions(settings()); stopSearchOptions();
    doc.body.innerHTML = controls;
    const { corr, advanced } = clicks(); vi.runAllTimers();
    const value = settings(); value.features.correctHistoryOption = "No"; value.features.advSearchOption = "No";
    runSearchOptions(value); vi.runAllTimers();
    expect(corr).not.toHaveBeenCalled(); expect(advanced).not.toHaveBeenCalled();
    value.features.advSearchOption = "Yes";
    runSearchOptions(value); vi.runAllTimers();
    expect(corr).not.toHaveBeenCalled(); expect(advanced).toHaveBeenCalledTimes(1);
  });
  it("picks up a late target search page without touching its loading shell", () => {
    doc.body.innerHTML = ""; doc.body.className = "";
    document.body.insertAdjacentHTML("beforeend", controls);
    const shell = vi.fn(); document.body.addEventListener("click", shell);
    runSearchOptions(settings());
    doc.body.className = "PSSRCHPAGE"; doc.body.innerHTML = controls;
    const { corr } = clicks(); vi.runAllTimers();
    expect(shell).not.toHaveBeenCalled(); expect(corr).toHaveBeenCalledTimes(1);
  });
});
