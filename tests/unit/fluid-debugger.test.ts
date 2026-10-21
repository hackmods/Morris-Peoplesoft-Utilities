import { afterEach, describe, expect, it } from "vitest";
import { collectFluidDebugSnapshot, formatFluidDebugSnapshot } from "../../src/features/fluid-debugger";

afterEach(() => { document.body.innerHTML = ""; });

describe("Fluid navigation diagnostic", () => {
  it("reports structure without collecting private values, page text or URLs or changing the DOM", () => {
    document.body.innerHTML = '<div id="PT_HEADER"></div><input id="private-user-id" value="SECRET"><a href="https://private.example/?token=TOKEN">PRIVATE TEXT</a>';
    const before = document.body.innerHTML;
    const snapshot = collectFluidDebugSnapshot(document);
    expect(snapshot.activeTarget).toBe("root");
    expect(snapshot.documents[0].uiModel).toBe("fluid");
    const output = formatFluidDebugSnapshot(snapshot);
    expect(output).not.toMatch(/SECRET|TOKEN|private-user-id|private.example|PRIVATE TEXT/);
    expect(document.body.innerHTML).toBe(before);
  });

  it("distinguishes shell and same-origin target documents across DOM realms", () => {
    document.body.innerHTML = '<div id="PT_HEADER"></div><iframe class="ps_target-iframe"></iframe>';
    const child = document.querySelector("iframe")!.contentDocument!;
    child.body.innerHTML = '<div class="ps_box-control"></div>';
    const snapshot = collectFluidDebugSnapshot(document);
    expect(snapshot.shell).toBe("root");
    expect(snapshot.activeTarget).toBe("root/1");
    expect(snapshot.confidence).toBe("structural");
    expect(snapshot.documents[1].uiModel).toBe("fluid");
  });

  it("keeps ambiguous targets unknown and excludes hidden targets", () => {
    document.body.innerHTML = '<iframe class="ps_target-iframe"></iframe><iframe class="ps_target-iframe"></iframe>';
    expect(collectFluidDebugSnapshot(document).activeTarget).toBeNull();
    document.querySelectorAll("iframe")[1].hidden = true;
    expect(collectFluidDebugSnapshot(document).activeTarget).toBe("root/1");
  });

  it("reports inaccessible frames without reading source URLs", () => {
    document.body.innerHTML = '<iframe class="ps_target-iframe"></iframe>';
    Object.defineProperty(document.querySelector("iframe"), "contentDocument", { get() { throw new Error("blocked"); } });
    const snapshot = collectFluidDebugSnapshot(document);
    expect(snapshot.documents[1].access).toBe("inaccessible");
    expect(snapshot.confidence).toBe("unknown");
  });

  it("prefers a modal document and reports multiple modal owners as unknown", () => {
    document.body.innerHTML = '<iframe class="ps_target-iframe"></iframe><div role="dialog"></div>';
    expect(collectFluidDebugSnapshot(document).activeTarget).toBe("root");
    document.querySelector("iframe")!.contentDocument!.body.innerHTML = '<dialog open></dialog>';
    expect(collectFluidDebugSnapshot(document).activeTarget).toBeNull();
  });

  it("bounds wide frame trees and explains incomplete ownership", () => {
    document.body.innerHTML = '<iframe></iframe>'.repeat(30);
    const snapshot = collectFluidDebugSnapshot(document);
    expect(snapshot.documents).toHaveLength(24);
    expect(snapshot.truncated).toBe(true);
    expect(snapshot.confidence).toBe("unknown");
    expect(formatFluidDebugSnapshot(snapshot)).toContain("Frame traversal limit reached");
  });

  it("excludes extension dialogs from page modal ownership", () => {
    document.body.innerHTML = '<iframe class="ps_target-iframe"></iframe><div id="mpu-dialog" role="dialog"></div><div id="mpu-bar"><div role="dialog"></div></div>';
    const snapshot = collectFluidDebugSnapshot(document);
    expect(snapshot.documents[0].visibleModals).toBe(0);
    expect(snapshot.activeTarget).toBe("root/1");
  });

  it("bounds nested frame trees", () => {
    let current = document;
    for (let i = 0; i < 6; i++) {
      current.body.innerHTML = '<iframe class="ps_target-iframe"></iframe>';
      current = current.querySelector("iframe")!.contentDocument!;
    }
    const snapshot = collectFluidDebugSnapshot(document);
    expect(snapshot.documents).toHaveLength(5);
    expect(snapshot.truncated).toBe(true);
  });
});
