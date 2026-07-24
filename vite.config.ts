import { defineConfig } from "vite";
import { resolve } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, cpSync, existsSync } from "node:fs";
import { build as esbuildBuild } from "esbuild";

const root = resolve(__dirname);
const outDir = resolve(root, "dist");

/** Content scripts are classic scripts — no ESM imports allowed. */
async function bundleContentScriptAsIife() {
  const contentPath = resolve(outDir, "content.js");
  if (!existsSync(contentPath)) return;
  await esbuildBuild({
    absWorkingDir: outDir,
    entryPoints: [contentPath],
    bundle: true,
    format: "iife",
    outfile: contentPath,
    allowOverwrite: true,
    sourcemap: true,
    logLevel: "silent",
  });
}

function writeManifest() {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
    version: string;
    description: string;
  };
  const manifest = {
    manifest_version: 3,
    name: "Morris PeopleSoft Utilities",
    short_name: "MPU",
    version: pkg.version,
    description: pkg.description,
    permissions: ["storage", "sidePanel", "tabs"],
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
    side_panel: {
      default_path: "sidepanel.html",
    },
    background: {
      service_worker: "background.js",
      type: "module",
    },
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
          "inject/adv-search.js",
          "inject/corr-hist.js",
          "inject/corr-hist-and-adv-search.js",
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
  writeFileSync(resolve(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
}

export default defineConfig({
  base: "./",
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        background: resolve(root, "src/background/service-worker.ts"),
        content: resolve(root, "src/content/index.ts"),
        popup: resolve(root, "src/ui/popup/popup.html"),
        options: resolve(root, "src/ui/options/options.html"),
        sidepanel: resolve(root, "src/ui/sidepanel/sidepanel.html"),
        "inject/adv-search": resolve(root, "src/inject/adv-search.ts"),
        "inject/corr-hist": resolve(root, "src/inject/corr-hist.ts"),
        "inject/corr-hist-and-adv-search": resolve(root, "src/inject/corr-hist-and-adv-search.ts"),
        "inject/clear-bcs": resolve(root, "src/inject/clear-bcs.ts"),
        "inject/resize-frame": resolve(root, "src/inject/resize-frame.ts"),
        "inject/field-entry-write": resolve(root, "src/inject/field-entry-write.ts"),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name.startsWith("inject/")) return "[name].js";
          if (chunk.name === "background") return "background.js";
          if (chunk.name === "content") return "content.js";
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: (info) => {
          if (info.name === "content.css") return "content.css";
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
  plugins: [
    {
      name: "mpu-extension-finalize",
      async closeBundle() {
        mkdirSync(resolve(outDir, "icons"), { recursive: true });
        const iconsSrc = resolve(root, "public/icons");
        if (existsSync(iconsSrc)) {
          cpSync(iconsSrc, resolve(outDir, "icons"), { recursive: true });
        }

        const flattenHtml = (builtPath: string, destName: string) => {
          if (!existsSync(builtPath)) return;
          let html = readFileSync(builtPath, "utf8");
          // Normalize asset paths after moving HTML to dist root
          html = html.replace(/(href|src)="\.\.\/\.\.\/\.\.\/assets\//g, '$1="assets/');
          html = html.replace(/(href|src)="\.\/assets\//g, '$1="assets/');
          html = html.replace(/(href|src)="\/assets\//g, '$1="assets/');
          html = html.replace(/href="\.\.\/options\/options\.html"/g, 'href="options.html"');
          writeFileSync(resolve(outDir, destName), html);
        };

        flattenHtml(resolve(outDir, "src/ui/popup/popup.html"), "popup.html");
        flattenHtml(resolve(outDir, "src/ui/options/options.html"), "options.html");
        flattenHtml(resolve(outDir, "src/ui/sidepanel/sidepanel.html"), "sidepanel.html");
        await bundleContentScriptAsIife();
        writeManifest();
      },
    },
  ],
});
