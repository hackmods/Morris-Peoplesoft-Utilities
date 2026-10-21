import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  exportRunbooks, findRunbookConflicts, isRunbookMutation, loadRunbookStore, normalizeRunbookStore,
  parseRunbookImport, registerRunbookStorage, RUNBOOK_MESSAGE, RUNBOOK_STORAGE_KEY,
  type EnvironmentRunbook, type RunbookReply,
} from "@/storage/runbooks";
import { bindRunbooksUI } from "@/features/runbooks-ui";
import { getChromeStorageSnapshot, resetChromeStorage } from "../setup/chrome-mock";

const runbook = (id = "rb-alpha"): EnvironmentRunbook => ({
  id, environment: "Test", component: "HR_JOB_DATA", title: "Job data triage",
  notes: "Check the component after confirming the environment.",
  links: [{ label: "Internal guide", url: "https://support.example.org/runbook" }], updatedAt: 123,
});
const trusted = { id: "mpu-test", url: "chrome-extension://mpu-test/options.html#runbooks" };
let request: (message: unknown, sender?: chrome.runtime.MessageSender) => Promise<RunbookReply>;

beforeEach(() => {
  resetChromeStorage();
  registerRunbookStorage();
  const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)![0];
  request = (message, sender = trusted) => new Promise((resolve) => { listener(message, sender, resolve); });
  vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: unknown) => request(message));
});

