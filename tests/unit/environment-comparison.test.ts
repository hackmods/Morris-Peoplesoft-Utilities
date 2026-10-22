import { beforeEach, describe, expect, it, vi } from "vitest";
import { compareEnvironmentSnapshots, formatEnvironmentComparison } from "@/features/environment-comparison";
import {
  ENVIRONMENT_COMPARISON_MESSAGE, ENVIRONMENT_COMPARISON_STORAGE_KEY, loadEnvironmentComparisons,
  normalizeEnvironmentComparisonStore, registerEnvironmentComparisonStorage,
  validateEnvironmentSnapshot, type EnvironmentComparisonReply, type EnvironmentSnapshot,
} from "@/storage/environment-comparisons";
import { createDefaultSettings } from "@/storage/schema";
import { getChromeStorageSnapshot, resetChromeStorage } from "../setup/chrome-mock";

const fingerprint = () => ({
  menu: "HR_MAIN", component: "JOB_DATA", market: "GBL", page: "JOB_DATA1", toolsRel: "8.62",
  uiMode: "fluid", tabLabels: ["Job Information"], structureLabels: ["group:Job Data"],
  fieldIds: ["JOB.EMPLID"], fieldIdsComplete: true, fieldIdsTotal: 1, structureLabelsComplete: true, pageMetadataComplete: true,
});
const snapshot = (id: string, extra: Partial<EnvironmentSnapshot> = {}): EnvironmentSnapshot => ({
  id, label: "Job data baseline", environment: "Test", origin: "https://ps.example.org:8443",
  site: "HRMS", targetOrigin: "https://ps.example.org:8443", targetSite: "HRMS", captureWarnings: [],
  capturedAt: Date.UTC(2026, 9, 20), extensionVersion: "1.0.34", applicationRelease: "",
  fingerprint: fingerprint(), ...extra,
});
const pageUrl = "https://ps.example.org:8443/psp/HRMS/EMPLOYEE/HRMS/c/HR_MAIN.JOB_DATA.GBL";
const sender: chrome.runtime.MessageSender = {
  id: "mpu-test", url: pageUrl, frameId: 0, tab: { id: 7, url: pageUrl } as chrome.tabs.Tab,
};
const optionsSender: chrome.runtime.MessageSender = {
  id: "mpu-test", url: "chrome-extension://mpu-test/options.html#environment-comparison",
};
let request: (message: unknown, from?: chrome.runtime.MessageSender) => Promise<EnvironmentComparisonReply>;
let getTab: ReturnType<typeof vi.fn>;

function settingsForCapture() {
  const settings = createDefaultSettings();
  settings.features.pageInfoOption = "Yes";
  settings.environments = [{ label: "Test", active: "Yes", trcProfRunning: "No" }];
  settings.urlSites = { "https://ps.example.org:8443": { HRMS: { envId: 0 } } };
  return settings;
}

beforeEach(() => {
  resetChromeStorage();
  registerEnvironmentComparisonStorage();
  const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)![0];
  request = (message, from = optionsSender) => new Promise((resolve) => { listener(message, from, resolve); });
  vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: unknown) => request(message));
  getTab = vi.fn(async () => ({ id: 7, url: pageUrl }));
  (chrome.tabs as unknown as { get: typeof getTab }).get = getTab;
});

