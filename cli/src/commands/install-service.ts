import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { getConfigPath } from "../infrastructure/config/manager";
import {
  formatBullet,
  formatHeader,
  formatKeyValue,
  formatSection,
} from "../infrastructure/ui/format";
import { promptConfirm } from "../infrastructure/ui/prompts";
import { logger } from "../utils/logger";

export interface InstallServiceOptions {
  action?: string;
  skipPrompt?: boolean;
}

function isLinux(): boolean {
  return platform() === "linux";
}

function hasSystemctl(): boolean {
  try {
    execSync("which systemctl", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function isSystemdAvailable(): boolean {
  return isLinux() && hasSystemctl();
}

function getTokenArenaPath(): string {
  try {
    return execSync("which tokenarena", { encoding: "utf-8" }).trim();
  } catch {
    const npmRoot = execSync("npm root -g", { encoding: "utf-8" }).trim();
    return join(npmRoot, "@poco-ai", "tokenarena", "dist", "index.js");
  }
}

function getServiceDir(): string {
  return join(homedir(), ".config/systemd/user");
}

function getServiceFile(): string {
  return join(getServiceDir(), "tokenarena.service");
}

function generateServiceContent(): string {
  const execStart = getTokenArenaPath();
  const configPath = getConfigPath();
  const path = process.env.PATH || "/usr/local/bin:/usr/bin:/bin";

  return `[Unit]
Description=TokenArena Daemon - AI Usage Tracker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${execStart} daemon
Restart=always
RestartSec=10
Environment=PATH=${path}
Environment=TOKENARENA_CONFIG=${configPath}

[Install]
WantedBy=default.target
`;
}

function execSystemctl(args: string[]): void {
  execSync(`systemctl --user ${args.join(" ")}`, {
    stdio: "inherit",
  });
}

async function setupService(skipPrompt = false): Promise<void> {
  const serviceDir = getServiceDir();
  const serviceFile = getServiceFile();

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
    mkdirSync(serviceDir, { recursive: true });
    writeFileSync(serviceFile, generateServiceContent(), "utf-8");

    execSystemctl(["daemon-reload"]);
    execSystemctl(["enable", "tokenarena"]);
    execSystemctl(["start", "tokenarena"]);

    logger.info(formatSection("服务已设置"));
    logger.info(formatBullet(`服务文件: ${serviceFile}`, "success"));
    logger.info(formatBullet("服务已启用并启动", "success"));
    logger.info(
      formatKeyValue("查看状态", "systemctl --user status tokenarena"),
    );
  } catch (err) {
    logger.error(`设置服务失败: ${(err as Error).message}`);
    process.exit(1);
  }
}

async function startService(): Promise<void> {
  const serviceFile = getServiceFile();

  if (!existsSync(serviceFile)) {
    logger.info(
      formatBullet(
        "服务文件不存在。请先运行 'tokenarena install-service setup'。",
        "warning",
      ),
    );
    return;
  }

  try {
    execSystemctl(["start", "tokenarena"]);
    logger.info(formatBullet("服务已启动", "success"));
  } catch (err) {
    logger.error(`启动服务失败: ${(err as Error).message}`);
    process.exit(1);
  }
}

async function stopService(): Promise<void> {
  const serviceFile = getServiceFile();

  if (!existsSync(serviceFile)) {
    logger.info(
      formatBullet(
        "服务文件不存在。请先运行 'tokenarena install-service setup'。",
        "warning",
      ),
    );
    return;
  }

  try {
    execSystemctl(["stop", "tokenarena"]);
    logger.info(formatBullet("服务已停止", "success"));
  } catch (err) {
    logger.error(`停止服务失败: ${(err as Error).message}`);
    process.exit(1);
  }
}

async function restartService(): Promise<void> {
  const serviceFile = getServiceFile();

  if (!existsSync(serviceFile)) {
    logger.info(
      formatBullet(
        "服务文件不存在。请先运行 'tokenarena install-service setup'。",
        "warning",
      ),
    );
    return;
  }

  try {
    execSystemctl(["restart", "tokenarena"]);
    logger.info(formatBullet("服务已重启", "success"));
  } catch (err) {
    logger.error(`重启服务失败: ${(err as Error).message}`);
    process.exit(1);
  }
}

async function statusService(): Promise<void> {
  const serviceFile = getServiceFile();

  if (!existsSync(serviceFile)) {
    logger.info(
      formatBullet(
        "服务文件不存在。请先运行 'tokenarena install-service setup'。",
        "warning",
      ),
    );
    return;
  }

  try {
    execSystemctl(["status", "tokenarena"]);
  } catch (err) {
    console.log((err as Error).message);
  }
}

async function uninstallService(): Promise<void> {
  const serviceFile = getServiceFile();

  if (!existsSync(serviceFile)) {
    logger.info(formatBullet("服务文件不存在。", "warning"));
    return;
  }

  const shouldUninstall = await promptConfirm({
    message: "是否卸载 systemd 服务？",
    defaultValue: false,
  });

  if (!shouldUninstall) {
    logger.info(formatBullet("已取消卸载。"));
    return;
  }

  try {
    execSystemctl(["stop", "tokenarena"]);
    execSystemctl(["disable", "tokenarena"]);
    execSystemctl(["daemon-reload"]);
    rmSync(serviceFile);

    logger.info(formatSection("服务已卸载"));
    logger.info(formatBullet("服务已停用并删除", "success"));
  } catch (err) {
    logger.error(`卸载服务失败: ${(err as Error).message}`);
    process.exit(1);
  }
}

function printUsage(): void {
  logger.info(formatHeader("TokenArena systemd 服务管理"));
  logger.info(formatSection("可用操作"));
  logger.info(formatBullet("setup    - 创建并启用服务"));
  logger.info(formatBullet("start    - 启动服务"));
  logger.info(formatBullet("stop     - 停止服务"));
  logger.info(formatBullet("restart  - 重启服务"));
  logger.info(formatBullet("status   - 查看服务状态"));
  logger.info(formatBullet("uninstall - 卸载服务"));
}

export async function runInstallService(
  opts: InstallServiceOptions,
): Promise<void> {
  if (!isSystemdAvailable()) {
    logger.info(
      formatBullet("systemd 不可用。此功能仅在 Linux 系统上支持。", "warning"),
    );
    return;
  }

  const action = opts.action?.toLowerCase();

  if (!action) {
    printUsage();
    return;
  }

  switch (action) {
    case "setup":
      await setupService(opts.skipPrompt);
      break;
    case "start":
      await startService();
      break;
    case "stop":
      await stopService();
      break;
    case "restart":
      await restartService();
      break;
    case "status":
      await statusService();
      break;
    case "uninstall":
      await uninstallService();
      break;
    default:
      logger.error(`未知操作: ${action}`);
      process.exit(1);
  }
}
