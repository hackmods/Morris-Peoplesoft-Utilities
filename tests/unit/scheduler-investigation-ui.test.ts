import { beforeEach, describe, expect, it, vi } from "vitest";
import { bindSchedulerInvestigationUI } from "@/features/scheduler-investigation-ui";
import { SCHEDULER_LIMITS } from "@/features/scheduler-investigation";

let root: HTMLElement;
const input = () => root.querySelector<HTMLInputElement>('[type="file"]')!;
const report = () => root.querySelector<HTMLTextAreaElement>("#mpu-scheduler-report")!;
const pack = () => root.querySelector<HTMLTextAreaElement>("#mpu-scheduler-pack")!;
const reviewed = () => root.querySelector<HTMLInputElement>('[type="checkbox"]')!;
const button = (id: string) => root.querySelector<HTMLButtonElement>(`#mpu-scheduler-${id}`)!;
function select(text = "2026-01-01T00:00:00Z Process Instance: 1; sample", read?: () => Promise<ArrayBuffer>, size?: number, count = 1) {
  const bytes = new TextEncoder().encode(text);
  const file = { name: "PRIVATE-FILENAME.log", size: size ?? bytes.length, arrayBuffer: vi.fn(read ?? (async () => bytes.buffer)) };
  Object.defineProperty(input(), "files", { configurable: true, value: Array(count).fill(file) });
  input().dispatchEvent(new Event("change")); return file;
}
beforeEach(() => {
  document.body.innerHTML = "<section></section>"; root = document.querySelector("section")!;
  bindSchedulerInvestigationUI(document, root);
});
describe("session-only Scheduler UI", () => {
  it("keeps manual findings session-only, validates citations and source focus, and invalidates every edit", async () => {
    select();
    const label = root.querySelector<HTMLInputElement>("#mpu-scheduler-case-caseLabel")!;
    const refs = root.querySelector<HTMLInputElement>("#mpu-scheduler-case-refs")!;
    const focus = root.querySelector<HTMLSelectElement>("#mpu-scheduler-focus")!;
    label.value = "Synthetic triage"; refs.value = "Source 2:L1";
    button("preview").click(); await vi.waitFor(() => expect(button("preview").disabled).toBe(false));
    expect(report().value).toBe(""); expect(reviewed().disabled).toBe(true);
    refs.value = "Source 1:L1"; button("preview").click();
    await vi.waitFor(() => expect(report().value).toContain('Case label: "Synthetic triage"'));
    expect(focus.options).toHaveLength(2); focus.value = "1:1"; focus.dispatchEvent(new Event("change"));
    expect(report().value).toBe(""); button("preview").click();
    await vi.waitFor(() => expect(report().value).toContain("Selected process focus: Source 1; Process Instance 1"));
    reviewed().checked = true; reviewed().dispatchEvent(new Event("change"));
    label.value = "Changed"; label.dispatchEvent(new Event("input")); expect(button("download").disabled).toBe(true);
    select("Process Instance: 2"); expect(label.value).toBe("Changed"); expect(focus.disabled).toBe(true);
    button("clear").click(); expect(label.value).toBe(""); expect(refs.value).toBe("");
  });
  it("requires explicit preview and fresh report review; clears after evidence changes and never writes storage", async () => {
    button("preview").click(); expect(root.textContent).toContain("Select between 1 and 4");
    const file = select(); expect(file.arrayBuffer).not.toHaveBeenCalled();
    const writes = vi.mocked(chrome.storage.local.set).mock.calls.length;
    button("preview").click(); await vi.waitFor(() => expect(report().value).toContain("Source 1:L1"));
    expect(document.activeElement).toBe(report()); expect(button("copy").disabled).toBe(true);
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => undefined) } });
    reviewed().checked = true; reviewed().dispatchEvent(new Event("change")); button("copy").click();
    await vi.waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(report().value));
    expect(vi.mocked(chrome.storage.local.set).mock.calls.length).toBe(writes);
    pack().value = "Process Instance: 2"; pack().dispatchEvent(new Event("input"));
    expect(report().value).toBe(""); expect(reviewed().disabled).toBe(true); expect(button("download").disabled).toBe(true);
    expect(root.textContent).not.toContain("PRIVATE-FILENAME");
  });
  it("rejects counts, size and ticket overflow before reading; hides decode/parser errors", async () => {
    let file = select("", undefined, 0, 5); button("preview").click(); expect(file.arrayBuffer).not.toHaveBeenCalled();
    file = select("", undefined, SCHEDULER_LIMITS.maxBytes + 1); button("preview").click(); expect(file.arrayBuffer).not.toHaveBeenCalled();
    file = select(); pack().value = "a".repeat(SCHEDULER_LIMITS.maxPackChars + 1); button("preview").click(); expect(file.arrayBuffer).not.toHaveBeenCalled();
    pack().value = ""; select("", async () => new Uint8Array([0xff]).buffer); button("preview").click();
    await vi.waitFor(() => expect(root.textContent).toContain("Cannot prepare this investigation"));
    expect(report().value).toBe(""); expect(reviewed().disabled).toBe(true);
    select("PRIVATE-CANARY\u0000"); button("preview").click();
    await vi.waitFor(() => expect(button("preview").disabled).toBe(false));
    expect(root.textContent).not.toMatch(/PRIVATE-CANARY|PRIVATE-FILENAME/);
  });
  it("discards successful and failed stale reads after clear, new evidence, pagehide or disconnection", async () => {
    for (const action of ["clear", "input", "pagehide", "remove"]) {
      let finish!: (buffer: ArrayBuffer) => void;
      select("", () => new Promise(resolve => { finish = resolve; })); button("preview").click();
      if (action === "clear") button("clear").click();
      if (action === "input") pack().dispatchEvent(new Event("input"));
      if (action === "pagehide") window.dispatchEvent(new Event("pagehide"));
      if (action === "remove") root.remove();
      finish(new TextEncoder().encode("stale").buffer); await new Promise(resolve => setTimeout(resolve, 0));
      expect(report().value).toBe(""); expect(reviewed().disabled).toBe(true);
    }
  });
  it("exports only reviewed text, supports clipboard fallback and clears on pagehide", async () => {
    select(); button("preview").click(); await vi.waitFor(() => expect(report().value).not.toBe(""));
    const write = vi.fn(async () => { throw new Error("unavailable"); }); Object.assign(navigator, { clipboard: { writeText: write } });
    button("copy").click(); button("download").click(); expect(write).not.toHaveBeenCalled();
    reviewed().checked = true; reviewed().dispatchEvent(new Event("change"));
    button("copy").click(); await vi.waitFor(() => expect(root.textContent).toContain("Copy unavailable")); expect(document.activeElement).toBe(report());
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:sample"), revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { expect(this.download).toBe("mpu-scheduler-investigation.txt"); });
    button("download").click(); expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:sample"); click.mockRestore();
    window.dispatchEvent(new Event("pagehide")); expect(report().value).toBe(""); expect(pack().value).toBe("");
  });
});
