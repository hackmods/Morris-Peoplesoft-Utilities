import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup/chrome-mock.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/inject/**",
        "src/**/*.css",
        "src/background/**",
        "src/content/index.ts",
        "src/ui/popup/popup.ts",
        "src/ui/options/options.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 75,
        branches: 55,
        statements: 80,
      },
    },
  },
});
