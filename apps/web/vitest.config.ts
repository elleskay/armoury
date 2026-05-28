import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.spec.ts"],
    environment: "node",
    globals: false,
    reporters: ["default"],
    globalSetup: ["./tests/unit/global-setup.ts"],
    setupFiles: ["./tests/unit/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
