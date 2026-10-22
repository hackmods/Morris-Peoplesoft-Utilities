import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { bindTraceSqlInvestigationUI } from "@/features/tracesql-investigation-ui";
import { parseTraceSql, TRACESQL_LIMITS } from "@/features/tracesql-investigation";

const sample = readFileSync(resolve(process.cwd(), "tests/fixtures/tracesql-investigation/sample.tracesql"), "utf8");
let root: HTMLElement;
const input = () => root.querySelector<HTMLInputElement>("#mpu-tracesql-files")!;
const paste = () => root.querySelector<HTMLTextAreaElement>("#mpu-tracesql-paste")!;
const report = () => root.querySelector<HTMLTextAreaElement>("#mpu-tracesql-report")!;
const reviewed = () => root.querySelector<HTMLInputElement>("#mpu-tracesql-reviewed")!;
const status = () => root.querySelector<HTMLElement>("#mpu-tracesql-status")!;
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
  it("starts with a next-action empty state and accepts paste without a file", async () => {
    expect(status().textContent).toMatch(/sanitized/);
    button("preview").click();
    expect(status().textContent).toMatch(/Select one or two sanitized|or paste/);
    paste().value = sample;
    paste().dispatchEvent(new Event("input"));
    button("preview").click();
    await vi.waitFor(() => expect(report().value).toContain("SQLID "));
    expect(status().textContent).toMatch(/review box/);
    expect(root.querySelector<HTMLElement>("#mpu-tracesql-grouping")?.hidden).toBe(false);
    expect(root.querySelector("#mpu-tracesql-from")?.textContent).toContain("PS_PERSONAL_DATA");
  });

  it("requires explicit preview and review; never writes storage; clears on pagehide", async () => {
    const file = select();
    expect(status().textContent).toContain("PRIVATE-FILENAME.tracesql");
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
    expect(status().textContent).toMatch(/Options → Agents → assist-tracesql-hotspots/);
    expect(root.querySelector('a[href="#agents"]')).toBeTruthy();
    expect(vi.mocked(chrome.storage.local.set).mock.calls.length).toBe(writes);
    window.dispatchEvent(new Event("pagehide"));
    expect(report().value).toBe("");
    expect(paste().value).toBe("");
  });

  it("rejects oversize and empty excerpts before or after read", async () => {
    const file = select("", undefined, TRACESQL_LIMITS.maxBytes + 1);
    button("preview").click();
    expect(file.arrayBuffer).not.toHaveBeenCalled();
    select("   ");
    button("preview").click();
    await vi.waitFor(() => expect(status().textContent).toMatch(/empty/i));
    expect(report().value).toBe("");
    select("", async () => new Uint8Array([0xff]).buffer);
    button("preview").click();
    await vi.waitFor(() => expect(status().textContent).toContain("Cannot prepare this investigation"));
    expect(report().value).toBe("");
    expect(reviewed().disabled).toBe(true);
  });

  it("compares two selected excerpts in the report", async () => {
    const first = new TextEncoder().encode(sample);
    const secondText = "COM Stmt=SELECT B.DEPTID FROM PS_JOB B\n Dur=1.000 EXE";
    const second = new TextEncoder().encode(secondText);
    const files = [
      { name: "a.tracesql", size: first.length, arrayBuffer: vi.fn(async () => first.buffer.slice(first.byteOffset, first.byteOffset + first.byteLength)) },
      { name: "b.tracesql", size: second.length, arrayBuffer: vi.fn(async () => second.buffer.slice(second.byteOffset, second.byteOffset + second.byteLength)) },
    ];
    Object.defineProperty(input(), "files", { configurable: true, value: files });
    input().dispatchEvent(new Event("change"));
    button("preview").click();
    await vi.waitFor(() => expect(report().value).toContain("COMPARE BY SQLID"));
    expect(report().value).toContain("COMPARE BY FROM");
    expect(root.querySelector("#mpu-tracesql-from")?.textContent).toContain("PS_PERSONAL_DATA");
  });

  it("filters totals to matching SQLIDs and preserves CR-only source line references", async () => {
    const text = "COM Stmt=SELECT A.DEPTID FROM PS_JOB A\r Dur=1.000 EXE\rCOM Stmt=SELECT A.EMPLID FROM PS_JOB A\r Dur=3.000 EXE";
    select(text);
    button("preview").click();
    await vi.waitFor(() => expect(report().value).toContain("SQLID "));
    const cells = () => Array.from(root.querySelectorAll("#mpu-tracesql-from tbody td"), (cell) => cell.textContent);
    expect(cells()).toEqual(["SELECT", "PS_JOB A", "2", "4.000"]);
    const filter = root.querySelector<HTMLInputElement>("#mpu-tracesql-sqlid")!;
    filter.value = parseTraceSql(text).statements[0].sqlId;
    filter.dispatchEvent(new Event("input"));
    expect(cells()).toEqual(["SELECT", "PS_JOB A", "1", "1.000"]);
    const target = root.querySelector<HTMLElement>("#mpu-tracesql-line-3")!;
    expect(target.textContent).toContain("SELECT A.EMPLID");
    target.scrollIntoView = vi.fn();
    root.querySelector<HTMLButtonElement>('#mpu-tracesql-plan button[data-line="3"]')!.click();
    expect(document.activeElement).toBe(target);
    expect(status().textContent).toContain("Source line 3");
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
