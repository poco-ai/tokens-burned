import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { posix } from "node:path";
import { isCommandAvailable } from "../../utils/command";
import { logger } from "../../utils/logger";
import {
  formatBullet,
  formatHeader,
  formatKeyValue,
  formatSection,
} from "../ui/format";
import { promptConfirm } from "../ui/prompts";
import type { ServiceBackend, ServiceSupport } from "./types";
import {
  escapeDoubleQuotedValue,
  getManagedServiceEnvironment,
  resolveManagedDaemonCommand,
} from "./utils";

const SYSTEMD_SERVICE_NAME = "tokenarena";

export interface SystemdServiceDefinitionOptions {
  environment: Record<string, string>;
  execPath: string;
  args: string[];
}

export function getLinuxSystemdServiceDir(homePath = homedir()): string {
  return posix.join(homePath, ".config", "systemd", "user");
}

export function getLinuxSystemdServiceFile(homePath = homedir()): string {
  return posix.join(
    getLinuxSystemdServiceDir(homePath),
    `${SYSTEMD_SERVICE_NAME}.service`,
  );
}

export function buildSystemdServiceContent(
  options: SystemdServiceDefinitionOptions,
): string {
  const envLines = Object.entries(options.environment)
    .map(
      ([key, value]) =>
        `Environment="${escapeDoubleQuotedValue(key)}=${escapeDoubleQuotedValue(value)}"`,
    )
    .join("\n");
  const execArgs = [options.execPath, ...options.args]
    .map((value) => `"${escapeDoubleQuotedValue(value)}"`)
    .join(" ");

  return `[Unit]
Description=TokenArena Daemon - AI Usage Tracker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${execArgs}
Restart=on-failure
RestartSec=10
${envLines}

[Install]
WantedBy=default.target
`;
}

function getSystemdSupport(): ServiceSupport {
  if (platform() !== "linux") {
    return {
      ok: false,
      reason: "systemd 仅在 Linux 上可用。",
    };
  }

  if (!isCommandAvailable("systemctl")) {
    return {
      ok: false,
      reason: "未检测到 systemctl。",
    };
  }

  return { ok: true };
}

function execSystemctl(args: string[]): void {
  execFileSync("systemctl", ["--user", ...args], {
    stdio: "inherit",
  });
}

function ensureSystemdAvailable(): boolean {
  const support = getSystemdSupport();
  if (support.ok) {
    return true;
  }

  logger.info(formatBullet(`systemd 不可用。${support.reason}`, "warning"));
  return false;
}

