// @vitest-environment-options {"url":"https://hr.example.edu/psc/ps/EMPLOYEE/HRMS/c/MENU.COMP.GBL"}
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bindEnvironmentComparisonUI, showComparisonCaptureDialog } from "@/features/environment-comparison-ui";
import { parsePsUrl } from "@/adapters/ps-page";
import { createDefaultSettings } from "@/storage/schema";
import { ENVIRONMENT_COMPARISON_STORAGE_KEY, loadEnvironmentComparisons, registerEnvironmentComparisonStorage, type EnvironmentSnapshot } from "@/storage/environment-comparisons";
import { getChromeStorageSnapshot, resetChromeStorage } from "../setup/chrome-mock";

const parsed = parsePsUrl("https://hr.example.edu/psc/ps/EMPLOYEE/HRMS/c/MENU.COMP.GBL");
const snapshot = (id: string): EnvironmentSnapshot => ({
  id, label: id, environment: "DEV", origin: parsed.origin, site: "ps", targetOrigin: parsed.origin, targetSite: "ps",
  capturedAt: 1000, extensionVersion: "1.0.33", applicationRelease: "9.2", captureWarnings: [],
  fingerprint: { menu: "MENU", component: "COMP", market: "GBL", page: "PAGE", toolsRel: "8.62.08", uiMode: "fluid", tabLabels: [], structureLabels: [], fieldIds: ["JOB_EMPLID"], fieldIdsTotal: 1, fieldIdsComplete: true, structureLabelsComplete: true, pageMetadataComplete: true },
});
function click(root: ParentNode, text: string) { Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(b => b.textContent === text)!.click(); }
const change = (control: HTMLSelectElement | HTMLInputElement, value: string) => { control.value = value; control.dispatchEvent(new Event(control.localName === "select" ? "change" : "input", { bubbles: true })); };
function choose(root: HTMLElement, label = "Reviewed comparison") {
  const selects = root.querySelectorAll<HTMLSelectElement>("select"); change(selects[0], "left"); change(selects[1], "right");
  change(root.querySelector<HTMLInputElement>("input")!, label); click(root, "Preview selected comparison");
}
beforeEach(() => {
  const settings = createDefaultSettings(); settings.quietEnvPrompt = "Yes";
  resetChromeStorage({ mpuSettings: settings });
  document.body.innerHTML = '<button id="invoker">Page Info</button><div id="mpu-live"></div><div id="PT_HEADER"></div><!-- User=PRIVATE-USER; DBName=PRIVATE-DB; ToolsRel=8.62.08; AppsRel=9.2 --><div id="pt_pageinfo" data-menu="MENU" data-component="COMP" data-page="PAGE"></div><input id="JOB_EMPLID" value="PRIVATE-VALUE"><input type="hidden" id="ICSID" value="PRIVATE-TOKEN">';
  registerEnvironmentComparisonStorage();
  const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)![0];
  Object.assign(chrome.tabs, { get: vi.fn(async () => ({ id: 1, url: parsed.href })) });
  vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: unknown) => new Promise(resolve => {
    const action = message && typeof message === "object" ? (message as { action?: string }).action : undefined;
    const sender = action === "addSnapshot" ? { id: chrome.runtime.id, frameId: 0, url: parsed.href, tab: { id: 1, url: parsed.href } } : { id: chrome.runtime.id, url: chrome.runtime.getURL("options.html") };
    listener(message, sender as chrome.runtime.MessageSender, resolve);
  }));
});