describe("environment comparison model", () => {
  it("strictly validates bounded snapshots and rejects values outside the fingerprint schema", () => {
    expect(validateEnvironmentSnapshot(snapshot("snap-1"))).toEqual(snapshot("snap-1"));
    for (const invalid of [
      { ...snapshot("snap-1"), query: "session=secret" },
      { ...snapshot("snap-1"), origin: "https://user:pass@ps.example.org:8443" },
      { ...snapshot("snap-1"), origin: "https://ps.example.org:8443/path" },
      { ...snapshot("snap-1"), targetOrigin: "javascript:alert(1)" },
      { ...snapshot("snap-1"), captureWarnings: Array.from({ length: 11 }, () => "warning") },
      { ...snapshot("snap-1"), fingerprint: { ...fingerprint(), userId: "PS" } },
      { ...snapshot("snap-1"), fingerprint: { ...fingerprint(), fieldIds: Array.from({ length: 201 }, (_, i) => "F" + i) } },
      { ...snapshot("snap-1"), fingerprint: { ...fingerprint(), dbFields: ["value"] } },
      { ...snapshot("snap-1"), fingerprint: { ...fingerprint(), fieldIdsTotal: 0 } },
      { ...snapshot("snap-1"), fingerprint: { ...fingerprint(), fieldIdsTotal: 2, fieldIdsComplete: true } },
      { ...snapshot("snap-1"), capturedAt: 8.65e15 },
    ]) expect(validateEnvironmentSnapshot(invalid)).toBeNull();
  });

  it("reports only observed UI differences and always states evidence limits and scopes", () => {
    const left = snapshot("snap-left");
    const same = snapshot("snap-right", { label: "Production copy", environment: "Production" });
    const sameReport = compareEnvironmentSnapshots(left, same);
    expect(sameReport.headline).toBe("No observed UI differences");
    expect(sameReport.warnings.join(" ")).toContain("cannot establish PeopleCode, SQL, database");
    expect(sameReport.warnings.join(" ")).toContain("Application release metadata from page information is unknown");
    expect(sameReport.warnings.join(" ")).toContain("Environment labels differ");
    expect(sameReport.warnings.join(" ")).toContain("PUM image is not captured or verified");
    expect(() => compareEnvironmentSnapshots(left, left)).toThrow(/two different/);
    const knownRelease = snapshot("snap-known", { applicationRelease: "HCM 9.2" });
    expect(compareEnvironmentSnapshots(knownRelease, same).warnings.join(" ")).toContain("PUM image is not captured or verified");

    const changed = snapshot("snap-changed", {
      origin: "https://other.example.org", site: "HCM", targetOrigin: "", targetSite: "",
      fingerprint: { ...fingerprint(), component: "PERSONAL_DATA", page: "PERSONAL_DATA1", fieldIds: ["PERSONAL_DATA.EMPLID", "PERSONAL_DATA.NAME"] },
      captureWarnings: ["Target frame URL could not be identified."],
    });
    const report = compareEnvironmentSnapshots(left, changed);
    expect(report.headline).toBe("Observed UI differences");
    expect(report.warnings.join(" ")).toContain("port, or site differs");
    expect(report.warnings.join(" ")).toContain("Loaded target document origin or site differs");
    expect(report.warnings.join(" ")).toContain("Target frame URL could not be identified");
    const text = formatEnvironmentComparison(left, changed, "Test to HCM");
    expect(text).toContain("Portal scope: https://ps.example.org:8443 / HRMS");
    expect(text).toContain("Loaded target scope: unknown / unknown");
    expect(text).toContain("PeopleTools: 8.62");
    expect(text).toContain("Extension version: 1.0.34");
    expect(text).toContain("Application release (page metadata): unknown");
    expect(text).toContain("PUM image: unknown");
    expect(text).toContain("Observed UI differences");
    expect(text).toContain("does not establish PeopleCode, SQL, database");
  });

  it("normalizes malformed saved data on read without writing repairs", async () => {
    const raw = { revision: "bad", snapshots: [snapshot("snap-1"), { ...snapshot("bad"), fingerprint: { ...fingerprint(), token: "x" } }], comparisons: [] };
    resetChromeStorage({ [ENVIRONMENT_COMPARISON_STORAGE_KEY]: raw });
    expect(normalizeEnvironmentComparisonStore(raw)).toEqual({ revision: 0, snapshots: [snapshot("snap-1")], comparisons: [] });
    expect(await loadEnvironmentComparisons()).toEqual({ revision: 0, snapshots: [snapshot("snap-1")], comparisons: [] });
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
    expect(getChromeStorageSnapshot()[ENVIRONMENT_COMPARISON_STORAGE_KEY]).toBe(raw);
  });

  it("preserves legacy completeness flags and warns when a scan is incomplete", () => {
    const legacy = snapshot("legacy", {
      fingerprint: {
        menu: "HR_MAIN", component: "JOB_DATA", market: "GBL", page: "JOB_DATA1", toolsRel: "8.62",
        uiMode: "fluid", tabLabels: [], structureLabels: [], fieldIds: ["JOB.EMPLID"],
      },
    });
    const normalized = validateEnvironmentSnapshot(legacy)!;
    expect(normalized.fingerprint.fieldIdsComplete).toBeUndefined();
    const report = compareEnvironmentSnapshots(legacy, snapshot("current"));
    expect(report.warnings.join(" ")).toContain("legacy or incomplete");
  });
});

