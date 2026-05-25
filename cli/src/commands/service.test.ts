import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../infrastructure/service", () => ({
  getServiceBackend: vi.fn(),
}));

vi.mock("../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { getServiceBackend } from "../infrastructure/service";
import { logger } from "../utils/logger";
import { runServiceCommand } from "./service";

describe("runServiceCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("warns when backend is null", async () => {
    vi.mocked(getServiceBackend).mockReturnValue(null);
    await runServiceCommand({ action: "status" });
    expect(logger.info).toHaveBeenCalled();
  });

  it("prints usage when no action", async () => {
    const mockBackend = {
      displayName: "test",
      canSetup: vi.fn(() => ({ ok: true })),
      setup: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      restart: vi.fn(),
      status: vi.fn(),
      uninstall: vi.fn(),
      isInstalled: vi.fn(),
      getDefinitionPath: vi.fn(),
    };
    vi.mocked(getServiceBackend).mockReturnValue(mockBackend);
    await runServiceCommand({});
    expect(logger.info).toHaveBeenCalled();
  });

  it("prints usage with reason when canSetup fails", async () => {
    const mockBackend = {
      displayName: "test",
      canSetup: vi.fn(() => ({ ok: false, reason: "no systemd" })),
      setup: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      restart: vi.fn(),
      status: vi.fn(),
      uninstall: vi.fn(),
      isInstalled: vi.fn(),
      getDefinitionPath: vi.fn(),
    };
    vi.mocked(getServiceBackend).mockReturnValue(mockBackend);
    await runServiceCommand({});
    expect(logger.info).toHaveBeenCalled();
  });

  it("dispatches setup", async () => {
    const mockBackend = {
      displayName: "test",
      canSetup: vi.fn(() => ({ ok: true })),
      setup: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      restart: vi.fn(),
      status: vi.fn(),
      uninstall: vi.fn(),
      isInstalled: vi.fn(),
      getDefinitionPath: vi.fn(),
    };
    vi.mocked(getServiceBackend).mockReturnValue(mockBackend);
    await runServiceCommand({ action: "setup" });
    expect(mockBackend.setup).toHaveBeenCalled();
  });

  it("dispatches start", async () => {
    const mockBackend = {
      displayName: "test",
      canSetup: vi.fn(),
      setup: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      restart: vi.fn(),
      status: vi.fn(),
      uninstall: vi.fn(),
      isInstalled: vi.fn(),
      getDefinitionPath: vi.fn(),
    };
    vi.mocked(getServiceBackend).mockReturnValue(mockBackend);
    await runServiceCommand({ action: "start" });
    expect(mockBackend.start).toHaveBeenCalled();
  });

  it("dispatches stop", async () => {
    const mockBackend = {
      displayName: "test",
      canSetup: vi.fn(),
      setup: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      restart: vi.fn(),
      status: vi.fn(),
      uninstall: vi.fn(),
      isInstalled: vi.fn(),
      getDefinitionPath: vi.fn(),
    };
    vi.mocked(getServiceBackend).mockReturnValue(mockBackend);
    await runServiceCommand({ action: "stop" });
    expect(mockBackend.stop).toHaveBeenCalled();
  });

  it("dispatches restart", async () => {
    const mockBackend = {
      displayName: "test",
      canSetup: vi.fn(),
      setup: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      restart: vi.fn(),
      status: vi.fn(),
      uninstall: vi.fn(),
      isInstalled: vi.fn(),
      getDefinitionPath: vi.fn(),
    };
    vi.mocked(getServiceBackend).mockReturnValue(mockBackend);
    await runServiceCommand({ action: "restart" });
    expect(mockBackend.restart).toHaveBeenCalled();
  });

  it("dispatches status", async () => {
    const mockBackend = {
      displayName: "test",
      canSetup: vi.fn(),
      setup: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      restart: vi.fn(),
      status: vi.fn(),
      uninstall: vi.fn(),
      isInstalled: vi.fn(),
      getDefinitionPath: vi.fn(),
    };
    vi.mocked(getServiceBackend).mockReturnValue(mockBackend);
    await runServiceCommand({ action: "status" });
    expect(mockBackend.status).toHaveBeenCalled();
  });

  it("dispatches uninstall", async () => {
    const mockBackend = {
      displayName: "test",
      canSetup: vi.fn(),
      setup: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      restart: vi.fn(),
      status: vi.fn(),
      uninstall: vi.fn(),
      isInstalled: vi.fn(),
      getDefinitionPath: vi.fn(),
    };
    vi.mocked(getServiceBackend).mockReturnValue(mockBackend);
    await runServiceCommand({ action: "uninstall" });
    expect(mockBackend.uninstall).toHaveBeenCalled();
  });

  it("exits with error for unknown action", async () => {
    const mockBackend = {
      displayName: "test",
      canSetup: vi.fn(),
      setup: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      restart: vi.fn(),
      status: vi.fn(),
      uninstall: vi.fn(),
      isInstalled: vi.fn(),
      getDefinitionPath: vi.fn(),
    };
    vi.mocked(getServiceBackend).mockReturnValue(mockBackend);
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });
    await expect(runServiceCommand({ action: "unknown" })).rejects.toThrow(
      "exit",
    );
    expect(logger.error).toHaveBeenCalled();
    mockExit.mockRestore();
  });
});