export function createLinuxSystemdServiceBackend(): ServiceBackend {
  function isInstalled(): boolean {
    return existsSync(getLinuxSystemdServiceFile());
  }

  async function setup(skipPrompt = false): Promise<void> {
    if (!ensureSystemdAvailable()) {
      return;
    }

    const serviceDir = getLinuxSystemdServiceDir();
    const serviceFile = getLinuxSystemdServiceFile();

    logger.info(formatHeader("设置 systemd 服务", "TokenArena daemon"));

    if (!skipPrompt) {
      const shouldSetup = await promptConfirm({
        message: "是否创建并启用 systemd 用户服务？",
        defaultValue: true,
      });

      if (!shouldSetup) {
        logger.info(formatBullet("已取消服务设置。"));
        return;
      }
    }

    try {
      const command = resolveManagedDaemonCommand();
      const content = buildSystemdServiceContent({
        environment: getManagedServiceEnvironment(),
        execPath: command.execPath,
        args: command.args,
      });

      mkdirSync(serviceDir, { recursive: true });
      writeFileSync(serviceFile, content, "utf-8");

      execSystemctl(["daemon-reload"]);
      execSystemctl(["enable", SYSTEMD_SERVICE_NAME]);
      execSystemctl(["start", SYSTEMD_SERVICE_NAME]);

      logger.info(formatSection("服务已设置"));
      logger.info(formatBullet(`服务文件: ${serviceFile}`, "success"));
      logger.info(formatBullet("服务已启用并启动", "success"));
      logger.info(
        formatKeyValue("查看状态", "systemctl --user status tokenarena"),
      );
    } catch (err) {
      logger.error(`设置服务失败: ${(err as Error).message}`);
      throw err;
    }
  }

  async function start(): Promise<void> {
    if (!ensureSystemdAvailable()) {
      return;
    }

    if (!isInstalled()) {
      logger.info(
        formatBullet(
          "服务文件不存在。请先运行 'tokenarena service setup'。",
          "warning",
        ),
      );
      return;
    }

    try {
      execSystemctl(["start", SYSTEMD_SERVICE_NAME]);
      logger.info(formatBullet("服务已启动", "success"));
    } catch (err) {
      logger.error(`启动服务失败: ${(err as Error).message}`);
      throw err;
    }
  }

  async function stop(): Promise<void> {
    if (!ensureSystemdAvailable()) {
      return;
    }

    if (!isInstalled()) {
      logger.info(
        formatBullet(
          "服务文件不存在。请先运行 'tokenarena service setup'。",
          "warning",
        ),
      );
      return;
    }

    try {
      execSystemctl(["stop", SYSTEMD_SERVICE_NAME]);
      logger.info(formatBullet("服务已停止", "success"));
    } catch (err) {
      logger.error(`停止服务失败: ${(err as Error).message}`);
      throw err;
    }
  }

  async function restart(): Promise<void> {
    if (!ensureSystemdAvailable()) {
      return;
    }

    if (!isInstalled()) {
      logger.info(
        formatBullet(
          "服务文件不存在。请先运行 'tokenarena service setup'。",
          "warning",
        ),
      );
      return;
    }

    try {
      execSystemctl(["restart", SYSTEMD_SERVICE_NAME]);
      logger.info(formatBullet("服务已重启", "success"));
    } catch (err) {
      logger.error(`重启服务失败: ${(err as Error).message}`);
      throw err;
    }
  }

  async function status(): Promise<void> {
    if (!ensureSystemdAvailable()) {
      return;
    }

    if (!isInstalled()) {
      logger.info(
        formatBullet(
          "服务文件不存在。请先运行 'tokenarena service setup'。",
          "warning",
        ),
      );
      return;
    }

    try {
      execSystemctl(["status", SYSTEMD_SERVICE_NAME]);
    } catch {
      // systemctl status returns non-zero when the service is inactive or failed.
    }
  }

  async function uninstall(skipPrompt = false): Promise<void> {
    const serviceFile = getLinuxSystemdServiceFile();
    if (!existsSync(serviceFile)) {
      logger.info(formatBullet("服务文件不存在。", "warning"));
      return;
    }

    if (!skipPrompt) {
      const shouldUninstall = await promptConfirm({
        message: "是否卸载 systemd 服务？",
        defaultValue: false,
      });

      if (!shouldUninstall) {
        logger.info(formatBullet("已取消卸载。"));
        return;
      }
    }

    const support = getSystemdSupport();
    if (support.ok) {
      try {
        execSystemctl(["stop", SYSTEMD_SERVICE_NAME]);
      } catch {
        // Best effort: proceed with file cleanup.
      }

      try {
        execSystemctl(["disable", SYSTEMD_SERVICE_NAME]);
      } catch {
        // Best effort: proceed with file cleanup.
      }
    } else {
      logger.info(
        formatBullet(
          `当前无法访问 systemd，将只删除服务文件。${support.reason}`,
          "warning",
        ),
      );
    }

    try {
      rmSync(serviceFile);
      if (support.ok) {
        execSystemctl(["daemon-reload"]);
      }

      logger.info(formatSection("服务已卸载"));
      logger.info(formatBullet("服务已停用并删除", "success"));
    } catch (err) {
      logger.error(`卸载服务失败: ${(err as Error).message}`);
      throw err;
    }
  }

  return {
    displayName: "systemd 用户服务",
    canSetup: getSystemdSupport,
    isInstalled,
    getDefinitionPath: getLinuxSystemdServiceFile,
    getStatusHint: () => "systemctl --user status tokenarena",
    setup,
    start,
    stop,
    restart,
    status,
    uninstall,
  };
}
