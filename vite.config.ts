import { defineConfig } from "vite";
import { resolve } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, cpSync, existsSync } from "node:fs";
import { build as esbuildBuild } from "esbuild";
import { createManifest, type BrowserTarget } from "./scripts/extension-manifest";

const root = resolve(__dirname);

/** Content scripts are classic scripts — no ESM imports allowed. */
async function bundleContentScriptAsIife(outDir: string) {
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

function writeManifest(outDir: string, target: BrowserTarget) {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as { version: string; description: string };
  writeFileSync(resolve(outDir, "manifest.json"), JSON.stringify(createManifest(target, pkg), null, 2));
}

export default defineConfig(({ mode }) => {
  const target: BrowserTarget = mode === "firefox" ? "firefox" : "chrome";
  const outDir = resolve(root, target === "chrome" ? "dist" : "dist/firefox");
  return {
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
          await bundleContentScriptAsIife(outDir);
          writeManifest(outDir, target);
        },
      },
    ],
  };
});
