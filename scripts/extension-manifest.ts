/** Shared manifest: browser differences must stay in browserManifest below. */
export type BrowserTarget = "chrome" | "firefox";
export const FIREFOX_ID = "morris-peoplesoft-utilities@hackmods";
export const FIREFOX_MIN_VERSION = "140.0";

function browserManifest(target: BrowserTarget) {
  return target === "chrome" ? {
    minimum_chrome_version: "116",
    side_panel: { default_path: "sidepanel.html" },
    background: { service_worker: "background.js", type: "module" },
  } : {
    sidebar_action: { default_panel: "sidepanel.html", default_title: "Morris PeopleSoft Utilities", open_at_install: false },
    background: { scripts: ["background.js"], type: "module" },
    browser_specific_settings: {
      gecko: {
        id: FIREFOX_ID,
        strict_min_version: FIREFOX_MIN_VERSION,
        data_collection_permissions: { required: ["none"] },
      },
    },
  };
}

export function createManifest(target: BrowserTarget, pkg: { version: string; description: string }) {
  const manifest = {
    manifest_version: 3,

    name: "Morris PeopleSoft Utilities",
    short_name: "MPU",
    version: pkg.version,
    description: pkg.description,
    permissions: target === "chrome" ? ["storage", "sidePanel", "tabs"] : ["storage", "tabs"],
    action: {
      default_popup: "popup.html",
      default_title: "Morris PeopleSoft Utilities",
      default_icon: {
        "16": "icons/icon16.png",
        "32": "icons/icon32.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png",
      },
    },
    options_page: "options.html",
    ...browserManifest(target),
    icons: {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png",
    },
    content_scripts: [
      {
        matches: [
          "*://*/psp/*/*/*/c/*",
          "*://*/psc/*/*/*/c/*",
          "*://*/psp/*/*/*/h/*",
          "*://*/psc/*/*/*/h/*",
          "*://*/psp/*/*/*/s/*",
          "*://*/psc/*/*/*/s/*",
          "*://*/psp/*/*/*/w/WORKLIST*",
          "*://*/psc/*/*/*/w/WORKLIST*",
          "*://*/psp/*/?*cmd=login*",
          "*://*/psc/*/?*cmd=login*",
          "*://*/psp/*/?*cmd=logout*",
          "*://*/psc/*/?*cmd=logout*",
        ],
        js: ["content.js"],
        css: ["content.css"],
        run_at: "document_end",
      },
    ],
    web_accessible_resources: [
      {
        resources: [
          "inject/clear-bcs.js",
          "inject/resize-frame.js",
          "inject/field-entry-write.js",
          "icons/*",
        ],
        // Chrome WAR matches are origin-only: path must be exactly /*.
        // Content scripts still scope injection to PeopleSoft psp/psc paths.
        matches: ["*://*/*"],
      },
    ],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
  };
  return manifest;
}