describe("environment comparison storage coordinator", () => {
  it("authorizes active page capture, rechecks the tab and current settings, then saves immutable comparisons", async () => {
    resetChromeStorage({ mpuSettings: settingsForCapture() });
    const first = await request({ type: ENVIRONMENT_COMPARISON_MESSAGE, action: "addSnapshot", baseRevision: 0, snapshot: snapshot("snap-left") }, sender);
    expect(first).toMatchObject({ ok: true, store: { revision: 1 } });
    const second = await request({ type: ENVIRONMENT_COMPARISON_MESSAGE, action: "addSnapshot", baseRevision: 1, snapshot: snapshot("snap-right", { capturedAt: Date.now() }) }, sender);
    expect(second).toMatchObject({ ok: true, store: { revision: 2, snapshots: [{ id: "snap-left" }, { id: "snap-right" }] } });
    const saved = await request({
      type: ENVIRONMENT_COMPARISON_MESSAGE, action: "saveComparison", baseRevision: 2,
      id: "comparison-1", label: "Review release", leftId: "snap-left", rightId: "snap-right",
    });
    expect(saved).toMatchObject({ ok: true, store: { revision: 3, comparisons: [{ id: "comparison-1" }] } });
    await request({ type: ENVIRONMENT_COMPARISON_MESSAGE, action: "deleteSnapshot", baseRevision: 3, id: "snap-left" });
    const latest = await loadEnvironmentComparisons();
    expect(latest.snapshots.map((item) => item.id)).toEqual(["snap-right"]);
    expect(latest.comparisons[0].left.id).toBe("snap-left");
    expect(latest.comparisons[0].left.fingerprint.fieldIds).toEqual(["JOB.EMPLID"]);

    getTab.mockResolvedValueOnce({ id: 7, url: pageUrl }).mockResolvedValueOnce({ id: 7, url: "https://ps.example.org:8443/psp/HRMS/EMPLOYEE/HRMS/c/HR_MAIN.OTHER.GBL" });
    const before = vi.mocked(chrome.storage.local.set).mock.calls.length;
    expect(await request({ type: ENVIRONMENT_COMPARISON_MESSAGE, action: "addSnapshot", baseRevision: 4, snapshot: snapshot("snap-stale") }, sender)).toMatchObject({ ok: false });
    expect(chrome.storage.local.set).toHaveBeenCalledTimes(before);
  });

  it("rejects inactive, disabled, foreign and framed capture requests", async () => {
    resetChromeStorage({ mpuSettings: settingsForCapture() });
    const wrongOrigin = { ...snapshot("snap-1"), origin: "https://evil.example.org" };
    expect(await request({ type: ENVIRONMENT_COMPARISON_MESSAGE, action: "addSnapshot", baseRevision: 0, snapshot: wrongOrigin }, sender)).toMatchObject({ ok: false });
    expect(await request({ type: ENVIRONMENT_COMPARISON_MESSAGE, action: "addSnapshot", baseRevision: 0, snapshot: snapshot("snap-1") }, { ...sender, frameId: 1 })).toMatchObject({ ok: false });
    expect(await request({ type: ENVIRONMENT_COMPARISON_MESSAGE, action: "addSnapshot", baseRevision: 0, snapshot: snapshot("snap-1") }, { ...sender, id: "other" })).toMatchObject({ ok: false });
    const inactive = settingsForCapture(); inactive.environments[0].active = "No";
    resetChromeStorage({ mpuSettings: inactive });
    expect(await request({ type: ENVIRONMENT_COMPARISON_MESSAGE, action: "addSnapshot", baseRevision: 0, snapshot: snapshot("snap-1") }, sender)).toMatchObject({ ok: false });
    const noPageInfo = settingsForCapture(); noPageInfo.features.pageInfoOption = "No";
    resetChromeStorage({ mpuSettings: noPageInfo });
    expect(await request({ type: ENVIRONMENT_COMPARISON_MESSAGE, action: "addSnapshot", baseRevision: 0, snapshot: snapshot("snap-1") }, sender)).toMatchObject({ ok: false });
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it("allows currentPageAccess-compatible unmapped origins while retaining explicit snapshot labels", async () => {
    const settings = settingsForCapture();
    settings.urlSites = {};
    resetChromeStorage({ mpuSettings: settings });
    const reply = await request({ type: ENVIRONMENT_COMPARISON_MESSAGE, action: "addSnapshot", baseRevision: 0, snapshot: snapshot("snap-unmapped") }, sender);
    expect(reply).toMatchObject({ ok: true, store: { snapshots: [{ id: "snap-unmapped", environment: "Test", origin: "https://ps.example.org:8443", site: "HRMS" }] } });
  });

  it("rechecks Page Info after loading the store and before writing a capture", async () => {
    const enabled = settingsForCapture();
    const disabled = settingsForCapture(); disabled.features.pageInfoOption = "No";
    resetChromeStorage({ mpuSettings: enabled });
    type TestStorageGet = (keys: string | string[] | null | Record<string, unknown>) => Promise<Record<string, unknown>>;
    const getMock = vi.mocked(chrome.storage.local.get) as unknown as {
      getMockImplementation: () => TestStorageGet | undefined;
      mockImplementation: (implementation: TestStorageGet) => void;
    };
    const originalGet = getMock.getMockImplementation()!;
    let changed = false;
    getMock.mockImplementation(async (keys) => {
      const result = await originalGet(keys);
      if (!changed && keys === ENVIRONMENT_COMPARISON_STORAGE_KEY) {
        changed = true;
        resetChromeStorage({ ...getChromeStorageSnapshot(), mpuSettings: disabled });
      }
      return result;
    });
    const reply = await request({ type: ENVIRONMENT_COMPARISON_MESSAGE, action: "addSnapshot", baseRevision: 0, snapshot: snapshot("snap-race") }, sender);
    getMock.mockImplementation(originalGet);
    expect(reply).toMatchObject({ ok: false, error: expect.stringContaining("no longer allowed") });
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it("rejects stale revisions, duplicate IDs and one-megabyte writes", async () => {
    resetChromeStorage({ [ENVIRONMENT_COMPARISON_STORAGE_KEY]: { revision: 1, snapshots: [snapshot("snap-left"), snapshot("snap-right")], comparisons: [] } });
    const stale = await request({ type: ENVIRONMENT_COMPARISON_MESSAGE, action: "saveComparison", baseRevision: 0, id: "cmp", label: "x", leftId: "snap-left", rightId: "snap-right" });
    expect(stale).toMatchObject({ ok: false, conflict: true });
    const added = await request({ type: ENVIRONMENT_COMPARISON_MESSAGE, action: "saveComparison", baseRevision: 1, id: "cmp", label: "x", leftId: "snap-left", rightId: "snap-right" });
    expect(added).toMatchObject({ ok: true });
    expect(await request({ type: ENVIRONMENT_COMPARISON_MESSAGE, action: "saveComparison", baseRevision: 2, id: "cmp", label: "x", leftId: "snap-left", rightId: "snap-right" })).toMatchObject({ ok: false, error: expect.stringContaining("already exists") });
    const giant = snapshot("large");
    giant.fingerprint.fieldIds = Array.from({ length: 200 }, (_, i) => "F".repeat(195) + i);
    giant.fingerprint.fieldIdsTotal = 200;
    const fullStore = {
      revision: 0,
      snapshots: Array.from({ length: 24 }, (_, i) => ({ ...giant, id: "large-" + i })),
      comparisons: [],
    };
    resetChromeStorage({ [ENVIRONMENT_COMPARISON_STORAGE_KEY]: fullStore });
    const writes = vi.mocked(chrome.storage.local.set).mock.calls.length;
    const tooLarge = await request({
      type: ENVIRONMENT_COMPARISON_MESSAGE, action: "saveComparison", baseRevision: 0, id: "too-big", label: "Too large", leftId: "large-0", rightId: "large-1",
    });
    expect(tooLarge).toMatchObject({ ok: false, error: expect.stringContaining("1 MB") });
    expect(chrome.storage.local.set).toHaveBeenCalledTimes(writes);
  });

  it("counts serialized storage size as UTF-8 bytes", async () => {
    const unicodeSnapshot = (id: string) => snapshot(id, {
      fingerprint: {
        ...fingerprint(), fieldIds: Array.from({ length: 200 }, (_, i) => "F" + i + "🙂".repeat(96)),
        fieldIdsTotal: 200,
      },
    });
    resetChromeStorage({
      mpuSettings: settingsForCapture(),
      [ENVIRONMENT_COMPARISON_STORAGE_KEY]: {
        revision: 0, snapshots: Array.from({ length: 12 }, (_, i) => unicodeSnapshot("unicode-" + i)), comparisons: [],
      },
    });
    const writes = vi.mocked(chrome.storage.local.set).mock.calls.length;
    const reply = await request({
      type: ENVIRONMENT_COMPARISON_MESSAGE, action: "addSnapshot", baseRevision: 0, snapshot: unicodeSnapshot("unicode-new"),
    }, sender);
    expect(reply).toMatchObject({ ok: false, error: expect.stringContaining("1 MB") });
    expect(chrome.storage.local.set).toHaveBeenCalledTimes(writes);
  });
});
