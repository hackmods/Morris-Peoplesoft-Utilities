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
  it("updates environment choices in place after environment edits without discarding notes", async () => {
    const labels: string[] = []; const root = document.createElement("div"); document.body.append(root);
    const cleanup = bindRunbooksUI(document, root, labels);
    await vi.waitFor(() => expect(root.querySelector("[data-runbook-focus='editor-title']")).not.toBeNull());
    const notes = root.querySelector<HTMLTextAreaElement>("[data-runbook-focus='editor-notes']")!;
    notes.value = "Keep this draft";
    labels.push("QA"); document.dispatchEvent(new Event("mpu-runbook-environments-changed"));
    const environment = root.querySelector<HTMLSelectElement>("[data-runbook-focus='editor-environment']")!;
    expect(environment.value).toBe("QA"); expect(notes.isConnected).toBe(true); expect(notes.value).toBe("Keep this draft");
    labels.splice(0, 1, "New label"); document.dispatchEvent(new Event("mpu-runbook-environments-changed"));
    expect(environment.value).toBe("QA"); expect([...environment.options].map(option => option.value)).toEqual(["New label", "QA"]);
    cleanup(); root.remove();
  });
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
    expect(draftInputs[1].value).toBe("Unsaved draft");
    root.querySelector<HTMLButtonElement>("[aria-label='Unsaved runbook draft'] button")!.click();
    await vi.waitFor(() => expect(root.querySelector("[aria-live='polite']")?.textContent).toContain("Unsaved edits were discarded"));
    expect(root.querySelector("section[aria-label='Runbook editor']")?.querySelectorAll<HTMLInputElement>("input")[1].value).toBe("");
    cleanup();
    root.remove();
  });

  it("keeps or explicitly discards edits when switching and starting another runbook", async () => {
    resetChromeStorage({ [RUNBOOK_STORAGE_KEY]: { revision: 1, runbooks: [runbook(), { ...runbook("rb-beta"), title: "Second guide" }] } });
    const root = document.createElement("div"); document.body.appendChild(root);
    const cleanup = bindRunbooksUI(document, root, ["Test"]);
    await vi.waitFor(() => expect(root.querySelectorAll("ul button")).toHaveLength(2));
    root.querySelector<HTMLButtonElement>("ul button")!.click();
    const title = root.querySelector<HTMLInputElement>("[data-runbook-focus='editor-title']")!;
    title.value = "Unsaved title"; title.focus();
    root.querySelectorAll<HTMLButtonElement>("ul button")[1].click();
    const decision = root.querySelector<HTMLElement>("[aria-label='Unsaved runbook draft']")!;
    expect(decision.hidden).toBe(false);
    expect(title.value).toBe("Unsaved title");
    expect((getChromeStorageSnapshot()[RUNBOOK_STORAGE_KEY] as { revision: number }).revision).toBe(1);
    [...decision.querySelectorAll("button")].find((button) => button.textContent === "Keep editing")!.click();
    expect(decision.hidden).toBe(true);
    expect(document.activeElement).toBe(title);
    expect(title.value).toBe("Unsaved title");
    root.querySelectorAll<HTMLButtonElement>("ul button")[1].click();
    decision.querySelector<HTMLButtonElement>("button")!.click();
    expect(root.querySelector<HTMLInputElement>("[data-runbook-focus='editor-title']")!.value).toBe("Second guide");
    root.querySelector<HTMLInputElement>("[data-runbook-focus='editor-title']")!.value = "Another unsaved title";
    [...root.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "New runbook")!.click();
    expect(decision.hidden).toBe(false);
    expect(root.querySelector<HTMLInputElement>("[data-runbook-focus='editor-title']")!.value).toBe("Another unsaved title");
    decision.querySelector<HTMLButtonElement>("button")!.click();
    expect(root.querySelector<HTMLInputElement>("[data-runbook-focus='editor-title']")!.value).toBe("");
    cleanup(); root.remove();
  });

  it("keeps edits on reload cancellation and discards them only after a successful reload", async () => {
    resetChromeStorage({ [RUNBOOK_STORAGE_KEY]: { revision: 1, runbooks: [runbook()] } });
    const root = document.createElement("div"); document.body.appendChild(root);
    const cleanup = bindRunbooksUI(document, root, ["Test"]);
    await vi.waitFor(() => expect(root.querySelector("ul button")).not.toBeNull());
    root.querySelector<HTMLButtonElement>("ul button")!.click();
    const notes = root.querySelector<HTMLTextAreaElement>("[data-runbook-focus='editor-notes']")!;
    notes.value = "Keep this local draft";
    await request({ type: RUNBOOK_MESSAGE, action: "save", baseRevision: 1, runbook: runbook("rb-new") });
    const reload = [...root.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Reload runbooks")!;
    reload.click();
    const decision = root.querySelector<HTMLElement>("[aria-label='Unsaved runbook draft']")!;
    expect(decision.hidden).toBe(false);
    [...decision.querySelectorAll("button")].find((button) => button.textContent === "Keep editing")!.click();
    expect(notes.value).toBe("Keep this local draft");
    reload.click();
    decision.querySelector<HTMLButtonElement>("button")!.click();
    await vi.waitFor(() => expect(root.querySelectorAll("ul button")).toHaveLength(2));
    expect(root.querySelector<HTMLTextAreaElement>("[data-runbook-focus='editor-notes']")!.value).toBe(runbook().notes);
    expect(document.activeElement).toBe(reload);
    cleanup(); root.remove();
  });

  it("keeps a dirty editor through import cancellation or a revision conflict", async () => {
    const root = document.createElement("div"); document.body.appendChild(root);
    const cleanup = bindRunbooksUI(document, root, ["Test"]);
    await vi.waitFor(() => expect(root.querySelector("[aria-live='polite']")?.textContent).toBe("Runbooks loaded."));
    const title = root.querySelector<HTMLInputElement>("[data-runbook-focus='editor-title']")!;
    title.value = "Draft before import";
    const importArea = root.querySelector<HTMLTextAreaElement>("textarea[aria-label='Runbook JSON to import']")!;
    importArea.value = JSON.stringify(exportRunbooks([runbook("rb-import")]));
    [...root.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Preview import")!.click();
    root.querySelector<HTMLButtonElement>("[data-runbook-focus='import']")!.click();
    const decision = root.querySelector<HTMLElement>("[aria-label='Unsaved runbook draft']")!;
    expect(decision.hidden).toBe(false);
    expect(getChromeStorageSnapshot()[RUNBOOK_STORAGE_KEY]).toBeUndefined();
    [...decision.querySelectorAll("button")].find((button) => button.textContent === "Keep editing")!.click();
    expect(title.value).toBe("Draft before import");
    await request({ type: RUNBOOK_MESSAGE, action: "save", baseRevision: 0, runbook: runbook("rb-concurrent") });
    root.querySelector<HTMLButtonElement>("[data-runbook-focus='import']")!.click();
    decision.querySelector<HTMLButtonElement>("button")!.click();
    await vi.waitFor(() => expect(root.querySelector("[aria-live='polite']")?.textContent).toMatch(/changed in another view/i));
    expect(title.value).toBe("Draft before import");
    expect(title.disabled).toBe(false);
    expect(root.querySelector<HTMLButtonElement>("[data-runbook-focus='import']")!.disabled).toBe(false);
    cleanup(); root.remove();
  });

  it("imports after explicit draft discard and clears the editor on success", async () => {
    const root = document.createElement("div"); document.body.appendChild(root);
    const cleanup = bindRunbooksUI(document, root, ["Test"]);
    await vi.waitFor(() => expect(root.querySelector("[aria-live='polite']")?.textContent).toBe("Runbooks loaded."));
    const title = root.querySelector<HTMLInputElement>("[data-runbook-focus='editor-title']")!;
    title.value = "Unsaved before successful import";
    root.querySelector<HTMLTextAreaElement>("textarea[aria-label='Runbook JSON to import']")!.value = JSON.stringify(exportRunbooks([runbook("rb-imported")]));
    [...root.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Preview import")!.click();
    root.querySelector<HTMLButtonElement>("[data-runbook-focus='import']")!.click();
    expect(title.value).toBe("Unsaved before successful import");
    root.querySelector<HTMLButtonElement>("[aria-label='Unsaved runbook draft'] button")!.click();
    await vi.waitFor(() => expect((getChromeStorageSnapshot()[RUNBOOK_STORAGE_KEY] as { runbooks: EnvironmentRunbook[] }).runbooks).toHaveLength(1));
    expect(root.querySelector<HTMLInputElement>("[data-runbook-focus='editor-title']")!.value).toBe("");
    expect(root.querySelector("[aria-live='polite']")?.textContent).toContain("1 runbook(s) imported");
    cleanup(); root.remove();
  });

  it("disables the editor during save and restores the draft when save fails", async () => {
    const root = document.createElement("div"); document.body.appendChild(root);
    const cleanup = bindRunbooksUI(document, root, ["Test"]);
    await vi.waitFor(() => expect(root.querySelector("[aria-live='polite']")?.textContent).toBe("Runbooks loaded."));
    const component = root.querySelector<HTMLInputElement>("[data-runbook-focus='editor-component']")!;
    const title = root.querySelector<HTMLInputElement>("[data-runbook-focus='editor-title']")!;
    component.value = "HR_JOB_DATA"; title.value = "Pending save draft";
    let answer!: (reply: RunbookReply) => void;
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(() => new Promise<RunbookReply>((resolve) => { answer = resolve; }));
    root.querySelector<HTMLButtonElement>("[data-runbook-focus='save']")!.click();
    expect(title.disabled).toBe(true);
    expect(component.disabled).toBe(true);
    expect(root.querySelector<HTMLButtonElement>("[data-runbook-focus='save']")!.disabled).toBe(true);
    expect([...root.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "New runbook")!.disabled).toBe(true);
    answer({ ok: false, error: "Runbooks changed in another view. Reload and review the latest data before saving.", conflict: true });
    await vi.waitFor(() => expect(title.disabled).toBe(false));
    expect(component.value).toBe("HR_JOB_DATA");
    expect(title.value).toBe("Pending save draft");
    expect(document.activeElement).toBe(root.querySelector("[data-runbook-focus='save']"));
    cleanup(); root.remove();
  });

  it("does not overwrite typing when the initial storage load resolves late", async () => {
    let finishLoad!: (value: Record<string, unknown>) => void;
    vi.mocked(chrome.storage.local.get).mockImplementationOnce(() => new Promise((resolve) => { finishLoad = resolve; }));
    const root = document.createElement("div"); document.body.appendChild(root);
    const cleanup = bindRunbooksUI(document, root, ["Test"]);
    [...root.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "New runbook")!.click();
    const title = root.querySelector<HTMLInputElement>("[data-runbook-focus='editor-title']")!;
    title.value = "Typed before load";
    finishLoad({ [RUNBOOK_STORAGE_KEY]: { revision: 1, runbooks: [runbook()] } });
    await vi.waitFor(() => expect(root.querySelectorAll("ul button")).toHaveLength(1));
    expect(title.isConnected).toBe(true);
    expect(title.value).toBe("Typed before load");
    cleanup(); root.remove();
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
