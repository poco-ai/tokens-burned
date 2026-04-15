import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { posix } from "node:path";
import { isCommandAvailable } from "../../utils/command";
import { logger } from "../../utils/logger";
import { ensureAppDirs, getStateDir } from "../runtime/paths";
import {
  formatBullet,
  formatHeader,
  formatKeyValue,
  formatSection,
} from "../ui/format";
import { promptConfirm } from "../ui/prompts";
import type { ServiceBackend, ServiceSupport } from "./types";
import {
  escapeXml,
  getManagedServiceEnvironment,
  resolveManagedDaemonCommand,
} from "./utils";

export const MACOS_LAUNCHD_LABEL = "com.poco-ai.tokenarena";

export interface LaunchdPlistOptions {
  label: string;
  programArguments: string[];
  environment: Record<string, string>;
  workingDirectory: string;
  standardOutPath: string;
  standardErrorPath: string;
}

function getCurrentUid(): number | null {
  return typeof process.getuid === "function" ? process.getuid() : null;
}

export function getMacosLaunchAgentDir(homePath = homedir()): string {
  return posix.join(homePath, "Library", "LaunchAgents");
}

export function getMacosLaunchAgentFile(homePath = homedir()): string {
  return posix.join(
    getMacosLaunchAgentDir(homePath),
    `${MACOS_LAUNCHD_LABEL}.plist`,
  );
}

export function getMacosLaunchdDomain(uid = getCurrentUid()): string {
  if (uid == null) {
    throw new Error("无法获取当前用户 UID。");
  }

  return `gui/${uid}`;
}

export function getMacosLaunchdServiceTarget(uid = getCurrentUid()): string {
  return `${getMacosLaunchdDomain(uid)}/${MACOS_LAUNCHD_LABEL}`;
}

export function getMacosLaunchdLogPaths(stateDir = getStateDir()): {
  stdoutPath: string;
  stderrPath: string;
} {
  return {
    stdoutPath: posix.join(stateDir, "launchd.stdout.log"),
    stderrPath: posix.join(stateDir, "launchd.stderr.log"),
  };
}

function renderPlistArray(values: string[]): string {
  return values
    .map((value) => `      <string>${escapeXml(value)}</string>`)
    .join("\n");
}

function renderPlistDict(entries: Record<string, string>): string {
  return Object.entries(entries)
    .map(
      ([key, value]) =>
        `      <key>${escapeXml(key)}</key>\n      <string>${escapeXml(value)}</string>`,
    )
    .join("\n");
}

export function buildLaunchdPlist(options: LaunchdPlistOptions): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${escapeXml(options.label)}</string>
    <key>ProgramArguments</key>
    <array>
${renderPlistArray(options.programArguments)}
    </array>
    <key>WorkingDirectory</key>
    <string>${escapeXml(options.workingDirectory)}</string>
    <key>EnvironmentVariables</key>
    <dict>
${renderPlistDict(options.environment)}
    </dict>
    <key>KeepAlive</key>
    <dict>
      <key>SuccessfulExit</key>
      <false/>
    </dict>
    <key>ProcessType</key>
    <string>Background</string>
    <key>ThrottleInterval</key>
    <integer>30</integer>
    <key>ExitTimeOut</key>
    <integer>15</integer>
    <key>StandardOutPath</key>
    <string>${escapeXml(options.standardOutPath)}</string>
    <key>StandardErrorPath</key>
    <string>${escapeXml(options.standardErrorPath)}</string>
  </dict>
