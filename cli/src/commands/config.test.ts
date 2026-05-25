import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../infrastructure/config/manager", () => ({
  loadConfig: vi.fn(),
  saveConfig: vi.fn(),
  validateApiKey: vi.fn(),
  isValidConfigKey: vi.fn((key: string) =>
    ["apiKey", "apiUrl", "syncInterval", "logLevel", "deviceId"].includes(key),
  ),
  getDefaultApiUrl: vi.fn(() => "https://token.poco-ai.com"),
}));

vi.mock("../infrastructure/ui/prompts", () => ({
  isInteractiveTerminal: vi.fn(() => false),
  promptPassword: vi.fn(),
  promptSelect: vi.fn(),
  promptText: vi.fn(),
}));

vi.mock("../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  loadConfig,
  saveConfig,
  validateApiKey,
} from "../infrastructure/config/manager";
import { isInteractiveTerminal } from "../infrastructure/ui/prompts";
import { logger } from "../utils/logger";
import { formatConfigValue, handleConfig, isConfigKey } from "./config";

describe("config command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isConfigKey", () => {
    it("returns true for valid keys", () => {
      expect(isConfigKey("apiKey")).toBe(true);
      expect(isConfigKey("apiUrl")).toBe(true);
      expect(isConfigKey("syncInterval")).toBe(true);
      expect(isConfigKey("logLevel")).toBe(true);
    });

    it("returns false for invalid keys", () => {
      expect(isConfigKey("deviceId")).toBe(false);
      expect(isConfigKey("invalid")).toBe(false);
      expect(isConfigKey("")).toBe(false);
    });
  });

  describe("formatConfigValue", () => {
    it("returns (empty) for null/undefined/empty", () => {
      expect(formatConfigValue("apiKey", null)).toBe("(empty)");
      expect(formatConfigValue("apiKey", undefined)).toBe("(empty)");
      expect(formatConfigValue("apiKey", "")).toBe("(empty)");
    });

    it("masks apiKey", () => {
      const result = formatConfigValue("apiKey", "ta_longkey123456");
      expect(result).toContain("ta_longk");
      expect(result).toContain("…");
    });

    it("formats syncInterval", () => {
      const result = formatConfigValue("syncInterval", 1800000);
      expect(result).toContain("30");
      expect(result).toContain("1800000");
    });

    it("returns string value for other keys", () => {
      expect(formatConfigValue("apiUrl", "https://example.com")).toBe(
        "https://example.com",
      );
      expect(formatConfigValue("logLevel", "debug")).toBe("debug");
    });
  });

  describe("handleConfig", () => {
    it("exits with error when no subcommand and non-interactive", async () => {
      vi.mocked(isInteractiveTerminal).mockReturnValue(false);
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("exit");
      });
      await expect(handleConfig([])).rejects.toThrow("exit");
      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });

    it("show subcommand outputs JSON when non-interactive with config", async () => {
      vi.mocked(isInteractiveTerminal).mockReturnValue(false);
      vi.mocked(loadConfig).mockReturnValue({
        apiKey: "ta_test",
        apiUrl: "https://example.com",
      });
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await handleConfig(["show"]);
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it("show subcommand outputs {} when no config", async () => {
      vi.mocked(isInteractiveTerminal).mockReturnValue(false);
      vi.mocked(loadConfig).mockReturnValue(null);
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await handleConfig(["show"]);
      expect(logSpy).toHaveBeenCalledWith("{}");
      logSpy.mockRestore();
    });

    it("get subcommand exits with error for invalid key", async () => {
      vi.mocked(isInteractiveTerminal).mockReturnValue(false);
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("exit");
      });
      await expect(handleConfig(["get", "invalid"])).rejects.toThrow("exit");
      expect(logger.error).toHaveBeenCalled();
      mockExit.mockRestore();
    });

    it("get subcommand exits 0 when key not in config", async () => {
      vi.mocked(isInteractiveTerminal).mockReturnValue(false);
      vi.mocked(loadConfig).mockReturnValue({
        apiKey: "ta_test",
        apiUrl: "https://example.com",
      });
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("exit");
      });
      // "logLevel" is a valid key but not in this config
      await expect(handleConfig(["get", "logLevel"])).rejects.toThrow("exit");
      expect(mockExit).toHaveBeenCalledWith(0);
      mockExit.mockRestore();
    });

    it("get subcommand prints value for valid key", async () => {
      vi.mocked(isInteractiveTerminal).mockReturnValue(false);
      vi.mocked(loadConfig).mockReturnValue({
        apiKey: "ta_test",
        apiUrl: "https://example.com",
      });
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {});
      await handleConfig(["get", "apiKey"]);
      expect(logSpy).toHaveBeenCalledWith("ta_test");
      logSpy.mockRestore();
      mockExit.mockRestore();
    });

    it("set subcommand exits with error for invalid key", async () => {
      vi.mocked(isInteractiveTerminal).mockReturnValue(false);
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("exit");
      });
      await expect(handleConfig(["set", "invalid", "value"])).rejects.toThrow(
        "exit",
      );
      mockExit.mockRestore();
    });

    it("set subcommand saves apiKey", async () => {
      vi.mocked(isInteractiveTerminal).mockReturnValue(false);
      vi.mocked(validateApiKey).mockReturnValue(true);
      vi.mocked(loadConfig).mockReturnValue({
        apiKey: "ta_old",
        apiUrl: "https://example.com",
      });
      await handleConfig(["set", "apiKey", "ta_new123456789"]);
      expect(saveConfig).toHaveBeenCalled();
    });

    it("set subcommand rejects invalid apiKey", async () => {
      vi.mocked(isInteractiveTerminal).mockReturnValue(false);
      vi.mocked(validateApiKey).mockReturnValue(false);
      vi.mocked(loadConfig).mockReturnValue({
        apiKey: "ta_old",
        apiUrl: "https://example.com",
      });
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("exit");
      });
      await expect(handleConfig(["set", "apiKey", "bad_key"])).rejects.toThrow(
        "exit",
      );
      expect(logger.error).toHaveBeenCalled();
      mockExit.mockRestore();
    });

    it("set subcommand rejects invalid URL", async () => {
      vi.mocked(isInteractiveTerminal).mockReturnValue(false);
      vi.mocked(loadConfig).mockReturnValue({
        apiKey: "ta_test",
        apiUrl: "https://example.com",
      });
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("exit");
      });
      await expect(
        handleConfig(["set", "apiUrl", "not-a-url"]),
      ).rejects.toThrow("exit");
      mockExit.mockRestore();
    });

    it("set subcommand rejects non-positive syncInterval", async () => {
      vi.mocked(isInteractiveTerminal).mockReturnValue(false);
      vi.mocked(loadConfig).mockReturnValue({
        apiKey: "ta_test",
        apiUrl: "https://example.com",
      });
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("exit");
      });
      await expect(handleConfig(["set", "syncInterval", "0"])).rejects.toThrow(
        "exit",
      );
      mockExit.mockRestore();
    });

    it("set subcommand creates config when none exists", async () => {
      vi.mocked(isInteractiveTerminal).mockReturnValue(false);
      vi.mocked(loadConfig).mockReturnValue(null);
      await handleConfig(["set", "logLevel", "debug"]);
      expect(saveConfig).toHaveBeenCalled();
    });

    it("exits with error for unknown subcommand", async () => {
      vi.mocked(isInteractiveTerminal).mockReturnValue(false);
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("exit");
      });
      await expect(handleConfig(["unknown"])).rejects.toThrow("exit");
      expect(logger.error).toHaveBeenCalled();
      mockExit.mockRestore();
    });
  });
});
