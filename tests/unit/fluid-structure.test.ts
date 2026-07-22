import { describe, expect, it } from "vitest";
import { collectFluidStructure, formatFluidStructurePlain } from "@/features/fluid-structure";

describe("fluid structure", () => {
  it("collectFluidStructure finds a ps_box-group in jsdom fixture", () => {
    document.body.innerHTML = `
      <div class="ps_box-group" id="grp1">
        <div class="ps_box-label">Personal Data</div>
        <div class="ps_box-control"><input id="JOB_EMPLID$0" /></div>
      </div>
    `;
    const nodes = collectFluidStructure(document);
    expect(nodes.some((n) => n.kind === "group" && n.label.includes("Personal Data"))).toBe(true);
    const plain = formatFluidStructurePlain(nodes);
    expect(plain).toContain("[group]");
  });
});
