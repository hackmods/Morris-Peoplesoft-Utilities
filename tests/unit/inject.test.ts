import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadInject(name: string): string {
  return readFileSync(resolve(`src/inject/${name}`), "utf8");
}

describe("page-context inject scripts", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("adv-search source targets PTS_MORE_LESS and clicks collapsed control", () => {
    expect(loadInject("adv-search.ts")).toContain("PTS_MORE_LESS");
    document.body.innerHTML = `<a id="PTS_MORE_LESS_OPT" aria-expanded="false"></a>`;
    const el = document.getElementById("PTS_MORE_LESS_OPT")!;
    let clicked = false;
    el.addEventListener("click", () => {
      clicked = true;
    });
    document.querySelector<HTMLElement>('#PTS_MORE_LESS_OPT[aria-expanded="false"]')?.click();
    expect(clicked).toBe(true);
  });

  it("corr-hist source targets access mode control", () => {
    expect(loadInject("corr-hist.ts")).toContain("PTS_ACCESS_MODE");
    document.body.innerHTML = `<button id="PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C"></button>`;
    const el = document.getElementById("PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C")!;
    let clicked = false;
    el.addEventListener("click", () => {
      clicked = true;
    });
    el.click();
    expect(clicked).toBe(true);
  });

  it("clear-bcs references breadcrumb helpers", () => {
    const src = loadInject("clear-bcs.ts");
    expect(src).toContain("bcUpdater");
    expect(src).toContain("pthNav");
  });
});