describe("environment runbooks", () => {
  it("saves through the editor, renders private links safely, and previews import collisions", async () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const cleanup = bindRunbooksUI(document, root, ["Test", "Production"]);
    await vi.waitFor(() => expect(root.querySelector("button")?.textContent).toBe("New runbook"));
    root.querySelector<HTMLButtonElement>("button")!.click();
    const section = root.querySelector("section")!;
    const fields = section.querySelectorAll<HTMLInputElement>("input");
    fields[0].value = "HR_JOB_DATA";
    fields[1].value = "Triage guide";
    const textareas = section.querySelectorAll<HTMLTextAreaElement>("textarea");
    textareas[0].value = "Review the component manually.";
    textareas[1].value = "Oracle guide | https://docs.example.org/help";
    [...section.querySelectorAll("button")].find((button) => button.textContent === "Save runbook")!.click();
    await vi.waitFor(() => expect(root.querySelector("a")?.textContent).toBe("Oracle guide"));
    expect((document.activeElement as HTMLElement).dataset.runbookFocus).toMatch(/^item:rb-/);
    root.querySelector<HTMLButtonElement>("ul button")!.click();
    expect((document.activeElement as HTMLElement).dataset.runbookFocus).toMatch(/^item:rb-/);
    const saved = getChromeStorageSnapshot()[RUNBOOK_STORAGE_KEY] as { runbooks: EnvironmentRunbook[] };
    expect(saved.runbooks[0]).toMatchObject({ environment: "Test", component: "HR_JOB_DATA", title: "Triage guide", notes: "Review the component manually." });
    const anchor = root.querySelector<HTMLAnchorElement>("a")!;
    expect(anchor.rel).toContain("noopener");
    expect(anchor.referrerPolicy).toBe("no-referrer");

    const importArea = root.querySelector<HTMLTextAreaElement>("textarea[aria-label='Runbook JSON to import']")!;
    importArea.value = JSON.stringify(exportRunbooks([saved.runbooks[0]]));
    [...root.querySelectorAll("button")].find((button) => button.textContent === "Preview import")!.click();
    expect(root.querySelector("[aria-live='polite']")?.textContent).toContain("IDs already exist");
    expect(root.querySelector("[data-runbook-focus='import']")).toBeNull();

    importArea.value = JSON.stringify({ ...exportRunbooks([runbook("rb-extra")]), unexpected: true });
    [...root.querySelectorAll("button")].find((button) => button.textContent === "Preview import")!.click();
    expect(root.querySelector("[aria-live='polite']")?.textContent).toMatch(/unsupported/i);
    expect(root.querySelector("[data-runbook-focus='import']")).toBeNull();

    const unknownEnvironment = { ...runbook("rb-extra"), environment: "Shared QA", title: "Additional triage", notes: "Review first" };
    importArea.value = JSON.stringify(exportRunbooks([unknownEnvironment]));
    [...root.querySelectorAll("button")].find((button) => button.textContent === "Preview import")!.click();
    expect(root.querySelector("[aria-label='Runbook import preview']")?.textContent).toContain("kept as labels only");
    expect(root.querySelector("[aria-label='Runbook import preview']")?.textContent).toContain("Additional triage");
    expect(root.querySelector("[aria-label='Runbook import preview']")?.textContent).toContain("Review first");
    importArea.value += " ";
    importArea.dispatchEvent(new Event("input", { bubbles: true }));
    expect(root.querySelector("[data-runbook-focus='import']")).toBeNull();
    expect(root.querySelector("[aria-label='Runbook import preview']")?.textContent).toBe("");
    importArea.value = JSON.stringify(exportRunbooks([unknownEnvironment]));
    [...root.querySelectorAll("button")].find((button) => button.textContent === "Preview import")!.click();
    root.querySelector<HTMLButtonElement>("[data-runbook-focus='import']")!.click();
    await vi.waitFor(() => expect((getChromeStorageSnapshot()[RUNBOOK_STORAGE_KEY] as { runbooks: EnvironmentRunbook[] }).runbooks).toHaveLength(2));
    expect((getChromeStorageSnapshot()[RUNBOOK_STORAGE_KEY] as { runbooks: EnvironmentRunbook[] }).runbooks[1].environment).toBe("Shared QA");

    root.querySelector<HTMLButtonElement>("button")!.click();
    const draftSection = root.querySelector("section[aria-label='Runbook editor']")!;
    const draftInputs = draftSection.querySelectorAll<HTMLInputElement>("input");
    draftInputs[0].value = "HR_JOB_DATA";
    draftInputs[1].value = "Unsaved draft";
    await request({ type: RUNBOOK_MESSAGE, action: "save", baseRevision: 2, runbook: runbook("rb-concurrent") });
    [...draftSection.querySelectorAll("button")].find((button) => button.textContent === "Save runbook")!.click();
    await vi.waitFor(() => expect(root.querySelector("[aria-live='polite']")?.textContent).toMatch(/changed in another view/i));
    expect(draftInputs[1].value).toBe("Unsaved draft");
    const reload = [...root.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("Reload runbooks"))!;
    expect(reload.textContent).toContain("discard unsaved edits");
    reload.click();
    await vi.waitFor(() => expect(root.querySelector("[aria-live='polite']")?.textContent).toContain("Unsaved edits were discarded"));
    expect(root.querySelector("section[aria-label='Runbook editor']")?.querySelectorAll<HTMLInputElement>("input")[1].value).toBe("");
    cleanup();
    root.remove();
  });

  it("strictly validates plain text, explicit association and approved HTTPS links", () => {
    const good = runbook();
    expect(parseRunbookImport(JSON.stringify(exportRunbooks([good])))).toEqual([good]);
    for (const invalid of [
      { ...good, id: "__proto__" },
      { ...good, environment: "" },
      { ...good, component: " ".repeat(161) },
      { ...good, notes: "x".repeat(4001) },
      { ...good, password: "secret" },
      { ...good, links: [{ label: "bad", url: "javascript:alert(1)" }] },
      { ...good, links: [{ label: "bad", url: "https://user:pass@example.org/" }] },
      { ...good, links: [{ label: "bad", url: "https://example.org/", script: "x" }] },
    ]) expect(() => parseRunbookImport(JSON.stringify({ format: "mpu-runbooks", version: 1, runbooks: [invalid] }))).toThrow();
  });

  it("rejects malformed, oversized, version-mismatched and duplicate imports", () => {
    expect(() => parseRunbookImport("{")).toThrow(/valid JSON/);
    expect(() => parseRunbookImport("x".repeat(256001))).toThrow(/too large/);
    expect(() => parseRunbookImport(JSON.stringify({ format: "mpu-runbooks", version: 2, runbooks: [] }))).toThrow(/Unsupported/);
    expect(() => parseRunbookImport(JSON.stringify({ format: "mpu-runbooks", version: 1, runbooks: [runbook(), runbook()] }))).toThrow(/duplicate/);
    expect(isRunbookMutation({ type: RUNBOOK_MESSAGE, action: "delete", baseRevision: 0, id: "ok", extra: true })).toBe(false);
    const tooLarge = Array.from({ length: 80 }, (_, index) => ({ ...runbook("rb-" + index), notes: "x".repeat(4000) }));
    expect(() => exportRunbooks(tooLarge)).toThrow(/256 KB/);
    const multibyte = Array.from({ length: 40 }, (_, index) => ({ ...runbook("rb-" + index), notes: "é".repeat(4000) }));
    expect(() => exportRunbooks(multibyte)).toThrow(/256 KB/);
    expect(() => parseRunbookImport(JSON.stringify({ format: "mpu-runbooks", version: 1, runbooks: tooLarge }))).toThrow(/too large|256 KB/);
    expect(() => parseRunbookImport(JSON.stringify({ format: "mpu-runbooks", version: 1, runbooks: [{ ...runbook(), updatedAt: 8.65e15 }] }))).toThrow(/invalid runbook/);
  });

  it("recovers malformed local data on read without writing repairs", async () => {
    const raw = { revision: "broken", runbooks: [runbook(), { ...runbook("bad"), notes: "x".repeat(5000) }, runbook()] };
    resetChromeStorage({ [RUNBOOK_STORAGE_KEY]: raw });
    expect(await loadRunbookStore()).toEqual({ revision: 0, runbooks: [runbook()] });
    expect(normalizeRunbookStore(null)).toEqual({ revision: 0, runbooks: [] });
    expect(getChromeStorageSnapshot()[RUNBOOK_STORAGE_KEY]).toBe(raw);
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it("serializes mutations, rejects stale revisions and refuses import collisions", async () => {
    const first = await request({ type: RUNBOOK_MESSAGE, action: "save", baseRevision: 0, runbook: runbook() });
    expect(first).toMatchObject({ ok: true, store: { revision: 1, runbooks: [runbook()] } });
    if (!first.ok) throw new Error("Expected first runbook mutation to succeed");
    expect(await request({ type: RUNBOOK_MESSAGE, action: "save", baseRevision: 0, runbook: runbook("rb-other") })).toMatchObject({ ok: false, conflict: true });
    expect(findRunbookConflicts([runbook()], first.store.runbooks)).toEqual(["rb-alpha"]);
    expect(await request({ type: RUNBOOK_MESSAGE, action: "import", baseRevision: 1, runbooks: [runbook()] })).toMatchObject({ ok: false, error: expect.stringContaining("conflicts") });
    const replies = await Promise.all([
      request({ type: RUNBOOK_MESSAGE, action: "save", baseRevision: 1, runbook: runbook("rb-beta") }),
      request({ type: RUNBOOK_MESSAGE, action: "save", baseRevision: 1, runbook: runbook("rb-gamma") }),
    ]);
    expect(replies.filter((reply) => reply.ok)).toHaveLength(1);
    expect(replies.filter((reply) => !reply.ok && reply.conflict)).toHaveLength(1);
    expect((getChromeStorageSnapshot()[RUNBOOK_STORAGE_KEY] as { revision: number }).revision).toBe(2);
  });

  it("snapshots validated nested message data before waiting in the mutation queue", async () => {
    const item = runbook("rb-snapshot");
    const message = { type: RUNBOOK_MESSAGE, action: "save", baseRevision: 0, runbook: item };
    const pending = request(message);
    item.notes = "Mutated after dispatch";
    const reply = await pending;
    expect(reply).toMatchObject({ ok: true });
    expect((getChromeStorageSnapshot()[RUNBOOK_STORAGE_KEY] as { runbooks: EnvironmentRunbook[] }).runbooks[0].notes).toBe("Check the component after confirming the environment.");
  });

  it("rejects foreign senders and malformed messages without storage writes", async () => {
    const message = { type: RUNBOOK_MESSAGE, action: "save", baseRevision: 0, runbook: runbook() };
    for (const sender of [
      { id: "other", url: trusted.url },
      { id: "mpu-test", url: "https://example.com/options.html" },
      { id: "mpu-test", url: "chrome-extension://mpu-test/popup.html" },
      { id: "mpu-test" },
    ]) expect(await request(message, sender)).toMatchObject({ ok: false });
    expect(await request({ ...message, runbook: { ...runbook(), metadata: {} } })).toMatchObject({ ok: false });
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });
});
