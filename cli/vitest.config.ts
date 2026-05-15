import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
    coverage: {
      reporter: ["text", "json-summary", "lcov"],
      exclude: [
        "src/infrastructure/service/linux-systemd.ts",
        "src/infrastructure/service/macos-launchd.ts",
        "src/infrastructure/api/client.ts",
        "src/commands/home.ts",
        "src/services/sync-service.ts",
        "src/parsers/kiro.ts",
        "src/parsers/cursor.ts",
        "src/parsers/hermes.ts",
        "src/parsers/opencode.ts",
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 60,
        lines: 70,
      },
    },
  },
});
