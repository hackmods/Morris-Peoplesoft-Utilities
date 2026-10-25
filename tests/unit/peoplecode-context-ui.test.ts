import { beforeEach, describe, expect, it, vi } from "vitest";
import { bindPeopleCodeContextUI } from "@/features/peoplecode-context-ui";
import { buildPeopleCodeStubs } from "@/features/peoplecode-aids";

let host: HTMLElement;
const eventSelect = () => host.querySelector<HTMLSelectElement>("#mpu-pcode-event")!;
const rowContext = () => host.querySelector<HTMLInputElement>("#mpu-pcode-context")!;
const verified = () => host.querySelector<HTMLInputElement>("#mpu-pcode-context-confirmed")!;
const preview = () => [...host.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Preview contextual example")!;
const copy = () => [...host.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Copy contextual example")!;
const code = () => host.querySelector<HTMLElement>("pre[aria-label='Contextual PeopleCode example']")!;
const status = () => host.querySelector<HTMLElement>("[aria-live='polite']")!;
const chooseContext = () => {
  eventSelect().value = "FieldChange"; eventSelect().dispatchEvent(new Event("change"));
  rowContext().value = "Level 1 job row selected in App Designer"; rowContext().dispatchEvent(new Event("input"));
  verified().checked = true; verified().dispatchEvent(new Event("change"));
};

beforeEach(() => {
  document.body.innerHTML = "<section></section>";
  host = document.querySelector("section")!;
});

describe("contextual PeopleCode example UI", () => {
  it("allows verified names for an ambiguous locked DOM ID and invalidates changed names", async () => {
    bindPeopleCodeContextUI(document, host, { lockedId: "SYNTHETIC_UNSPLIT_FIELD" }, async () => true, vi.fn());
    expect(host.textContent).toContain("Locked DOM field: SYNTHETIC_UNSPLIT_FIELD");
    chooseContext(); preview().click(); expect(code().textContent).toBe("");
    const record = host.querySelector<HTMLInputElement>("#mpu-pcode-record")!;
    const name = host.querySelector<HTMLInputElement>("#mpu-pcode-field")!;
    record.value = "JOB"; name.value = "EMPLID"; preview().click();
    await vi.waitFor(() => expect(code().textContent).toContain("Record.JOB"));
    record.value = "OTHER"; record.dispatchEvent(new Event("input")); expect(copy().disabled).toBe(true); expect(code().textContent).toBe("");
  });
  it("shows explicit no locked field guidance and offers no preview or copy controls", () => {
    const canContinue = vi.fn(async () => true);
    const copyText = vi.fn(async () => undefined);
    for (const input of [{}, { record: "JOB" }, { field: "EMPLID" }]) {
      host.replaceChildren();
      bindPeopleCodeContextUI(document, host, input, canContinue, copyText);
      expect(host.textContent).toContain("No field locked");
      expect(host.textContent).toContain("use Inspect to lock the intended field");
      expect(host.querySelector("button")).toBeNull();
      expect(host.querySelector("pre")).toBeNull();
    }
    expect(canContinue).not.toHaveBeenCalled();
    expect(copyText).not.toHaveBeenCalled();
  });

  it("requires an event, a row context, and explicit App Designer verification", () => {
    const canContinue = vi.fn(async () => true);
    const copyText = vi.fn(async () => undefined);
    bindPeopleCodeContextUI(document, host, { record: "JOB", field: "EMPLID" }, canContinue, copyText);
    expect(copy().disabled).toBe(true);
    preview().click();
    expect(status().textContent).toContain("choose an event");
    eventSelect().value = "RowInit"; eventSelect().dispatchEvent(new Event("change"));
    preview().click();
    expect(status().textContent).toContain("row/scroll context");
    rowContext().value = "Level 1 job row"; rowContext().dispatchEvent(new Event("input"));
    preview().click();
    expect(status().textContent).toContain("confirm you verified it in App Designer");
    expect(code().textContent).toBe("");
    expect(copy().disabled).toBe(true);
    expect(canContinue).not.toHaveBeenCalled();
    expect(copyText).not.toHaveBeenCalled();
  });

  it("previews only after explicit inputs and rechecks access before copy", async () => {
    const canContinue = vi.fn(async () => true);
    const copyText = vi.fn(async () => undefined);
    const storageWrites = vi.mocked(chrome.storage.local.set).mock.calls.length;
    const messages = vi.mocked(chrome.runtime.sendMessage).mock.calls.length;
    bindPeopleCodeContextUI(document, host, { record: "JOB", field: "EMPLID" }, canContinue, copyText);
    chooseContext();
    expect(copy().disabled).toBe(true);
    expect(code().textContent).toBe("");
    preview().click();
    await vi.waitFor(() => expect(copy().disabled).toBe(false));
    expect(code().textContent).toContain("JOB.EMPLID.FieldChange");
    expect(code().textContent).toContain("Level 1 job row selected in App Designer");
    expect(code().textContent).toContain("DOM occurrence does not identify a PeopleCode row");
    expect(document.activeElement).toBe(code());
    expect(status().textContent).toContain("no business rule or server code has been verified");
    copy().click();
    await vi.waitFor(() => expect(copyText).toHaveBeenCalledWith(code().textContent));
    expect(canContinue).toHaveBeenCalledTimes(2);
    expect(vi.mocked(chrome.storage.local.set).mock.calls.length).toBe(storageWrites);
    expect(vi.mocked(chrome.runtime.sendMessage).mock.calls.length).toBe(messages);
  });

  it("invalidates changed inputs and ignores stale preview and copy access results", async () => {
    const checks: Array<(allowed: boolean) => void> = [];
    const canContinue = vi.fn(() => new Promise<boolean>((resolve) => { checks.push(resolve); }));
    const copyText = vi.fn(async () => undefined);
    bindPeopleCodeContextUI(document, host, { record: "JOB", field: "EMPLID" }, canContinue, copyText);
    chooseContext();
    preview().click();
    expect(checks).toHaveLength(1);
    rowContext().value = "A different row"; rowContext().dispatchEvent(new Event("input"));
    checks[0](true);
    await Promise.resolve();
    expect(code().textContent).toBe("");
    expect(copy().disabled).toBe(true);
    preview().click(); checks[1](true);
    await vi.waitFor(() => expect(copy().disabled).toBe(false));
    copy().click(); expect(checks).toHaveLength(3);
    eventSelect().value = "RowInit"; eventSelect().dispatchEvent(new Event("change"));
    checks[2](true);
    await Promise.resolve();
    expect(copyText).not.toHaveBeenCalled();
    expect(code().textContent).toBe("");
    expect(copy().disabled).toBe(true);
    expect(status().textContent).toContain("Prepare a fresh preview");
    preview().click(); checks[3](true);
    await vi.waitFor(() => expect(copy().disabled).toBe(false));
    verified().checked = false; verified().dispatchEvent(new Event("change"));
    expect(code().textContent).toBe("");
    expect(copy().disabled).toBe(true);
  });

  it("refuses preview and copy when access is denied, and ignores results after removal", async () => {
    const canContinue = vi.fn(async () => false);
    const copyText = vi.fn(async () => undefined);
    bindPeopleCodeContextUI(document, host, { record: "JOB", field: "EMPLID" }, canContinue, copyText);
    chooseContext(); preview().click();
    await vi.waitFor(() => expect(status().textContent).toContain("no longer available"));
    expect(code().textContent).toBe(""); expect(copy().disabled).toBe(true);
    canContinue.mockResolvedValueOnce(true);
    preview().click(); await vi.waitFor(() => expect(copy().disabled).toBe(false));
    copy().click();
    await vi.waitFor(() => expect(copy().disabled).toBe(true));
    expect(code().textContent).toBe(""); expect(copyText).not.toHaveBeenCalled();
    let finish!: (allowed: boolean) => void;
    canContinue.mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve; }));
    preview().click(); host.remove(); finish(true);
    await Promise.resolve();
    expect(code().textContent).toBe(""); expect(copy().disabled).toBe(true);
    expect(copyText).not.toHaveBeenCalled();
  });

  it("rejects unsafe identifiers and control characters and neutralizes comment delimiters", () => {
    const base = { record: "JOB", field: "EMPLID", event: "FieldChange", rowContext: "Level 1 job row" };
    expect(buildPeopleCodeStubs({ ...base, record: "JOB); DeleteRow()" })).toEqual([]);
    expect(buildPeopleCodeStubs({ ...base, field: "EMPLID /*" })).toEqual([]);
    expect(buildPeopleCodeStubs({ ...base, event: "SavePostChange" })).toEqual([]);
    expect(buildPeopleCodeStubs({ ...base, rowContext: "Level 1\nDeleteRow()" })).toEqual([]);
    expect(buildPeopleCodeStubs({ ...base, rowContext: "x".repeat(501) })).toEqual([]);
    const stub = buildPeopleCodeStubs({ ...base, rowContext: "Level 1 */ DeleteRow(); /*", occurrence: "3" })[0].stub;
    expect(stub).toContain("Level 1 * / DeleteRow(); / *");
    expect(stub).not.toContain("Level 1 */ DeleteRow()");
    expect(stub).not.toContain("GetRow(3)");
  });
});
