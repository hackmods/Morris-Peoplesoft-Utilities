/**
 * Generate Chrome Web Store listing assets from HTML mockups.
 * Captures exact pixel sizes via headless Chrome (fallback: pngjs placeholders).
 *
 * Outputs under store/assets/:
 *   store-icon-128.png, promo-small-440x280.png, promo-marquee-1400x560.png
 *   screenshots/01–05 (1280×800)
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "store/assets");
const shotDir = resolve(outDir, "screenshots");
const mockDir = resolve(outDir, "_mock");

const COLORS = {
  navy: "#1f3a4d",
  navyDeep: "#173041",
  navyDark: "#0f2433",
  gold: "#c4a035",
  goldLite: "#f0d56a",
  cream: "#f4f7fa",
  pageBg: "#eef2f5",
  card: "#ffffff",
  fg: "#14202b",
  muted: "#5a6b78",
  psBlue: "#005a9c",
  psHeader: "#003b70",
  border: "#c5d0d8",
  tipBg: "#111827",
  amber: "#d97706",
  green: "#15803d",
};

const SHARED_CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; overflow: hidden; }
  body {
    font-family: "Segoe UI", system-ui, sans-serif;
    color: ${COLORS.fg};
    background: ${COLORS.pageBg};
  }
  .mpu-bar {
    display: flex; flex-wrap: wrap; align-items: center;
    gap: 0.4rem 0.55rem; padding: 0.35rem 0.6rem;
    background: linear-gradient(180deg, ${COLORS.navy} 0%, ${COLORS.navyDeep} 100%);
    color: ${COLORS.cream}; font: 600 12px/1.3 "Segoe UI", system-ui, sans-serif;
    border-bottom: 2px solid ${COLORS.gold}; z-index: 100;
  }
  .mpu-brand {
    letter-spacing: 0.04em; padding: 0.15rem 0.4rem;
    border: 1px solid ${COLORS.gold}; border-radius: 2px;
  }
  .mpu-env { padding: 0.15rem 0.35rem; border-bottom: 3px solid #e05a3c; }
  .mpu-user { opacity: 0.95; font-weight: 500; }
  .mpu-btn {
    appearance: none; border: 1px solid #8aa0b0; background: #243f52;
    color: ${COLORS.cream}; border-radius: 3px; padding: 0.25rem 0.5rem;
    font: inherit; cursor: default;
  }
  .mpu-btn[aria-pressed="true"] {
    background: ${COLORS.gold}; color: #1a1a1a; border-color: ${COLORS.goldLite};
  }
  .mpu-select {
    max-width: 14rem; font: inherit; border-radius: 3px;
    border: 1px solid #8aa0b0; background: ${COLORS.navyDark};
    color: ${COLORS.cream}; padding: 0.2rem 0.35rem;
  }
  .ps-chrome {
    background: linear-gradient(180deg, ${COLORS.psHeader} 0%, ${COLORS.psBlue} 100%);
    color: #fff; padding: 0.45rem 0.85rem; display: flex; align-items: center;
    gap: 1rem; font: 600 13px/1.3 "Segoe UI", system-ui, sans-serif;
  }
  .ps-logo {
    background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.35);
    padding: 0.2rem 0.55rem; border-radius: 2px; letter-spacing: 0.03em;
  }
  .ps-search {
    margin-left: auto; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.35);
    color: #fff; padding: 0.2rem 0.5rem; border-radius: 3px; font: 500 12px "Segoe UI";
    min-width: 11rem;
  }
  .ps-nav {
    background: #f0f4f8; border-bottom: 1px solid ${COLORS.border};
    padding: 0.35rem 0.85rem; font: 500 12px/1.4 "Segoe UI"; color: ${COLORS.muted};
  }
  .ps-nav strong { color: ${COLORS.psBlue}; }
  .ps-page { padding: 1rem 1.25rem 1.5rem; }
  .ps-title {
    margin: 0 0 0.75rem; font: 650 1.35rem/1.25 "Segoe UI"; color: ${COLORS.psHeader};
  }
  .ps-card {
    background: ${COLORS.card}; border: 1px solid ${COLORS.border};
    border-radius: 4px; padding: 1rem 1.15rem; max-width: 52rem;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
  .ps-grid {
    display: grid; grid-template-columns: 9.5rem 1fr; gap: 0.55rem 0.85rem;
    align-items: center; font: 500 13px/1.35 "Segoe UI";
  }
  .ps-grid label { color: ${COLORS.muted}; text-align: right; }
  .ps-input {
    border: 1px solid #9aa8b4; border-radius: 2px; padding: 0.3rem 0.45rem;
    font: inherit; background: #fff; width: 100%; max-width: 18rem;
  }
  .ps-actions { margin-top: 1rem; display: flex; gap: 0.45rem; }
  .ps-actions button {
    border: 1px solid #8aa0b0; background: #f7f9fb; border-radius: 3px;
    padding: 0.35rem 0.85rem; font: 600 12px "Segoe UI"; color: ${COLORS.fg};
  }
  .ps-actions .primary {
    background: ${COLORS.psBlue}; color: #fff; border-color: ${COLORS.psHeader};
  }
  .caption {
    position: absolute; left: 1rem; bottom: 0.85rem;
    background: rgba(20,32,43,0.88); color: #fff; padding: 0.35rem 0.65rem;
    border-radius: 4px; font: 600 12px/1.3 "Segoe UI"; letter-spacing: 0.02em;
  }
  .mpu-dialog-backdrop {
    position: absolute; inset: 0; background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center; z-index: 200;
  }
  .mpu-dialog {
    background: #f7f9fb; color: #15202b; max-width: 28rem; width: 90%;
    border-radius: 6px; padding: 1rem 1.25rem;
    box-shadow: 0 8px 28px rgba(0,0,0,0.35); border: 1px solid ${COLORS.border};
  }
  .mpu-dialog h2 { margin: 0 0 0.5rem; font-size: 1.15rem; }
  .mpu-pre {
    white-space: pre-wrap; background: #e8eef2; padding: 0.75rem;
    border-radius: 4px; font: 500 13px/1.45 ui-monospace, Consolas, monospace;
    margin: 0;
  }
  .mpu-dialog-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
  .mpu-dialog .mpu-btn { background: ${COLORS.navy}; color: #fff; }
  .field-hi { outline: 2px solid ${COLORS.amber}; outline-offset: 1px; }
  .field-lock { outline: 2px solid ${COLORS.green}; outline-offset: 1px; }
  .mpu-field-tip {
    position: absolute; z-index: 250; background: ${COLORS.tipBg}; color: #f9fafb;
    padding: 0.25rem 0.5rem; border-radius: 3px;
    font: 600 12px/1.3 ui-monospace, Consolas, monospace;
    border: 1px solid #fbbf24; pointer-events: none;
  }
  .fav-open {
    position: absolute; top: 2.55rem; left: 11.5rem; z-index: 150;
    background: ${COLORS.navyDark}; color: ${COLORS.cream};
    border: 1px solid #8aa0b0; border-radius: 3px; min-width: 14rem;
    box-shadow: 0 6px 18px rgba(0,0,0,0.28); padding: 0.2rem 0;
    font: 500 12px/1.4 "Segoe UI";
  }
  .fav-open div { padding: 0.35rem 0.65rem; }
  .fav-open .sel { background: ${COLORS.gold}; color: #1a1a1a; font-weight: 650; }
`;

function shell(htmlBody: string, width: number, height: number, extraCss = ""): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=${width}, height=${height}" />
<style>
${SHARED_CSS}
html, body { width: ${width}px; height: ${height}px; }
.frame { position: relative; width: ${width}px; height: ${height}px; overflow: hidden; background: ${COLORS.pageBg}; }
${extraCss}
</style></head><body><div class="frame">${htmlBody}</div></body></html>`;
}

function mpuBar(opts: {
  inspectOn?: boolean;
  traceOn?: boolean;
  favOpen?: boolean;
} = {}): string {
  const inspect = opts.inspectOn
    ? `<button class="mpu-btn" aria-pressed="true">Inspect ON</button>`
    : `<button class="mpu-btn">Inspect</button>`;
  const trace = opts.traceOn
    ? `<button class="mpu-btn" aria-pressed="true">Trace ON</button>`
    : `<button class="mpu-btn">Trace OFF</button>`;
  return `
  <div class="mpu-bar" role="toolbar" aria-label="Morris PeopleSoft Utilities">
    <span class="mpu-brand">MPU</span>
    <span class="mpu-env">HRDEV</span>
    <span class="mpu-user">User: JSMITH</span>
    <button class="mpu-btn">★</button>
    <select class="mpu-select" aria-label="Open favorite">
      <option>Favorites…</option>
      <option selected>User Profiles</option>
      <option>Job Data</option>
      <option>Process Monitor</option>
    </select>
    ${trace}
    <button class="mpu-btn">Page Info</button>
    ${inspect}
    <button class="mpu-btn">New Win</button>
    <button class="mpu-btn">?</button>
  </div>`;
}

function psPage(content: string): string {
  return `
  <div class="ps-chrome">
    <span class="ps-logo">PeopleSoft</span>
    <span>Human Resources · Demo College</span>
    <span class="ps-search">Search…</span>
  </div>
  <div class="ps-nav">Home &gt; Set Up HCM &gt; Security &gt; <strong>User Profiles</strong></div>
  <div class="ps-page">${content}</div>`;
}

function formCard(): string {
  return `
  <h1 class="ps-title">User Profiles</h1>
  <div class="ps-card">
    <div class="ps-grid">
      <label for="f1">User ID</label>
      <input class="ps-input" id="PSOPRDEFN_OPRID" value="JSMITH" />
      <label for="f2">Description</label>
      <input class="ps-input" id="PSOPRDEFN_OPRDEFNDESC" value="Jane Smith (demo)" />
      <label for="f3">Symbolic ID</label>
      <input class="ps-input" id="PSOPRDEFN_SYMBOLICID" value="SYSADM1" />
      <label for="f4">Language</label>
      <input class="ps-input" id="PSOPRDEFN_LANGUAGE_CD" value="ENG" />
    </div>
    <div class="ps-actions">
      <button class="primary">Save</button>
      <button>Return to Search</button>
      <button>Notify</button>
    </div>
  </div>`;
}

const shots: Record<string, { w: number; h: number; html: string }> = {
  "screenshots/01-utilities-bar.png": {
    w: 1280,
    h: 800,
    html: shell(
      `${mpuBar()}${psPage(formCard())}<div class="caption">MPU utilities bar on PeopleSoft</div>`,
      1280,
      800,
    ),
  },
  "screenshots/02-favorites.png": {
    w: 1280,
    h: 800,
    html: shell(
      `${mpuBar({ favOpen: true })}
      <div class="fav-open">
        <div>Favorites…</div>
        <div class="sel">User Profiles</div>
        <div>Job Data</div>
        <div>Process Monitor</div>
        <div>Query Manager</div>
      </div>
      ${psPage(formCard())}
      <div class="caption">Jump to favorites without hunting menus</div>`,
      1280,
      800,
    ),
  },
  "screenshots/03-page-info.png": {
    w: 1280,
    h: 800,
    html: shell(
      `${mpuBar()}${psPage(formCard())}
      <div class="mpu-dialog-backdrop">
        <div class="mpu-dialog" role="dialog" aria-modal="true">
          <h2>Page Information</h2>
          <pre class="mpu-pre">Menu: MAINTAIN_SECURITY
Component: USERMAINT
Page: USER_GENERAL
Market: GBL
User: JSMITH
ToolsRel: 8.60.12
App Server: APPSRV-DEMO</pre>
          <div class="mpu-dialog-actions">
            <button class="mpu-btn">Copy</button>
            <button class="mpu-btn">Close</button>
          </div>
        </div>
      </div>
      <div class="caption">Page Info without CTRL+J</div>`,
      1280,
      800,
    ),
  },
  "screenshots/04-field-inspector.png": {
    w: 1280,
    h: 800,
    html: shell(
      `${mpuBar({ inspectOn: true })}
      ${psPage(`
        <h1 class="ps-title">User Profiles</h1>
        <div class="ps-card">
          <div class="ps-grid">
            <label>User ID</label>
            <input class="ps-input field-lock" id="PSOPRDEFN_OPRID" value="JSMITH" />
            <label>Description</label>
            <input class="ps-input field-hi" id="PSOPRDEFN_OPRDEFNDESC" value="Jane Smith (demo)" />
            <label>Symbolic ID</label>
            <input class="ps-input" id="PSOPRDEFN_SYMBOLICID" value="SYSADM1" />
            <label>Language</label>
            <input class="ps-input" id="PSOPRDEFN_LANGUAGE_CD" value="ENG" />
          </div>
          <div class="ps-actions">
            <button class="primary">Save</button>
            <button>Return to Search</button>
          </div>
        </div>
      `)}
      <div class="mpu-field-tip" style="left: 28rem; top: 17.5rem;">PSOPRDEFN.OPRDEFNDESC</div>
      <div class="caption">Field Inspector — hover RECORD.FIELD</div>`,
      1280,
      800,
    ),
  },
  "screenshots/05-options.png": {
    w: 1280,
    h: 800,
    html: shell(
      `<div class="opts">
        <header class="top">
          <h1>Morris PeopleSoft Utilities</h1>
          <p>Configure features for business analysts and technical staff. Data stays on this device.</p>
        </header>
        <nav class="tabs">
          <span class="tab on">Features</span>
          <span class="tab">Favorites</span>
          <span class="tab">Tracing</span>
          <span class="tab">Environments</span>
          <span class="tab">Host allowlist</span>
          <span class="tab">About</span>
        </nav>
        <section class="panel">
          <h2>Features</h2>
          <label class="row"><input type="checkbox" checked disabled /> Show User ID</label>
          <label class="row"><input type="checkbox" checked disabled /> Environment indicator</label>
          <label class="row"><input type="checkbox" checked disabled /> Favorites</label>
          <label class="row"><input type="checkbox" checked disabled /> Tracing</label>
          <label class="row"><input type="checkbox" checked disabled /> Page Information</label>
          <label class="row"><input type="checkbox" checked disabled /> Field Inspector</label>
          <label class="row"><input type="checkbox" checked disabled /> New Window</label>
          <label class="row"><input type="checkbox" checked disabled /> Auto-expand Advanced Search</label>
          <label class="row"><input type="checkbox" disabled /> Auto-select Correct History</label>
          <label class="row"><input type="checkbox" disabled /> Show bar on login page</label>
          <label class="row quiet"><input type="checkbox" disabled /> Quiet mode — don’t prompt to name new environments</label>
          <button class="primary" type="button">Save features</button>
        </section>
        <div class="caption">Options — local-only settings, no passwords or telemetry</div>
      </div>`,
      1280,
      800,
      `
      .opts {
        --bg: #eef2f5; --card: #fff; --fg: #14202b; --accent: #1f3a4d;
        --gold: #b8922a; --border: #c5d0d8;
        min-height: 100%; background:
          radial-gradient(ellipse at top left, color-mix(in srgb, var(--gold) 18%, transparent), transparent 45%),
          var(--bg);
        color: var(--fg); font: 16px/1.45 "Segoe UI", system-ui, sans-serif;
      }
      .top, .tabs { max-width: 960px; margin: 0 auto; padding: 1rem 1.25rem; }
      .top h1 { margin: 0 0 0.35rem; color: var(--accent); font-size: 1.75rem; }
      .top p { margin: 0; opacity: 0.9; }
      .tabs { display: flex; flex-wrap: wrap; gap: 0.35rem; padding-top: 0; }
      .tab {
        border: 1px solid var(--border); background: var(--card); color: var(--fg);
        border-radius: 999px; padding: 0.35rem 0.85rem; font: inherit;
      }
      .tab.on { background: var(--accent); color: #fff; border-color: var(--accent); }
      .panel {
        background: var(--card); border: 1px solid var(--border); border-radius: 10px;
        padding: 1rem 1.25rem 1.25rem; margin: 0 auto 2rem; max-width: 960px;
      }
      .panel h2 { margin: 0 0 0.65rem; }
      .row { display: flex; align-items: center; gap: 0.6rem; margin: 0.4rem 0; }
      .row.quiet { margin-top: 0.75rem; }
      .primary {
        margin-top: 0.85rem; background: var(--accent); color: #fff;
        border: 1px solid var(--accent); border-radius: 6px; padding: 0.4rem 0.8rem; font: inherit;
      }
      `,
    ),
  },
  "promo-small-440x280.png": {
    w: 440,
    h: 280,
    html: shell(
      `<div class="promo">
        <div class="mark">MPU</div>
        <h1>Morris PeopleSoft Utilities</h1>
        <p>Classic &amp; Fluid productivity for analysts and technical staff</p>
        <ul>
          <li>Favorites · Page Info · Trace</li>
          <li>Field Inspector · Local-only</li>
        </ul>
        <div class="bar"></div>
      </div>`,
      440,
      280,
      `
      .promo {
        width: 100%; height: 100%; padding: 1.15rem 1.25rem 1rem;
        background: linear-gradient(145deg, ${COLORS.navy} 0%, ${COLORS.navyDeep} 55%, #0c1c28 100%);
        color: ${COLORS.cream}; position: relative;
      }
      .mark {
        display: inline-block; border: 1px solid ${COLORS.gold}; border-radius: 2px;
        padding: 0.15rem 0.45rem; font: 700 13px/1 "Segoe UI"; letter-spacing: 0.06em;
        color: ${COLORS.goldLite}; margin-bottom: 0.65rem;
      }
      h1 {
        margin: 0 0 0.4rem; font: 700 1.35rem/1.15 "Segoe UI";
        max-width: 18rem;
      }
      p { margin: 0 0 0.65rem; font: 500 12px/1.35 "Segoe UI"; opacity: 0.92; max-width: 19rem; }
      ul { margin: 0; padding: 0 0 0 1rem; font: 600 11.5px/1.45 "Segoe UI"; color: ${COLORS.goldLite}; }
      .bar {
        position: absolute; left: 0; right: 0; bottom: 0; height: 10px; background: ${COLORS.gold};
      }
      `,
    ),
  },
  "promo-marquee-1400x560.png": {
    w: 1400,
    h: 560,
    html: shell(
      `<div class="mq">
        <div class="copy">
          <div class="mark">MPU</div>
          <h1>Morris PeopleSoft Utilities</h1>
          <p>Know your environment. Jump to favorites. Inspect fields — without leaving PeopleSoft.</p>
          <div class="pills">
            <span>Favorites</span><span>Page Info</span><span>Trace</span><span>Field Inspector</span>
          </div>
          <p class="trust">Local settings only · No passwords · No telemetry</p>
        </div>
        <div class="preview">
          <div class="mpu-bar" style="border-radius:4px 4px 0 0;">
            <span class="mpu-brand">MPU</span>
            <span class="mpu-env">HRDEV</span>
            <span class="mpu-user">User: JSMITH</span>
            <button class="mpu-btn">★</button>
            <select class="mpu-select"><option>User Profiles</option></select>
            <button class="mpu-btn">Trace OFF</button>
            <button class="mpu-btn">Page Info</button>
            <button class="mpu-btn" aria-pressed="true">Inspect ON</button>
          </div>
          <div class="mini-ps">
            <div class="mini-title">User Profiles</div>
            <div class="mini-row"><span>User ID</span><b class="hi">JSMITH</b></div>
            <div class="mini-row"><span>Description</span><b>Jane Smith (demo)</b></div>
            <div class="tip">PSOPRDEFN.OPRID</div>
          </div>
        </div>
        <div class="goldbar"></div>
      </div>`,
      1400,
      560,
      `
      .mq {
        width: 100%; height: 100%; display: grid;
        grid-template-columns: 1.05fr 1fr; gap: 2rem; align-items: center;
        padding: 2.5rem 3rem 3.25rem;
        background: linear-gradient(120deg, #0c1c28 0%, ${COLORS.navy} 42%, ${COLORS.navyDeep} 100%);
        color: ${COLORS.cream}; position: relative;
      }
      .mark {
        display: inline-block; border: 1px solid ${COLORS.gold}; border-radius: 2px;
        padding: 0.2rem 0.55rem; font: 700 14px/1 "Segoe UI"; letter-spacing: 0.08em;
        color: ${COLORS.goldLite}; margin-bottom: 0.85rem;
      }
      h1 { margin: 0 0 0.65rem; font: 750 2.55rem/1.1 "Segoe UI"; max-width: 16ch; }
      .copy > p { margin: 0 0 1.1rem; font: 500 1.05rem/1.4 "Segoe UI"; opacity: 0.92; max-width: 28rem; }
      .pills { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-bottom: 1rem; }
      .pills span {
        border: 1px solid rgba(196,160,53,0.55); background: rgba(15,36,51,0.65);
        color: ${COLORS.goldLite}; border-radius: 999px; padding: 0.25rem 0.7rem;
        font: 650 12px/1.2 "Segoe UI";
      }
      .trust { font: 600 0.9rem/1.3 "Segoe UI" !important; color: #9ec9e6 !important; opacity: 1 !important; }
      .preview {
        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12);
        border-radius: 8px; padding: 0.75rem; box-shadow: 0 18px 40px rgba(0,0,0,0.35);
      }
      .mini-ps {
        background: ${COLORS.pageBg}; color: ${COLORS.fg}; border-radius: 0 0 4px 4px;
        padding: 1rem 1.1rem 1.25rem; position: relative; min-height: 12rem;
      }
      .mini-title { font: 700 1.15rem/1.2 "Segoe UI"; color: ${COLORS.psHeader}; margin-bottom: 0.85rem; }
      .mini-row {
        display: grid; grid-template-columns: 7rem 1fr; gap: 0.5rem; align-items: center;
        margin: 0.45rem 0; font: 500 13px "Segoe UI";
      }
      .mini-row span { color: ${COLORS.muted}; text-align: right; }
      .mini-row b {
        font-weight: 600; background: #fff; border: 1px solid #9aa8b4;
        border-radius: 2px; padding: 0.25rem 0.45rem; display: inline-block; min-width: 10rem;
      }
      .hi { outline: 2px solid ${COLORS.green}; outline-offset: 1px; }
      .tip {
        position: absolute; left: 9.5rem; top: 4.4rem; background: ${COLORS.tipBg}; color: #f9fafb;
        padding: 0.2rem 0.45rem; border-radius: 3px; border: 1px solid #fbbf24;
        font: 600 12px/1.3 ui-monospace, Consolas, monospace;
      }
      .goldbar { position: absolute; left: 0; right: 0; bottom: 0; height: 14px; background: ${COLORS.gold}; }
      `,
    ),
  },
  "store-icon-128.png": {
    w: 128,
    h: 128,
    html: shell(
      `<div class="icon"><span class="m">MPU</span><span class="line"></span></div>`,
      128,
      128,
      `
      .icon {
        width: 100%; height: 100%;
        background: linear-gradient(180deg, ${COLORS.navy} 0%, ${COLORS.navyDeep} 100%);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 0.55rem; border-top: 6px solid ${COLORS.gold}; border-bottom: 6px solid ${COLORS.gold};
      }
      .m {
        font: 800 34px/1 "Segoe UI", system-ui, sans-serif; letter-spacing: 0.06em;
        color: ${COLORS.cream};
      }
      .line {
        display: block; width: 58px; height: 8px; border-radius: 1px; background: ${COLORS.goldLite};
      }
      `,
    ),
  },
};

function findChrome(): string | null {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.EDGE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA
      ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
      : "",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function fileUrl(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  if (/^[A-Za-z]:/.test(normalized)) {
    return `file:///${normalized}`;
  }
  return `file://${normalized}`;
}

function pngDims(path: string): { w: number; h: number } {
  const buf = readFileSync(path);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function capture(chrome: string, htmlPath: string, outPath: string, w: number, h: number): boolean {
  const result = spawnSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--window-size=${w},${h}`,
      `--screenshot=${outPath}`,
      fileUrl(htmlPath),
    ],
    { encoding: "utf8", timeout: 60_000 },
  );
  if (result.status !== 0 || !existsSync(outPath)) {
    console.warn(`Chrome capture failed for ${outPath}: ${result.stderr || result.error}`);
    return false;
  }
  try {
    const dims = pngDims(outPath);
    if (dims.w !== w || dims.h !== h) {
      console.warn(`Unexpected size for ${outPath}: ${dims.w}x${dims.h} (wanted ${w}x${h})`);
    }
  } catch {
    /* ignore */
  }
  return true;
}

