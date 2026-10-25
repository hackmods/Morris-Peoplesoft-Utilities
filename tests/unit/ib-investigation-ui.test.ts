import { beforeEach, describe, expect, it, vi } from "vitest";
import { bindIbInvestigationUI } from "@/features/ib-investigation-ui";
import { IB_LIMITS } from "@/features/ib-investigation";

let root: HTMLElement;
const input = () => root.querySelector<HTMLInputElement>('#mpu-ib-files')!;
const report = () => root.querySelector<HTMLTextAreaElement>("#mpu-ib-report")!;
const include = () => root.querySelector<HTMLInputElement>("#mpu-ib-include-payload")!;
const reviewed = () => root.querySelector<HTMLInputElement>("#mpu-ib-reviewed")!;
const button = (id: string) => root.querySelector<HTMLButtonElement>(`#mpu-ib-${id}`)!;
const text = JSON.stringify({ format: "mpu-ib-evidence", version: 1, records: [{ serviceOperation: "SYNTHETIC", payload: { reference: "BUSINESS-CONTEXT", token: "PRIVATE-CANARY" } }] });
function select(content = text, read?: () => Promise<ArrayBuffer>, size?: number, count = 1) {
  const bytes = new TextEncoder().encode(content);
  const file = { name: "PRIVATE-FILENAME.json", size: size ?? bytes.length, arrayBuffer: vi.fn(read ?? (async () => bytes.buffer)) };
  Object.defineProperty(input(), "files", { configurable: true, value: Array(count).fill(file) });
  input().dispatchEvent(new Event("change")); return file;
}
beforeEach(() => {
  document.body.innerHTML = "<section></section>"; root = document.querySelector("section")!;
  bindIbInvestigationUI(document, root);
});
describe("session-only IB UI", () => {
  it("reads only on explicit preview, omits payload by default and requires fresh review after payload changes", async () => {
    button("preview").click(); expect(root.textContent).toContain("Select between 1 and 4");
    const file = select(); expect(file.arrayBuffer).not.toHaveBeenCalled(); expect(include().checked).toBe(false);
    const writes = vi.mocked(chrome.storage.local.set).mock.calls.length;
    button("preview").click(); await vi.waitFor(() => expect(report().value).toContain("Source 1:L1"));
    expect(report().value).not.toMatch(/BUSINESS-CONTEXT|PRIVATE/); expect(document.activeElement).toBe(report());
    expect(button("download").disabled).toBe(true);
    reviewed().checked = true; reviewed().dispatchEvent(new Event("change")); expect(button("copy").disabled).toBe(false);
    include().checked = true; include().dispatchEvent(new Event("change")); expect(report().value).toBe(""); expect(reviewed().checked).toBe(false);
    button("preview").click(); await vi.waitFor(() => expect(report().value).toContain("BUSINESS-CONTEXT")); expect(report().value).not.toContain("PRIVATE-CANARY");
    expect(vi.mocked(chrome.storage.local.set).mock.calls.length).toBe(writes);
  });
  it("rejects counts/size before reading and conceals decoder/parser failures", async () => {
    let file = select("", undefined, 0, 5); button("preview").click(); expect(file.arrayBuffer).not.toHaveBeenCalled();
    file = select("", undefined, IB_LIMITS.maxBytes + 1); button("preview").click(); expect(file.arrayBuffer).not.toHaveBeenCalled();
    select("", async () => new Uint8Array([0xff]).buffer); button("preview").click();
    await vi.waitFor(() => expect(root.textContent).toContain("Cannot prepare this investigation"));
    expect(report().value).toBe(""); expect(reviewed().disabled).toBe(true);
    select('{"PRIVATE-CANARY":true}'); button("preview").click();
    await vi.waitFor(() => expect(button("preview").disabled).toBe(false)); expect(root.textContent).not.toMatch(/PRIVATE-CANARY|PRIVATE-FILENAME/);
  });
  it("discards stale reads after clear, option/file edits, pagehide and disconnection", async () => {
    for (const action of ["clear", "include", "file", "pagehide", "remove"]) {
      let finish!: (buffer: ArrayBuffer) => void;
      select("", () => new Promise(resolve => { finish = resolve; })); button("preview").click();
      if (action === "clear") button("clear").click();
      if (action === "include") include().dispatchEvent(new Event("change"));
      if (action === "file") input().dispatchEvent(new Event("change"));
      if (action === "pagehide") window.dispatchEvent(new Event("pagehide"));
      if (action === "remove") root.remove();
      finish(new TextEncoder().encode(text).buffer); await new Promise(resolve => setTimeout(resolve, 0));
      expect(report().value).toBe(""); expect(reviewed().disabled).toBe(true);
    }
  });
  it("exports only reviewed text, supports clipboard fallback and resets payload inclusion on exit", async () => {
    select(); button("preview").click(); await vi.waitFor(() => expect(report().value).not.toBe(""));
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => undefined) } });
    button("copy").click(); expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    reviewed().checked = true; reviewed().dispatchEvent(new Event("change")); button("copy").click();
    await vi.waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(report().value));
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error("unavailable")); button("copy").click();
    await vi.waitFor(() => expect(root.textContent).toContain("Copy unavailable")); expect(document.activeElement).toBe(report());
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:sample"), revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { expect(this.download).toBe("mpu-ib-investigation.txt"); });
    button("download").click(); expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:sample"); click.mockRestore();
    window.dispatchEvent(new Event("pagehide")); expect(report().value).toBe(""); expect(include().checked).toBe(false);
  });
});
