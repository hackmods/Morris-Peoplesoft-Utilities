import { describe, expect, it, vi } from "vitest";
import { loadSettings, saveSettings, SettingsSaveError, updateSettings } from "@/storage/settings";
import { coordinateSettingsWrite } from "@/storage/coordinator";
import { createDefaultSettings } from "@/storage/schema";
import { removeEnvironmentAt } from "@/storage/env-map";
import { getChromeStorageSnapshot, resetChromeStorage } from "../setup/chrome-mock";

describe("serialized settings edits", () => {
  it("does not merge a new stale site mapping across an environment deletion", async () => {
    const seed = createDefaultSettings();
    seed.environments = [{ label: "DEV", active: "Yes", trcProfRunning: "No" }, { label: "QA", active: "Yes", trcProfRunning: "No" }];
    resetChromeStorage({ mpuSettings: seed });
    const deletionBase = await loadSettings();
    const mapping = await loadSettings();
    mapping.urlSites = { "https://qa.example": { ps: { envId: 1 } } };
    await saveSettings(mapping);
    await expect(saveSettings(removeEnvironmentAt(deletionBase, 0), deletionBase)).rejects.toThrow("Settings changed");
    await updateSettings((settings) => removeEnvironmentAt(settings, 0));
    const saved = await loadSettings();
    expect(saved.environments[0].label).toBe("QA");
    expect(saved.urlSites["https://qa.example"].ps.envId).toBe(0);
  });
  it("merges independent stale drafts at nested property level", async () => {
    const first = await loadSettings();
    const second = await loadSettings();
    first.features.traceOption = "Yes";
    second.features.greetingOption = "No";
    await Promise.all([saveSettings(first), saveSettings(second)]);
    expect((await loadSettings()).features).toMatchObject({ traceOption: "Yes", greetingOption: "No" });
    // Saving the same draft again must not undo the edit it just merged.
    second.quietEnvPrompt = "Yes";
    await saveSettings(second);
    expect((await loadSettings()).features.traceOption).toBe("Yes");
  });

  it("rejects conflicting collection edits without redirecting a stale row index", async () => {
    const seed = createDefaultSettings();
    seed.environments = [{ label: "DEV", active: "Yes", trcProfRunning: "No" }];
    resetChromeStorage({ mpuSettings: seed });
    const first = await loadSettings();
    const second = await loadSettings();
    first.environments = [];
    second.environments[0].label = "QA";
    await saveSettings(first);
    await expect(saveSettings(second)).rejects.toBeInstanceOf(SettingsSaveError);
    expect((await loadSettings()).environments).toEqual([]);
    await updateSettings((settings) => ({ ...settings, quietEnvPrompt: "Yes" }));
    expect((await loadSettings()).quietEnvPrompt).toBe("Yes");
  });

  it("retries concurrent functional collection updates without losing either entry", async () => {
    await loadSettings();
    await Promise.all(["DEV", "QA"].map((label) => updateSettings((settings) => ({
      ...settings, environments: [...settings.environments, { label, active: "Yes", trcProfRunning: "No" }],
    }))));
    expect((await loadSettings()).environments.map((env) => env.label).sort()).toEqual(["DEV", "QA"]);
  });

  it("initializes once and refuses malformed edits before any write", async () => {
    const results = await Promise.all([loadSettings(), loadSettings()]);
    expect(results[0]).toEqual(results[1]);
    expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
    const before = getChromeStorageSnapshot();
    const reply = await coordinateSettingsWrite({ type: "mpu-write-settings", next: { credentials: "forbidden" } as never });
    expect(reply.ok).toBe(false);
    expect(getChromeStorageSnapshot()).toEqual(before);
  });

  it("does not fall back to an uncoordinated write when the worker is unavailable", async () => {
    const settings = await loadSettings();
    settings.quietEnvPrompt = "Yes";
    vi.mocked(chrome.runtime.sendMessage).mockRejectedValueOnce(new Error("Worker unavailable"));
    await expect(saveSettings(settings)).rejects.toThrow("Reload this view");
    expect((await loadSettings()).quietEnvPrompt).toBe("No");
  });
});