function fill(png: PNG, color: [number, number, number], x0 = 0, y0 = 0, x1 = png.width, y1 = png.height) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (png.width * y + x) << 2;
      png.data[i] = color[0];
      png.data[i + 1] = color[1];
      png.data[i + 2] = color[2];
      png.data[i + 3] = 255;
    }
  }
}

function fallbackPng(path: string, w: number, h: number) {
  const png = new PNG({ width: w, height: h });
  fill(png, [31, 58, 77]);
  fill(png, [196, 160, 53], 0, h - Math.max(8, Math.floor(h * 0.04)), w, h);
  writeFileSync(path, PNG.sync.write(png));
}

function main() {
  mkdirSync(shotDir, { recursive: true });
  mkdirSync(mockDir, { recursive: true });

  const chrome = findChrome();
  if (!chrome) {
    console.warn("Chrome/Edge not found — writing solid fallback placeholders");
  } else {
    console.log(`Using browser: ${chrome}`);
  }

  for (const [rel, spec] of Object.entries(shots)) {
    const htmlName = rel.replace(/[\\/]/g, "__").replace(/\.png$/, ".html");
    const htmlPath = resolve(mockDir, htmlName);
    const outPath = resolve(outDir, rel);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(htmlPath, spec.html, "utf8");
    let ok = false;
    if (chrome) ok = capture(chrome, htmlPath, outPath, spec.w, spec.h);
    if (!ok) fallbackPng(outPath, spec.w, spec.h);
    else console.log(`Wrote ${rel} (${spec.w}x${spec.h})`);
  }

  // Keep extension toolbar icon in sync with store icon (128) + regenerate smaller via generate-icons
  const storeIcon = resolve(outDir, "store-icon-128.png");
  const publicIcons = resolve(root, "public/icons");
  if (existsSync(storeIcon)) {
    mkdirSync(publicIcons, { recursive: true });
    copyFileSync(storeIcon, resolve(publicIcons, "icon128.png"));
  }

  // Drop ephemeral mock HTML unless KEEP_MOCK=1
  if (process.env.KEEP_MOCK !== "1") {
    try {
      rmSync(mockDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  } else {
    console.log(`Kept mock HTML under ${mockDir} (${readdirSync(mockDir).length} files)`);
  }

  console.log("Generated store assets under store/assets");
}

main();
