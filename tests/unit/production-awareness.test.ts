// @vitest-environment-options {"url":"https://hr.example.edu/psc/ps/EMPLOYEE/HRMS/c/MENU.COMP.GBL"}
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeWriteAction, confirmProductionAction, environmentForPage } from "@/features/production-awareness";
import { createDefaultSettings, type MpuSettings } from "@/storage/schema";
import { parsePsUrl } from "@/adapters/ps-page";
import { isSettingsBackup, normalizeStoredSettings } from "@/storage/backup";
import { resetChromeStorage } from "../setup/chrome-mock";
import { toggleTrace } from "@/features/trace";

const parsed = parsePsUrl("https://hr.example.edu/psc/ps/EMPLOYEE/HRMS/c/MENU.COMP.GBL");
function seed(classification: "production" | "non-production" | undefined = "production"): MpuSettings {
  const s = createDefaultSettings();
  s.environments = [{ label: "PROD by name", active: "Yes", trcProfRunning: "No", color: "#ff0000", ...(classification ? { classification } : {}) }];
  s.urlSites = { [parsed.baseURL]: { ps: { envId: 0 } } };
  s.features.fieldEntryOption = "Yes";
  s.features.traceOption = "Yes";
  resetChromeStorage({ mpuSettings: s });
  return s;
}
beforeEach(() => { document.body.innerHTML = '<button id="invoker">Entry</button><div id="mpu-live"></div><div id="PT_WRAPPER"></div>'; });

describe("production action boundaries", () => {
  it("rejects stale page callbacks and removed mappings before trace network requests", async () => {
    const s = seed("non-production");
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect(await authorizeWriteAction(document, { ...parsed, href: parsed.href + "?old=1" }, "fieldEntryOption", "Apply")).toBeNull();
    await toggleTrace(s, { ...parsed, href: parsed.href + "?old=1" }, 0, false);
    resetChromeStorage({ mpuSettings: { ...s, urlSites: {} } });
    await toggleTrace(s, parsed, 0, false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("requires one confirmation each time and rechecks feature/host/environment/scope after approval", async () => {
    for (const mutate of [
      (s: MpuSettings) => { s.features.fieldEntryOption = "No"; },
      (s: MpuSettings) => { s.features.hostAllowlistEnabled = "Yes"; },
      (s: MpuSettings) => { s.environments[0].active = "No"; },
      (s: MpuSettings) => { s.environments[0].classification = "non-production"; },
      (s: MpuSettings) => { s.environments[0].label = "Changed"; },
      (s: MpuSettings) => { s.urlSites = {}; },
      (s: MpuSettings) => { s.featureUiScopes.fieldEntryOption = "classic"; },
    ]) {
      const s = seed();
      const confirm = vi.fn(async () => { mutate(s); resetChromeStorage({ mpuSettings: s }); return true; });
      expect(await authorizeWriteAction(document, parsed, "fieldEntryOption", "Apply", confirm)).toBeNull();
      expect(confirm).toHaveBeenCalledOnce();
    }
    seed();
    const confirm = vi.fn(async () => true);
    const approval = await authorizeWriteAction(document, parsed, "fieldEntryOption", "Apply", confirm);
    expect(await approval?.canContinue()).toBe(true);
    expect(await authorizeWriteAction(document, parsed, "fieldEntryOption", "Apply", confirm)).toBeTruthy();
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("never infers production from a label/color and invalidates a pending nonproduction action on reclassification", async () => {
    const s = seed(); delete s.environments[0].classification; resetChromeStorage({ mpuSettings: s });
    const confirm = vi.fn(async () => true);
    const approval = await authorizeWriteAction(document, parsed, "fieldEntryOption", "Apply", confirm);
    expect(approval).toBeTruthy();
    expect(confirm).not.toHaveBeenCalled();
    s.environments[0].classification = "production";
    resetChromeStorage({ mpuSettings: s });
    expect(await approval?.canContinue()).toBe(false);
    expect(environmentForPage(s, { ...parsed, siteNormalized: "other" }).environment).toBeUndefined();
    expect(await authorizeWriteAction(document, { ...parsed, kind: "login" }, "fieldEntryOption", "Apply", confirm)).toBeNull();
  });

  it("rejects malformed classification imports and keeps legacy positions without read repairs", () => {
    const s = seed(); delete s.environments[0].classification;
    expect(isSettingsBackup(s)).toBe(true);
    expect(normalizeStoredSettings(s).environments[0].classification).toBeUndefined();
    Object.assign(s.environments[0], { classification: "guess-production" });
    expect(isSettingsBackup(s)).toBe(false);
    expect(normalizeStoredSettings(s).environments).toMatchObject([{ active: "No" }]);
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it("cancels trace start before any request; production Stop remains available without confirmation", async () => {
    const s = seed();
    const fetchMock = vi.fn(async () => ({ ok: false, status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const pending = toggleTrace(s, parsed, 0, true);
    await vi.waitFor(() => expect(document.getElementById("mpu-production-cancel")).toBeTruthy());
    document.getElementById("mpu-production-cancel")!.click();
    await pending;
    expect(fetchMock).not.toHaveBeenCalled();
    await toggleTrace(s, parsed, 0, false);
    expect(document.getElementById("mpu-production-title")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rechecks a granted trace action before a POST", async () => {
    const s = seed("non-production");
    const approval = await authorizeWriteAction(document, parsed, "traceOption", "Start");
    s.environments[0].classification = "production";
    resetChromeStorage({ mpuSettings: s });
    expect(await approval?.canContinue()).toBe(false);
  });
});

describe("production confirmation lifecycle", () => {
  it("focuses Cancel, contains keyboard focus, escapes after typing and restores focus", async () => {
    document.getElementById("invoker")!.focus();
    const pending = confirmProductionAction(document, "<unsafe>", "Apply");
    expect(document.activeElement?.id).toBe("mpu-production-cancel");
    expect(document.getElementById("mpu-production-context")?.textContent).toContain("<unsafe>");
    expect(document.querySelector("unsafe")).toBeNull();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(await pending).toBe(false);
    expect(document.activeElement?.id).toBe("invoker");
    expect(chrome.storage.onChanged.removeListener).toHaveBeenCalled();
  });
  it("cleans up on external removal and accepts only the explicit Continue button", async () => {
    const pending = confirmProductionAction(document, "Production", "Apply");
    document.getElementById("mpu-dialog")!.remove();
    expect(await pending).toBe(false);
    const accepted = confirmProductionAction(document, "Production", "Apply");
    document.getElementById("mpu-production-confirm")!.click();
    expect(await accepted).toBe(true);
  });
});
