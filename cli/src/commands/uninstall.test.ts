import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../infrastructure/config/manager", () => ({
  deleteConfig: vi.fn(),
  getConfigDir: vi.fn(() => "/tmp/config-dir"),
  getConfigPath: vi.fn(() => "/tmp/config-dir/config.json"),
  loadConfig: vi.fn(),
}));

vi.mock("../infrastructure/runtime/paths", () => ({
  getRuntimeDirPath: vi.fn(() => "/tmp/runtime-dir"),
  getStateDir: vi.fn(() => "/tmp/state-dir"),
}));

vi.mock("../infrastructure/service", () => ({
  getServiceBackend: vi.fn(),
}));

vi.mock("../infrastructure/ui/prompts", () => ({
  promptConfirm: vi.fn(),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  rmSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { existsSync } from "node:fs";
import { deleteConfig, loadConfig } from "../infrastructure/config/manager";
import { getServiceBackend } from "../infrastructure/service";
import { promptConfirm } from "../infrastructure/ui/prompts";
import { logger } from "../utils/logger";
import { runUninstall } from "./uninstall";

describe("runUninstall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns immediately when no local artifacts", async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(getServiceBackend).mockReturnValue(null);
    await runUninstall();
    expect(logger.info).toHaveBeenCalled();
    expect(promptConfirm).not.toHaveBeenCalled();
  });

  it("cancels uninstall when user declines", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(loadConfig).mockReturnValue({
      apiKey: "ta_test",
      apiUrl: "https://example.com",
    });
    vi.mocked(getServiceBackend).mockReturnValue(null);
    vi.mocked(promptConfirm).mockResolvedValue(false);
    await runUninstall();
    expect(deleteConfig).not.toHaveBeenCalled();
  });

  it("performs full uninstall when user confirms", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(loadConfig).mockReturnValue({
      apiKey: "ta_test",
      apiUrl: "https://example.com",
    });
    vi.mocked(getServiceBackend).mockReturnValue(null);
    vi.mocked(promptConfirm).mockResolvedValue(true);
    await runUninstall();
    expect(deleteConfig).toHaveBeenCalled();
  });

  it("handles installed service backend", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(loadConfig).mockReturnValue({
      apiKey: "ta_test",
      apiUrl: "https://example.com",
    });
    const mockBackend = {
      displayName: "test-service",
      isInstalled: vi.fn(() => true),
      getDefinitionPath: vi.fn(() => "/tmp/service"),
      uninstall: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(getServiceBackend).mockReturnValue(mockBackend);
    vi.mocked(promptConfirm)
      .mockResolvedValueOnce(true) // confirm uninstall
      .mockResolvedValueOnce(true); // remove service
    await runUninstall();
    expect(mockBackend.uninstall).toHaveBeenCalledWith(true);
  });

  it("handles service uninstall failure gracefully", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(loadConfig).mockReturnValue({
      apiKey: "ta_test",
      apiUrl: "https://example.com",
    });
    const mockBackend = {
      displayName: "test-service",
      isInstalled: vi.fn(() => true),
      getDefinitionPath: vi.fn(() => "/tmp/service"),
      uninstall: vi.fn().mockRejectedValue(new Error("failed")),
    };
    vi.mocked(getServiceBackend).mockReturnValue(mockBackend);
    vi.mocked(promptConfirm)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    await runUninstall();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("skips service uninstall when user declines", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(loadConfig).mockReturnValue({
      apiKey: "ta_test",
      apiUrl: "https://example.com",
    });
    const mockBackend = {
      displayName: "test-service",
      isInstalled: vi.fn(() => true),
      getDefinitionPath: vi.fn(() => "/tmp/service"),
      uninstall: vi.fn(),
    };
    vi.mocked(getServiceBackend).mockReturnValue(mockBackend);
    vi.mocked(promptConfirm)
      .mockResolvedValueOnce(true) // confirm uninstall
      .mockResolvedValueOnce(false); // skip service uninstall
    await runUninstall();
    expect(mockBackend.uninstall).not.toHaveBeenCalled();
  });
});
