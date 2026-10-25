import { describe, expect, it } from "vitest";
import { createManifest, FIREFOX_ID } from "../../scripts/extension-manifest";

describe("browser manifest parity", () => {
  const pkg = { version: "2.3.4", description: "Shared PeopleSoft productivity" };
  const chrome = createManifest("chrome", pkg);
  const firefox = createManifest("firefox", pkg);

  it("changes only browser platform declarations", () => {
    const shared = (manifest: object) => Object.fromEntries(Object.entries(manifest).filter(([key]) =>
      !["background", "side_panel", "sidebar_action", "minimum_chrome_version", "browser_specific_settings", "permissions"].includes(key)));
    expect(shared(chrome)).toEqual(shared(firefox));
    expect(firefox.version).toBe(pkg.version);
    expect(firefox.permissions).toEqual(chrome.permissions.filter((p) => p !== "sidePanel"));
  });

  it("keeps both builds on MV3 with their supported background and sidebar", () => {
    expect(chrome.manifest_version).toBe(3);
    expect(firefox.manifest_version).toBe(3);
    expect(chrome.background).toEqual({ service_worker: "background.js", type: "module" });
    expect(firefox.background).toEqual({ scripts: ["background.js"], type: "module" });
    expect(firefox).not.toHaveProperty("minimum_chrome_version");
    expect(firefox).not.toHaveProperty("side_panel");
    expect(chrome).not.toHaveProperty("sidebar_action");
    expect(chrome).not.toHaveProperty("browser_specific_settings");
    expect(firefox.sidebar_action?.default_panel).toBe(chrome.side_panel?.default_path);
  });

  it("declares a stable Firefox identity, support floor, and no data collection", () => {
    expect(firefox.browser_specific_settings?.gecko).toEqual({
      id: FIREFOX_ID, strict_min_version: "140.0", data_collection_permissions: { required: ["none"] },
    });
    expect(createManifest("firefox", { ...pkg, version: "2.3.5" }).browser_specific_settings?.gecko.id).toBe(FIREFOX_ID);
  });
});
