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
    log: vi.fn(),
  },
}));

import { loadConfig } from "../infrastructure/config/manager";
import { runSync } from "../services/sync-service";
import { getDaemonExitCode, runDaemon } from "./daemon";

describe("daemon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDaemonExitCode", () => {
    it("returns 0 for service mode", () => {
      expect(getDaemonExitCode({ service: true })).toBe(0);
    });

    it("returns 1 for non-service mode", () => {
      expect(getDaemonExitCode()).toBe(1);
    });
  });

  describe("runDaemon", () => {
    it("exits when no config and non-interactive", async () => {
      vi.mocked(loadConfig).mockReturnValue(null);
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("exit");
      });
      await expect(runDaemon()).rejects.toThrow("exit");
      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });

    it("exits with correct code for service mode when no config", async () => {
      vi.mocked(loadConfig).mockReturnValue(null);
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("exit");
      });
      await expect(runDaemon({ service: true })).rejects.toThrow("exit");
      expect(mockExit).toHaveBeenCalledWith(0);
      mockExit.mockRestore();
    });

    it("exits on UNAUTHORIZED error", async () => {
      vi.mocked(loadConfig).mockReturnValue({
        apiKey: "ta_test",
        apiUrl: "https://example.com",
      });
      vi.mocked(runSync).mockRejectedValue(new Error("UNAUTHORIZED"));
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("exit");
      });
      await expect(runDaemon({ interval: 999999999 })).rejects.toThrow("exit");
      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });

    it("continues on non-UNAUTHORIZED sync errors", async () => {
      vi.mocked(loadConfig).mockReturnValue({
        apiKey: "ta_test",
        apiUrl: "https://example.com",
      });
      let callCount = 0;
      vi.mocked(runSync).mockImplementation(() => {
        callCount++;
        if (callCount === 1) throw new Error("network error");
        throw new Error("UNAUTHORIZED");
      });
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("exit");
      });
      await expect(runDaemon({ interval: 10 })).rejects.toThrow("exit");
      expect(runSync).toHaveBeenCalledTimes(2);
      mockExit.mockRestore();
    });
  });
});
