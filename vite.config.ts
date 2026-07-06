/**
 * Vite configuration: React with the Tailwind CSS v4 plugin.
 * Vitest runs the pure-logic tests under ./tests in a node environment.
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
