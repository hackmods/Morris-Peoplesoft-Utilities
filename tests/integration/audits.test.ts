import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

describe("automated audit scripts", () => {
  it("audit:store exits 0 when assets present", () => {
    const out = execFileSync(process.execPath, ["./node_modules/tsx/dist/cli.mjs", "scripts/audit-store.ts"], {
      encoding: "utf8",
      cwd: resolve("."),
    });
    expect(out).toContain("Store audit passed");
  });

  it("audit:compliance exits 0", () => {
    const out = execFileSync(process.execPath, ["./node_modules/tsx/dist/cli.mjs", "scripts/audit-compliance.ts"], {
      encoding: "utf8",
      cwd: resolve("."),
    });
    expect(out).toContain("Compliance audit passed");
  });

  it("listing copy credits hackmods", () => {
    const listing = readFileSync(resolve("store/listing.md"), "utf8");
    expect(listing.toLowerCase()).toContain("hackmods");
    expect(listing).toMatch(/Uffe Graakjaer|PS Utilities/);
  });
});
