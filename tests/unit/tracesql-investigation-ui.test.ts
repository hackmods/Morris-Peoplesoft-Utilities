import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { bindTraceSqlInvestigationUI } from "@/features/tracesql-investigation-ui";
import { TRACESQL_LIMITS } from "@/features/tracesql-investigation";

const sample = readFileSync(resolve(process.cwd(), "tests/fixtures/tracesql-investigation/sample.tracesql"), "utf8");
let root: HTMLElement;
const input = () => root.querySelector<HTMLInputElement>('[type="file"]')!;
const report = () => root.querySelector<HTMLTextAreaElement>("#mpu-tracesql-report")!;
const reviewed = () => root.querySelector<HTMLInputElement>("#mpu-tracesql-reviewed")!;
const button = (id: string) => root.querySelector<HTMLButtonElement>(`#mpu-tracesql-${id}`)!;
function select(text = sample, read?: () => Promise<ArrayBuffer>, size?: number) {
  const bytes = new TextEncoder().encode(text);
  const file = { name: "PRIVATE-FILENAME.tracesql", size: size ?? bytes.length, arrayBuffer: vi.fn(read ?? (async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))) };
  Object.defineProperty(input(), "files", { configurable: true, value: [file] });
  input().dispatchEvent(new Event("change"));
  return file;
}
beforeEach(() => {
  document.body.innerHTML = "<section></section>";
  root = document.querySelector("section")!;
  bindTraceSqlInvestigationUI(document, root);
});

describe("session-only Trace SQL UI", () => {
  it("requires explicit preview and review; never writes storage; clears on pagehide", async () => {
    button("preview").click();
    expect(root.textContent).toContain("Select exactly one");
    const file = select();
    expect(file.arrayBuffer).not.toHaveBeenCalled();
    const writes = vi.mocked(chrome.storage.local.set).mock.calls.length;
    button("preview").click();
    await vi.waitFor(() => expect(report().value).toContain("SQLID "));
    expect(report().value).toContain("PLAN TREE");
    expect(document.activeElement).toBe(report());
    expect(button("copy").disabled).toBe(true);
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => undefined) } });
    reviewed().checked = true;
    reviewed().dispatchEvent(new Event("change"));
    button("copy").click();
    await vi.waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(report().value));
    expect(vi.mocked(chrome.storage.local.set).mock.calls.length).toBe(writes);
    expect(root.textContent).not.toContain("PRIVATE-FILENAME");
    window.dispatchEvent(new Event("pagehide"));
    expect(report().value).toBe("");
  });

  it("rejects oversize before reading and hides decode errors", async () => {
    const file = select("", undefined, TRACESQL_LIMITS.maxBytes + 1);
    button("preview").click();
    expect(file.arrayBuffer).not.toHaveBeenCalled();
    select("", async () => new Uint8Array([0xff]).buffer);
    button("preview").click();
    await vi.waitFor(() => expect(root.textContent).toContain("Cannot prepare this investigation"));
    expect(report().value).toBe("");
    expect(reviewed().disabled).toBe(true);
  });

  it("exports only reviewed text as mpu-tracesql-investigation.txt", async () => {
    select();
    button("preview").click();
    await vi.waitFor(() => expect(report().value).not.toBe(""));
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:sample"), revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("mpu-tracesql-investigation.txt");
    });
    button("download").click();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    reviewed().checked = true;
    reviewed().dispatchEvent(new Event("change"));
    button("download").click();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:sample");
    click.mockRestore();
  });
});
