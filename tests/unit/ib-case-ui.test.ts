import { beforeEach, describe, expect, it, vi } from "vitest";
import { bindIbInvestigationUI } from "@/features/ib-investigation-ui";

const node = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(`mpu-ib-${id}`) as T;
const report = () => node<HTMLTextAreaElement>("report");
function fill(id: string, value: string, event = "input") { const control = node<HTMLInputElement>(id); control.value = value; control.dispatchEvent(new Event(event)); }
const click = (id: string) => node(id).click();
const preview = async () => { click("preview"); await vi.waitFor(() => expect(node<HTMLButtonElement>("preview").disabled).toBe(false)); };
beforeEach(() => { document.body.innerHTML = "<section></section>"; bindIbInvestigationUI(document, document.querySelector("section")!); });
describe("IB evidence builder and case controls", () => {
  it("prepares exact JSON and XML draft records, compares only explicit choices and includes review notes", async () => {
    fill("entry-serviceOperation", "EXAMPLE"); fill("entry-environmentLabel", "TEST"); fill("entry-observedAt", "2026-10-21T10:00:00Z");
    fill("entry-format", "json", "change"); fill("entry-payload", '{"amount":9007199254740993,"empty":""}'); click("add-record");
    expect(node("draft-status").textContent).toContain("1 record(s) added");
    fill("entry-observedAt", "2026-10-21T10:00:01Z"); fill("entry-payload", '{"amount":9007199254740994,"empty":null}'); click("add-record");
    await preview(); expect(report().value).toContain("Source 1 is the explicitly prepared draft"); expect(report().value).not.toContain("EXPLICIT RECORD COMPARISON");
    expect(node<HTMLSelectElement>("compare-left").value).toBe(""); expect(node<HTMLSelectElement>("compare-right").options).toHaveLength(3);
    fill("compare-left", "1:1", "change"); await preview(); expect(report().value).toBe(""); expect(node("status").textContent).toContain("two distinct comparison selections");
    fill("compare-right", "1:2", "change"); fill("case-caseLabel", "Example support case"); fill("case-expected", "expected"); fill("case-actual", "observed");
    fill("check-errors", "needs-follow-up", "change"); fill("note-errors", "Source 1 record 2; obtain original error evidence");
    click("include-payload"); await preview(); expect(report().value).toContain("EXPLICIT RECORD COMPARISON"); expect(report().value).toContain("9007199254740993 -> 9007199254740994");
    expect(report().value).toContain("type differs"); expect(report().value).toContain("Example support case"); expect(report().value).toContain("errors | needs-follow-up");
    click("reviewed"); fill("note-errors", "edited"); expect(report().value).toBe(""); expect(node<HTMLInputElement>("reviewed").checked).toBe(false);
    click("remove-0"); expect(document.activeElement?.id).toBe("mpu-ib-remove-0"); expect(node<HTMLSelectElement>("compare-left").options).toHaveLength(1);
    fill("entry-format", "xml", "change"); fill("entry-payload", "<Root><Value>example</Value></Root>"); click("add-record"); await preview(); expect(report().value).toContain("decoded XML opening-tag L1");
    click("clear"); expect(node("draft-records").children).toHaveLength(0); expect(node<HTMLTextAreaElement>("entry-payload").value).toBe(""); expect(node<HTMLInputElement>("case-caseLabel").value).toBe(""); expect(node<HTMLSelectElement>("check-errors").value).toBe("unreviewed");
  });
  it("never discards entered payload silently and rejects invalid records without altering the draft", async () => {
    click("add-record"); expect(node("draft-status").textContent).toContain("Enter observed metadata");
    fill("entry-payload", '{"safe":1}'); click("add-record"); expect(node("draft-status").textContent).toContain("Select the payload format");
    fill("entry-format", "json", "change"); click("add-record");
    fill("entry-payload", '{"safe":"PRIVATE-CANARY","safe":2}'); click("add-record"); expect(node("draft-records").children).toHaveLength(1);
    expect(node("draft-status").textContent).toContain("No partial record"); expect(node("draft-status").textContent).not.toContain("PRIVATE-CANARY");
    fill("entry-format", "xml", "change"); fill("entry-payload", '<!DOCTYPE r SYSTEM "https://private.invalid"><r/>'); click("add-record"); expect(node("draft-records").children).toHaveLength(1);
    click("include-payload"); await preview(); expect(report().value).toContain('/payload/safe'); expect(report().value).not.toContain("PRIVATE-CANARY");
  });
  it("reads payload files only on the explicit button and discards reads after form edits or clear", async () => {
    const input = node<HTMLInputElement>("payload-file");
    click("load-payload"); expect(node("draft-status").textContent).toContain("Select one UTF-8 payload");
    const choose = (read: () => Promise<ArrayBuffer>, size = 5) => {
      const file = { size, name: "PRIVATE-FILENAME", arrayBuffer: vi.fn(read) }; Object.defineProperty(input, "files", { configurable: true, value: [file] }); input.dispatchEvent(new Event("change")); return file;
    };
    const bytes = new TextEncoder().encode("<r/>").buffer; let file = choose(async () => bytes); expect(file.arrayBuffer).not.toHaveBeenCalled();
    click("load-payload"); await vi.waitFor(() => expect(node<HTMLTextAreaElement>("entry-payload").value).toBe("<r/>"));
    let finish!: (value: ArrayBuffer) => void; choose(() => new Promise(resolve => { finish = resolve; })); click("load-payload"); fill("entry-serviceOperation", "CHANGED"); finish(bytes);
    await new Promise(resolve => setTimeout(resolve, 0)); expect(node("draft-status").textContent).toContain("Payload read cancelled");
    choose(() => new Promise(resolve => { finish = resolve; })); click("load-payload"); click("clear"); finish(bytes); await new Promise(resolve => setTimeout(resolve, 0)); expect(node<HTMLTextAreaElement>("entry-payload").value).toBe("");
    file = choose(async () => bytes, 256001); click("load-payload"); expect(file.arrayBuffer).not.toHaveBeenCalled();
    choose(async () => new Uint8Array([0xff]).buffer); click("load-payload"); await vi.waitFor(() => expect(node("draft-status").textContent).toContain("Cannot read this payload")); expect(node("draft-status").textContent).not.toContain("PRIVATE-FILENAME");
  });
  it("clears selection inventory after source edits and discards in-flight envelope reads after case changes", async () => {
    const files = node<HTMLInputElement>("files"); let finish!: (value: ArrayBuffer) => void;
    Object.defineProperty(files, "files", { configurable: true, value: [{ size: 100, arrayBuffer: () => new Promise(resolve => { finish = resolve; }) }] }); files.dispatchEvent(new Event("change"));
    click("preview"); fill("case-owner", "team"); finish(new TextEncoder().encode('{"format":"mpu-ib-evidence","version":1,"records":[{"stage":"operation"}]}').buffer);
    await new Promise(resolve => setTimeout(resolve, 0)); expect(report().value).toBe(""); expect(node<HTMLSelectElement>("compare-left").options).toHaveLength(1);
    window.dispatchEvent(new Event("pagehide")); expect(node<HTMLInputElement>("case-owner").value).toBe("");
  });
});
