import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../infrastructure/config/manager", () => ({
  getConfigPath: vi.fn(() => "/tmp/config.json"),
  loadConfig: vi.fn(),
}));

vi.mock("../infrastructure/runtime/cli-version", () => ({
  getCliVersion: vi.fn(() => "0.3.0"),
}));

vi.mock("../infrastructure/runtime/state", () => ({
  loadSyncState: vi.fn(() => ({ status: "idle" })),
}));

vi.mock("../parsers/registry", () => ({
  detectInstalledTools: vi.fn(() => []),
  getAllTools: vi.fn(() => []),
  isToolInstalled: vi.fn(() => false),
}));

vi.mock("../services/parser-service", () => ({
  runAllParsers: vi.fn(),
}));

vi.mock("../domain/local-usage-summary", () => ({
  buildLocalUsageDashboardData: vi.fn(() => ({})),
}));

vi.mock("../infrastructure/ui/local-usage-dashboard", () => ({
  showLocalUsageDashboard: vi.fn(),
}));

vi.mock("../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { loadConfig } from "../infrastructure/config/manager";
import { loadSyncState } from "../infrastructure/runtime/state";
import {
  detectInstalledTools,
  getAllTools,
  isToolInstalled,
} from "../parsers/registry";
import { runAllParsers } from "../services/parser-service";
import { logger } from "../utils/logger";
import { runStatus } from "./status";

describe("runStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows unconfigured status when no config", async () => {
    vi.mocked(loadConfig).mockReturnValue(null);
    await runStatus();
    expect(logger.info).toHaveBeenCalled();
  });

  it("shows configured status with apiKey", async () => {
    vi.mocked(loadConfig).mockReturnValue({
      apiKey: "ta_test12345678",
      apiUrl: "https://example.com",
      syncInterval: 1800000,
    });
    await runStatus();
    expect(logger.info).toHaveBeenCalled();
  });

  it("shows detected tools", async () => {
    vi.mocked(loadConfig).mockReturnValue(null);
    vi.mocked(detectInstalledTools).mockReturnValue([
      { id: "test-tool", name: "Test Tool", dataDir: "/tmp/test" },
    ]);
    vi.mocked(getAllTools).mockReturnValue([
      { id: "test-tool", name: "Test Tool", dataDir: "/tmp/test" },
    ]);
    vi.mocked(isToolInstalled).mockReturnValue(true);
    await runStatus();
    expect(logger.info).toHaveBeenCalled();
  });

  it("shows sync state with lastError", async () => {
    vi.mocked(loadConfig).mockReturnValue({
      apiKey: "ta_test",
      apiUrl: "https://example.com",
    });
    vi.mocked(loadSyncState).mockReturnValue({
      status: "error",
      lastError: "timeout",
      lastSource: "daemon",
      lastAttemptAt: "2026-01-01T00:00:00Z",
      lastResult: { buckets: 5, sessions: 2 },
    });
    await runStatus();
    expect(logger.info).toHaveBeenCalled();
  });

  it("runs dashboard with show option", async () => {
    vi.mocked(runAllParsers).mockResolvedValue({
      buckets: [],
      sessions: [],
      parserResults: [],
    });
    await runStatus({ show: true });
    expect(runAllParsers).toHaveBeenCalled();
  });
});
