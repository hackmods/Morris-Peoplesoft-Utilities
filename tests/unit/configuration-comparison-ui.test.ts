import { beforeEach, describe, expect, it, vi } from "vitest";
import { bindConfigurationComparisonUI } from "@/features/configuration-comparison-ui";
import { CONFIG_LIMITS } from "@/features/configuration-comparison";

let root: HTMLElement;
const controls = () => Array.from(root.querySelectorAll<HTMLInputElement>('input[type="file"]'));
const report = () => root.querySelector<HTMLTextAreaElement>("textarea")!;
const check = () => root.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
function button(text: string) { return Array.from(root.querySelectorAll("button")).find(node => node.textContent === text)!; }
function file(index: number, content: string, read?: () => Promise<ArrayBuffer>, size?: number) {
  const bytes = new TextEncoder().encode(content);
  const selected = { size: size ?? bytes.byteLength, name: "PRIVATE-FILENAME.txt", arrayBuffer: vi.fn(read ?? (async () => bytes.buffer)) };
  Object.defineProperty(controls()[index], "files", { configurable: true, value: [selected] });
  controls()[index].dispatchEvent(new Event("change")); return selected;
}
const preview = () => button("Preview configuration comparison").click();
beforeEach(() => {
  document.body.innerHTML = "<section></section>"; root = document.querySelector("section")!;
  bindConfigurationComparisonUI(document, root);
});
describe("session-only configuration comparison UI", () => {
  it("requires explicit selections and preview, then review before exporting; never persists files", async () => {
    preview(); expect(root.textContent).toContain("Select both sanitized files");
    const first = file(0, "[Example]\nMode=before\nPassword=SYNTHETIC-SECRET-A");
    file(1, "[Example]\nMode=after\nPassword=SYNTHETIC-SECRET-B");
    expect(first.arrayBuffer).not.toHaveBeenCalled();
    const writes = vi.mocked(chrome.storage.local.set).mock.calls.length;
    preview(); await vi.waitFor(() => expect(report().value).toContain("before"));
    expect(report().value).not.toMatch(/SYNTHETIC-SECRET|PRIVATE-FILENAME/);
    expect(document.activeElement).toBe(report());
    expect(button("Copy reviewed configuration report").disabled).toBe(true);
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => undefined) } });
    check().checked = true; check().dispatchEvent(new Event("change"));
    button("Copy reviewed configuration report").click();
    await vi.waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(report().value));
    expect(vi.mocked(chrome.storage.local.set).mock.calls.length).toBe(writes);
    const format = root.querySelector("select")!; format.value = "json"; format.dispatchEvent(new Event("change"));
    expect(report().value).toBe(""); expect(check().checked).toBe(false); expect(check().disabled).toBe(true);
  });
  it("checks file size before reading and handles UTF-8 or syntax failure without exposing content", async () => {
    const large = file(0, "", undefined, CONFIG_LIMITS.maxBytes + 1); file(1, "[E]\nk=v");
    preview(); expect(large.arrayBuffer).not.toHaveBeenCalled(); expect(root.textContent).toContain("Each file must be at most");
    file(0, "", async () => new Uint8Array([0xff]).buffer); preview();
    await vi.waitFor(() => expect(root.textContent).toContain("Cannot compare these files"));
    file(0, "PRIVATE-INVALID-CONTENT"); preview();
    await vi.waitFor(() => expect(button("Preview configuration comparison").disabled).toBe(false));
    expect(report().value).toBe(""); expect(root.textContent).not.toMatch(/PRIVATE-INVALID|PRIVATE-FILENAME/);
  });
  it("discards an in-flight read after clear or format changes", async () => {
    let finish!: (value: ArrayBuffer) => void;
    file(0, "", () => new Promise(resolve => { finish = resolve; })); file(1, "[E]\nk=new");
    preview(); button("Clear configuration files and report").click();
    finish(new TextEncoder().encode("[E]\nk=old").buffer);
    await vi.waitFor(() => expect(button("Preview configuration comparison").disabled).toBe(false));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(report().value).toBe(""); expect(check().disabled).toBe(true); expect(root.textContent).toContain("cleared");
  });
  it("downloads only the reviewed report and clears report on pagehide", async () => {
    file(0, "[E]\nk=old"); file(1, "[E]\nk=new"); preview();
    await vi.waitFor(() => expect(report().value).toContain("old"));
    check().checked = true; check().dispatchEvent(new Event("change"));
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:test"), revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { expect(this.download).toBe("mpu-configuration-comparison.txt"); });
    button("Download reviewed configuration report").click();
    expect(URL.createObjectURL).toHaveBeenCalledOnce(); expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test"); click.mockRestore();
    window.dispatchEvent(new Event("pagehide")); expect(report().value).toBe("");
  });
});