describe("environment comparison workspace UI", () => {
  it("prepares a private metadata preview without writes; cancel and current access are respected", async () => {
    document.getElementById("invoker")!.focus();
    await showComparisonCaptureDialog(document, parsed);
    const preview = document.querySelector("pre")!.textContent!;
    for (const secret of ["PRIVATE-USER", "PRIVATE-DB", "PRIVATE-VALUE", "PRIVATE-TOKEN", "ICSID"]) expect(preview).not.toContain(secret);
    expect(await loadEnvironmentComparisons()).toMatchObject({ snapshots: [] });
    const name = document.querySelector<HTMLInputElement>('#mpu-dialog input')!; change(name, "Reviewed snapshot");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.activeElement?.id).toBe("invoker");
    expect(await loadEnvironmentComparisons()).toMatchObject({ snapshots: [] });
    await showComparisonCaptureDialog(document, parsed);
    const current = getChromeStorageSnapshot();
    const settings = createDefaultSettings(); settings.features.pageInfoOption = "No";
    resetChromeStorage({ ...current, mpuSettings: settings });
    click(document, "Save reviewed snapshot");
    await vi.waitFor(() => expect(document.querySelector('#mpu-dialog [aria-live]')?.textContent).toContain("Page or access changed"));
    expect(await loadEnvironmentComparisons()).toMatchObject({ snapshots: [] });
  });
  it("saves only the reviewed snapshot after explicit consent", async () => {
    const extensionUi = document.createElement("div"); extensionUi.id = "mpu-bar";
    extensionUi.innerHTML = '<select id="mpu-private-selection"><option>Extension UI</option></select>'; document.body.append(extensionUi);
    await showComparisonCaptureDialog(document, parsed);
    change(document.querySelector<HTMLInputElement>('#mpu-dialog input')!, "Reviewed capture");
    click(document, "Save reviewed snapshot");
    await vi.waitFor(async () => expect((await loadEnvironmentComparisons()).snapshots).toHaveLength(1));
    const saved = (await loadEnvironmentComparisons()).snapshots[0];
    expect(saved).toMatchObject({ label: "Reviewed capture", origin: parsed.origin, site: "ps", targetOrigin: parsed.origin });
    expect(saved.fingerprint.fieldIds).toEqual(["JOB_EMPLID"]);
    expect(document.getElementById("mpu-dialog")).toBeNull();
  });
  it("requires two selections and preview, retains immutable history after snapshot deletion, and exports explicitly", async () => {
    resetChromeStorage({ ...getChromeStorageSnapshot(), [ENVIRONMENT_COMPARISON_STORAGE_KEY]: { revision: 0, snapshots: [snapshot("left"), snapshot("right")], comparisons: [] } });
    const root = document.createElement("section"); document.body.append(root); bindEnvironmentComparisonUI(document, root);
    await vi.waitFor(() => expect(root.querySelectorAll("select option")).toHaveLength(6));
    expect(root.querySelector<HTMLTextAreaElement>("textarea")!.value).toBe("");
    click(root, "Preview selected comparison");
    expect(root.querySelector('[aria-live]')?.textContent).toContain("two distinct");
    choose(root);
    expect(root.querySelector<HTMLTextAreaElement>("textarea")!.value).toContain("cannot establish PeopleCode");
    click(root, "Save reviewed comparison");
    await vi.waitFor(async () => expect((await loadEnvironmentComparisons()).comparisons).toHaveLength(1));
    click(root, "Delete snapshot left");
    await vi.waitFor(async () => expect((await loadEnvironmentComparisons()).snapshots).toHaveLength(1));
    Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(b => b.textContent?.startsWith("Review Reviewed comparison"))!.click();
    expect(root.querySelector<HTMLTextAreaElement>("textarea")!.value).toContain("Left snapshot: left");
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => undefined) } });
    click(root, "Copy reviewed report"); await vi.waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledOnce());
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:test"), revokeObjectURL: vi.fn() });
    const anchor = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    click(root, "Download reviewed report"); expect(URL.createObjectURL).toHaveBeenCalledOnce(); expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test"); anchor.mockRestore();
  });
  it("preserves a stale comparison preview on revision conflict until explicit reload", async () => {
    resetChromeStorage({ ...getChromeStorageSnapshot(), [ENVIRONMENT_COMPARISON_STORAGE_KEY]: { revision: 0, snapshots: [snapshot("left"), snapshot("right")], comparisons: [] } });
    const roots = [document.createElement("section"), document.createElement("section")]; document.body.append(...roots);
    roots.forEach(root => bindEnvironmentComparisonUI(document, root));
    await vi.waitFor(() => roots.forEach(root => expect(root.querySelectorAll("select option")).toHaveLength(6)));
    roots.forEach(root => choose(root));
    click(roots[0], "Save reviewed comparison"); await vi.waitFor(async () => expect((await loadEnvironmentComparisons()).comparisons).toHaveLength(1));
    click(roots[1], "Save reviewed comparison"); await vi.waitFor(() => expect(roots[1].querySelector('[aria-live]')?.textContent).toContain("changed in another view"));
    expect(roots[1].querySelector<HTMLTextAreaElement>("textarea")!.value).toContain("Left snapshot: left");
    click(roots[1], "Reload comparison workspace (clears preview)"); await vi.waitFor(() => expect(roots[1].querySelector<HTMLTextAreaElement>("textarea")!.value).toBe(""));
  });
});
