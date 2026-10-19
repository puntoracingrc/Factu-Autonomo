import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Next preserves JSX for its compiler; component render tests need it emitted.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
