import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../infrastructure/config/manager", () => ({
  loadConfig: vi.fn(),
}));

vi.mock("../infrastructure/ui/prompts", () => ({
  isInteractiveTerminal: vi.fn(() => false),
  promptConfirm: vi.fn(),
}));

vi.mock("../services/sync-service", () => ({
  runSync: vi.fn(),
}));

vi.mock("./init", () => ({
  runInit: vi.fn(),
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
import {
  isInteractiveTerminal,
  promptConfirm,
} from "../infrastructure/ui/prompts";
import { runSync } from "../services/sync-service";
import { runInit } from "./init";
import { runSyncCommand } from "./sync";

describe("runSyncCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs sync when config has apiKey", async () => {
    vi.mocked(loadConfig).mockReturnValue({
      apiKey: "ta_test",
      apiUrl: "https://example.com",
    });
    await runSyncCommand();
    expect(runSync).toHaveBeenCalled();
  });

  it("exits with error when no config and non-interactive", async () => {
    vi.mocked(loadConfig).mockReturnValue(null);
    vi.mocked(isInteractiveTerminal).mockReturnValue(false);
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });
    await expect(runSyncCommand()).rejects.toThrow("exit");
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  it("prompts init when no config and interactive, confirmed", async () => {
    vi.mocked(loadConfig).mockReturnValue(null);
    vi.mocked(isInteractiveTerminal).mockReturnValue(true);
    vi.mocked(promptConfirm).mockResolvedValue(true);
    await runSyncCommand();
    expect(runInit).toHaveBeenCalled();
  });

  it("cancels when interactive but user declines", async () => {
    vi.mocked(loadConfig).mockReturnValue(null);
    vi.mocked(isInteractiveTerminal).mockReturnValue(true);
    vi.mocked(promptConfirm).mockResolvedValue(false);
    await runSyncCommand();
    expect(runInit).not.toHaveBeenCalled();
    expect(runSync).not.toHaveBeenCalled();
  });
});
