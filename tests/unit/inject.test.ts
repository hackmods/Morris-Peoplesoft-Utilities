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

  it("clear-bcs sets isMenuCrefNav like classic PS Utilities", () => {
    const src = loadInject("clear-bcs.ts");
    expect(src).toContain("bcUpdater");
    expect(src).toContain("pthNav");
    expect(src).toContain("isMenuCrefNav");
    expect(src).toContain('setStoredData');
    expect(src).not.toContain("clearBC");
  });

  it("resize-frame calls ptIframe.resizeAll", () => {
    expect(loadInject("resize-frame.ts")).toContain("resizeAll");
  });
});