</plist>
`;
}

function getLaunchctlSupport(): ServiceSupport {
  if (platform() !== "darwin") {
    return {
      ok: false,
      reason: "launchd 仅在 macOS 上可用。",
    };
  }

  if (!isCommandAvailable("launchctl")) {
    return {
      ok: false,
      reason: "未检测到 launchctl。",
    };
  }

  const uid = getCurrentUid();
  if (uid == null) {
    return {
      ok: false,
      reason: "无法获取当前用户 UID。",
    };
  }

  try {
    execFileSync("launchctl", ["print", getMacosLaunchdDomain(uid)], {
      stdio: "ignore",
    });
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: "当前未检测到图形化登录会话，请在桌面终端中执行。",
    };
  }
}

function execLaunchctl(args: string[], inherit = true): void {
  execFileSync("launchctl", args, {
    stdio: inherit ? "inherit" : "ignore",
  });
}

function isLoaded(): boolean {
  try {
    execLaunchctl(["print", getMacosLaunchdServiceTarget()], false);
    return true;
  } catch {
    return false;
  }
}

function ensureLaunchctlAvailable(): boolean {
  const support = getLaunchctlSupport();
  if (support.ok) {
    return true;
  }

  logger.info(formatBullet(`launchd 不可用。${support.reason}`, "warning"));
  return false;
}

function writeLaunchAgentPlist(): string {
  const plistFile = getMacosLaunchAgentFile();
  const { stdoutPath, stderrPath } = getMacosLaunchdLogPaths();
  const command = resolveManagedDaemonCommand();
  const plist = buildLaunchdPlist({
    label: MACOS_LAUNCHD_LABEL,
    programArguments: [command.execPath, ...command.args],
    environment: getManagedServiceEnvironment(),
    workingDirectory: homedir(),
    standardOutPath: stdoutPath,
    standardErrorPath: stderrPath,
  });

  ensureAppDirs();
  mkdirSync(getMacosLaunchAgentDir(), { recursive: true });
  writeFileSync(plistFile, plist, "utf-8");

  return plistFile;
}

function bootstrapLaunchAgent(): void {
  const domain = getMacosLaunchdDomain();
  const serviceTarget = getMacosLaunchdServiceTarget();
  const plistFile = getMacosLaunchAgentFile();

  if (isLoaded()) {
    try {
      execLaunchctl(["bootout", serviceTarget]);
    } catch {
      // Best effort: try a fresh bootstrap anyway.
    }
  }

  execLaunchctl(["bootstrap", domain, plistFile]);
  execLaunchctl(["enable", serviceTarget]);
  execLaunchctl(["kickstart", "-k", serviceTarget]);
}

export function createMacosLaunchdServiceBackend(): ServiceBackend {
  function isInstalled(): boolean {
    return existsSync(getMacosLaunchAgentFile());
  }

  async function setup(skipPrompt = false): Promise<void> {
    if (!ensureLaunchctlAvailable()) {
      return;
    }

    logger.info(formatHeader("设置 launchd 服务", "TokenArena daemon"));

    if (!skipPrompt) {
      const shouldSetup = await promptConfirm({
        message: "是否创建并启用 launchd 用户服务？",
        defaultValue: true,
      });

      if (!shouldSetup) {
        logger.info(formatBullet("已取消服务设置。"));
        return;
      }
    }

    try {
      const plistFile = writeLaunchAgentPlist();
      bootstrapLaunchAgent();

      logger.info(formatSection("服务已设置"));
      logger.info(formatBullet(`服务文件: ${plistFile}`, "success"));
      logger.info(formatBullet("服务已启用并启动", "success"));
      logger.info(
        formatKeyValue(
          "查看状态",
          `launchctl print ${getMacosLaunchdServiceTarget()}`,
        ),
      );
    } catch (err) {
      logger.error(`设置服务失败: ${(err as Error).message}`);
      throw err;
    }
  }

  async function start(): Promise<void> {
    if (!ensureLaunchctlAvailable()) {
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
      if (!isLoaded()) {
        execLaunchctl([
          "bootstrap",
          getMacosLaunchdDomain(),
          getMacosLaunchAgentFile(),
        ]);
      }
      execLaunchctl(["enable", getMacosLaunchdServiceTarget()]);
      execLaunchctl(["kickstart", "-k", getMacosLaunchdServiceTarget()]);
      logger.info(formatBullet("服务已启动", "success"));
    } catch (err) {
      logger.error(`启动服务失败: ${(err as Error).message}`);
      throw err;
    }
  }

  async function stop(): Promise<void> {
    if (!isInstalled()) {
      logger.info(
        formatBullet(
          "服务文件不存在。请先运行 'tokenarena service setup'。",
          "warning",
        ),
      );
      return;
    }

    if (!ensureLaunchctlAvailable()) {
      return;
    }

    if (!isLoaded()) {
      logger.info(formatBullet("服务当前未运行。", "warning"));
      return;
    }

    try {
      execLaunchctl(["bootout", getMacosLaunchdServiceTarget()]);
      logger.info(formatBullet("服务已停止", "success"));
    } catch (err) {
      logger.error(`停止服务失败: ${(err as Error).message}`);
      throw err;
    }
  }

  async function restart(): Promise<void> {
    if (!ensureLaunchctlAvailable()) {
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
      if (isLoaded()) {
        execLaunchctl(["kickstart", "-k", getMacosLaunchdServiceTarget()]);
      } else {
        execLaunchctl([
          "bootstrap",
          getMacosLaunchdDomain(),
          getMacosLaunchAgentFile(),
        ]);
        execLaunchctl(["enable", getMacosLaunchdServiceTarget()]);
        execLaunchctl(["kickstart", "-k", getMacosLaunchdServiceTarget()]);
      }
      logger.info(formatBullet("服务已重启", "success"));
    } catch (err) {
      logger.error(`重启服务失败: ${(err as Error).message}`);
      throw err;
    }
  }

  async function status(): Promise<void> {
    if (!isInstalled()) {
      logger.info(
        formatBullet(
          "服务文件不存在。请先运行 'tokenarena service setup'。",
          "warning",
        ),
      );
      return;
    }

    if (!ensureLaunchctlAvailable()) {
      return;
    }

    try {
      execLaunchctl(["print", getMacosLaunchdServiceTarget()]);
    } catch {
      logger.info(formatBullet("服务当前未加载。", "warning"));
      logger.info(formatKeyValue("服务文件", getMacosLaunchAgentFile()));
    }
  }

  async function uninstall(skipPrompt = false): Promise<void> {
    const plistFile = getMacosLaunchAgentFile();
    if (!existsSync(plistFile)) {
      logger.info(formatBullet("服务文件不存在。", "warning"));
      return;
    }

    if (!skipPrompt) {
      const shouldUninstall = await promptConfirm({
        message: "是否卸载 launchd 服务？",
        defaultValue: false,
      });

      if (!shouldUninstall) {
        logger.info(formatBullet("已取消卸载。"));
        return;
      }
    }

    const support = getLaunchctlSupport();
    if (support.ok && isLoaded()) {
      try {
        execLaunchctl(["bootout", getMacosLaunchdServiceTarget()]);
      } catch {
        // Best effort: continue with file cleanup.
      }
    } else if (!support.ok) {
      logger.info(
        formatBullet(
          `当前无法访问 launchd，会直接删除本地 plist 文件。${support.reason}`,
          "warning",
        ),
      );
    }

    try {
      const { stdoutPath, stderrPath } = getMacosLaunchdLogPaths();
      rmSync(plistFile);
      rmSync(stdoutPath, { force: true });
      rmSync(stderrPath, { force: true });

      logger.info(formatSection("服务已卸载"));
      logger.info(formatBullet("服务已停用并删除", "success"));
    } catch (err) {
      logger.error(`卸载服务失败: ${(err as Error).message}`);
      throw err;
    }
  }

  return {
    displayName: "launchd 用户服务",
    canSetup: getLaunchctlSupport,
    isInstalled,
    getDefinitionPath: getMacosLaunchAgentFile,
    getStatusHint: () => `launchctl print ${getMacosLaunchdServiceTarget()}`,
    setup,
    start,
    stop,
    restart,
    status,
    uninstall,
  };
}
