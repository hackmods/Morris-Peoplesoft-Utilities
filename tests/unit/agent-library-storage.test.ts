import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AGENT_LIBRARY_MESSAGE, AGENT_LIBRARY_STORAGE_KEY, clearAgentRecents, dismissAgentOnboarding,
  loadAgentLibraryPreferences, recordAgentUse, setAgentFavorite,
} from "@/storage/agent-library";
import { AGENT_REFERENCES } from "@/generated/agent-catalog";
import { registerAgentLibraryStorage } from "@/background/agent-library-storage";
import { getChromeStorageSnapshot, resetChromeStorage } from "../setup/chrome-mock";

const ids = AGENT_REFERENCES.map((entry) => entry.id);
const trusted = { id: "mpu-test", url: "chrome-extension://mpu-test/options.html#agents" };
let request: (message: unknown, sender?: chrome.runtime.MessageSender) => Promise<unknown>;

beforeEach(() => {
  registerAgentLibraryStorage();
  const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)![0];
  request = (message, sender = trusted) => new Promise((resolve) => {
    listener(message, sender, resolve);
  });
  vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: unknown) => request(message));
});

describe("agent library preferences", () => {
  it("recovers malformed data and whitelists IDs without repairing on read", async () => {
    const raw = { favoriteIds: [ids[0], ids[0], "private", null], recentIds: [...ids, ids[0]], onboardingDismissed: "yes", brief: "private" };
    resetChromeStorage({ [AGENT_LIBRARY_STORAGE_KEY]: raw });
    expect(await loadAgentLibraryPreferences()).toEqual({ favoriteIds: [ids[0]], recentIds: ids.slice(0, 6), onboardingDismissed: false });
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
    expect(getChromeStorageSnapshot()[AGENT_LIBRARY_STORAGE_KEY]).toBe(raw);
    for (const value of [null, [], "broken", { favoriteIds: {}, recentIds: 1 }]) {
      resetChromeStorage({ [AGENT_LIBRARY_STORAGE_KEY]: value });
      expect(await loadAgentLibraryPreferences()).toEqual({ favoriteIds: [], recentIds: [], onboardingDismissed: false });
    }
  });

  it("serializes simultaneous views and preserves independent favorites, uses and settings", async () => {
    const settings = { favorite: "unrelated" };
    resetChromeStorage({ mpuSettings: settings });
    await Promise.all([setAgentFavorite(ids[0], true), recordAgentUse(ids[1]), setAgentFavorite(ids[2], true), dismissAgentOnboarding()]);
    expect(await loadAgentLibraryPreferences()).toEqual({ favoriteIds: [ids[0], ids[2]], recentIds: [ids[1]], onboardingDismissed: true });
    expect(getChromeStorageSnapshot().mpuSettings).toBe(settings);
    for (const [write] of vi.mocked(chrome.storage.local.set).mock.calls) expect(Object.keys(write)).toEqual([AGENT_LIBRARY_STORAGE_KEY]);
  });

  it("deduplicates favorites, bounds recent use to six and moves repeated use to the front", async () => {
    await setAgentFavorite(ids[0], true);
    await setAgentFavorite(ids[0], true);
    await Promise.all(ids.slice(0, 8).map(recordAgentUse));
    expect((await loadAgentLibraryPreferences()).recentIds).toEqual(ids.slice(2, 8).reverse());
    await recordAgentUse(ids[4]);
    expect((await loadAgentLibraryPreferences()).recentIds).toEqual([ids[4], ids[7], ids[6], ids[5], ids[3], ids[2]]);
    await setAgentFavorite(ids[0], false);
    await clearAgentRecents();
    expect(await loadAgentLibraryPreferences()).toEqual({ favoriteIds: [], recentIds: [], onboardingDismissed: false });
  });

  it("rejects invalid IDs and unrecognized payload properties before writing", async () => {
    await expect(setAgentFavorite("private", true)).rejects.toThrow("Invalid");
    await expect(recordAgentUse("private")).rejects.toThrow("Unknown");
    await expect(setAgentFavorite(ids[0], "yes" as unknown as boolean)).rejects.toThrow("Invalid");
    for (const payload of [
      { action: "favorite", id: ids[0], favorite: "true" },
      { action: "use", id: "private" },
      { action: "dismiss", brief: "private" },
      { action: "invented" },
    ]) expect(await request({ type: AGENT_LIBRARY_MESSAGE, ...payload })).toMatchObject({ ok: false });
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it("accepts only the extension's Options and side-panel document senders", async () => {
    const message = { type: AGENT_LIBRARY_MESSAGE, action: "dismiss" };
    for (const sender of [
      { id: "other", url: trusted.url },
      { id: "mpu-test", url: "https://example.com/options.html" },
      { id: "mpu-test", url: "chrome-extension://mpu-test/popup.html" },
      { id: "mpu-test", url: "invalid" },
      { id: "mpu-test" },
    ]) expect(await request(message, sender)).toMatchObject({ ok: false });
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
    expect(await request(message, { id: "mpu-test", url: "chrome-extension://mpu-test/sidepanel.html#agents" })).toMatchObject({ ok: true });
  });

  it("reports storage and transport failures and continues queued writes after failure", async () => {
    vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error("unavailable"));
    await expect(loadAgentLibraryPreferences()).rejects.toThrow("could not be loaded");
    vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error("quota"));
    const first = setAgentFavorite(ids[0], true);
    const second = recordAgentUse(ids[1]);
    await expect(first).rejects.toThrow("could not be saved");
    await expect(second).resolves.toMatchObject({ favoriteIds: [], recentIds: [ids[1]] });
    vi.mocked(chrome.runtime.sendMessage).mockRejectedValueOnce(new Error("disconnected"));
    await expect(dismissAgentOnboarding()).rejects.toThrow("could not be saved");
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce(undefined);
    await expect(clearAgentRecents()).rejects.toThrow("could not be saved");
  });
});
