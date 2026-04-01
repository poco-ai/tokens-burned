import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { dirname, join, posix, win32 } from "node:path";
import { ApiClient } from "../infrastructure/api/client";
import {
  type Config,
  DEFAULT_SYNC_INTERVAL,
  getDefaultApiUrl,
  getOrCreateDeviceId,
  loadConfig,
  saveConfig,
  validateApiKey,
} from "../infrastructure/config/manager";
import {
  formatBullet,
  formatHeader,
  formatKeyValue,
  formatMutedPath,
  formatSection,
  maskSecret,
} from "../infrastructure/ui/format";
import {
  isInteractiveTerminal,
  promptConfirm,
  promptPassword,
} from "../infrastructure/ui/prompts";
import { getDetectedTools } from "../services/parser-service";
import { runSync } from "../services/sync-service";
import { logger } from "../utils/logger";

interface BrowserLaunchCommand {
  command: string;
  args: string[];
}

export interface ShellAliasSetup {
  aliasLine: string;
  aliasPatterns: string[];
  configFile: string;
  shellLabel: string;
  sourceHint: string;
}

interface ResolveShellAliasSetupOptions {
  currentPlatform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  exists?: (path: string) => boolean;
  homeDir?: string;
  resolvePowerShellProfilePath?: () => string | null;
}

function joinForPlatform(
  currentPlatform: NodeJS.Platform,
  ...parts: string[]
): string {
  return currentPlatform === "win32"
    ? win32.join(...parts)
    : posix.join(...parts);
}

function basenameLikeShell(input: string): string {
  return (
    input
      .split(/[\\/]+/)
      .pop()
      ?.replace(/\.exe$/i, "") ?? input
  );
}

export function getBrowserLaunchCommand(
  url: string,
  currentPlatform: NodeJS.Platform = platform(),
): BrowserLaunchCommand {
  switch (currentPlatform) {
    case "darwin":
      return {
        command: "open",
        args: [url],
      };
    case "win32":
      return {
        command: "cmd.exe",
        args: ["/d", "/s", "/c", "start", "", url],
      };
    default:
      return {
        command: "xdg-open",
        args: [url],
      };
  }
}

function openBrowser(url: string): void {
  const { command, args } = getBrowserLaunchCommand(url);

  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });

    child.on("error", () => {});
    child.unref();
  } catch {
    // Best-effort only. We still print the URL for manual use.
  }
}

function resolvePowerShellProfilePath(): string | null {
  const systemRoot = process.env.SYSTEMROOT || "C:\\Windows";
  const candidates = [
    "pwsh.exe",
    join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
  ];

  for (const command of candidates) {
    try {
      const output = execFileSync(
        command,
        [
          "-NoLogo",
          "-NoProfile",
          "-Command",
          "$PROFILE.CurrentUserCurrentHost",
        ],
        {
          encoding: "utf-8",
          timeout: 3000,
          windowsHide: true,
        },
      ).trim();

      if (output) {
        return output;
      }
    } catch {
      // Try the next PowerShell executable.
    }
  }

  return null;
}

export function resolveShellAliasSetup(
  options: ResolveShellAliasSetupOptions = {},
): ShellAliasSetup | null {
  const currentPlatform = options.currentPlatform ?? platform();
  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? homedir();
  const pathExists = options.exists ?? existsSync;

  const shellFromEnv = env.SHELL
    ? basenameLikeShell(env.SHELL).toLowerCase()
    : "";
  const shellName =
    shellFromEnv || (currentPlatform === "win32" ? "powershell" : "");
  const aliasName = "ta";

  switch (shellName) {
    case "zsh":
      return {
        aliasLine: `alias ${aliasName}="tokenarena"`,
        aliasPatterns: [`alias ${aliasName}=`, `function ${aliasName}`],
        configFile: joinForPlatform(currentPlatform, homeDir, ".zshrc"),
        shellLabel: "zsh",
        sourceHint: "source ~/.zshrc",
      };
    case "bash": {
      const bashProfile = joinForPlatform(
        currentPlatform,
        homeDir,
        ".bash_profile",
      );
      const useBashProfile =
        currentPlatform === "darwin" && pathExists(bashProfile);

      return {
        aliasLine: `alias ${aliasName}="tokenarena"`,
        aliasPatterns: [`alias ${aliasName}=`, `function ${aliasName}`],
        configFile: useBashProfile
          ? bashProfile
          : joinForPlatform(currentPlatform, homeDir, ".bashrc"),
        shellLabel: "bash",
        sourceHint: useBashProfile
          ? "source ~/.bash_profile"
          : "source ~/.bashrc",
      };
    }
    case "fish":
      return {
        aliasLine: `alias ${aliasName} "tokenarena"`,
        aliasPatterns: [`alias ${aliasName}`, `function ${aliasName}`],
        configFile: joinForPlatform(
          currentPlatform,
          homeDir,
          ".config",
          "fish",
          "config.fish",
        ),
        shellLabel: "fish",
        sourceHint: "source ~/.config/fish/config.fish",
      };
    case "powershell": {
      const configFile =
        options.resolvePowerShellProfilePath?.() ||
        resolvePowerShellProfilePath() ||
        joinForPlatform(
          currentPlatform,
          homeDir,
          "Documents",
          "PowerShell",
          "Microsoft.PowerShell_profile.ps1",
        );

      return {
        aliasLine: `Set-Alias -Name ${aliasName} -Value tokenarena`,
        aliasPatterns: [
          `set-alias -name ${aliasName}`,
          `set-alias ${aliasName}`,
          `new-alias ${aliasName}`,
          `function ${aliasName}`,
        ],
        configFile,
        shellLabel: "PowerShell",
        sourceHint: ". $PROFILE",
      };
    }
    default:
      return null;
  }
}

export interface InitOptions {
  apiUrl?: string;
  daemon?: boolean;
}

export async function runInit(opts: InitOptions = {}): Promise<void> {
  logger.info(formatHeader("TokenArena 初始化"));

  const existing = loadConfig();
  if (existing?.apiKey) {
    logger.info(formatSection("检测到已有配置"));
    logger.info(formatKeyValue("当前 API Key", maskSecret(existing.apiKey)));
    logger.info(
      formatKeyValue(
        "当前 API 地址",
        existing.apiUrl || "https://token.poco-ai.com",
      ),
    );

    const shouldOverwrite = await promptConfirm({
      message: "已经存在本地配置，是否覆盖并重新初始化？",
      defaultValue: false,
    });

    if (!shouldOverwrite) {
      logger.info(formatBullet("已取消初始化。", "warning"));
      return;
    }
  }

  const apiUrl = opts.apiUrl || getDefaultApiUrl();
  const cliKeysUrl = `${apiUrl}/zh/settings/cli-keys`;
  logger.info(formatSection("第 1 步：准备 API Key"));
  logger.info(formatBullet("浏览器将尝试自动打开 CLI Key 页面。"));
  logger.info(formatKeyValue("Key 页面", formatMutedPath(cliKeysUrl)));
  openBrowser(cliKeysUrl);

  const apiKey = await promptPassword({
    message: "请粘贴你的 CLI API Key",
    validate: (value) => validateApiKey(value) || 'API Key 必须以 "ta_" 开头。',
  });

  logger.info(formatSection("第 2 步：验证 API Key"));
  logger.info(formatKeyValue("待验证 Key", maskSecret(apiKey)));
  try {
    const client = new ApiClient(apiUrl, apiKey);
    const settings = await client.fetchSettings();

    if (!settings) {
      logger.info(
        formatBullet(
          "无法在线验证 Key（可能是网络原因），将继续保存。",
          "warning",
        ),
      );
    } else {
      logger.info(formatBullet("API Key 验证成功。", "success"));
    }
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      logger.error("Invalid API key. Please check and try again.");
      process.exit(1);
    }
    logger.info(
      formatBullet(
        "无法完成在线验证（可能是网络原因），将继续保存。",
        "warning",
      ),
    );
  }

  const config: Config = {
    apiKey,
    apiUrl,
    syncInterval: existing?.syncInterval ?? DEFAULT_SYNC_INTERVAL,
    ...(existing?.deviceId ? { deviceId: existing.deviceId } : {}),
  };
  saveConfig(config);
  const deviceId = getOrCreateDeviceId(config);
  config.deviceId = deviceId;
  logger.info(formatSection("第 3 步：完成本地注册"));

  const tools = getDetectedTools();
  if (tools.length > 0) {
    logger.info(formatSection("检测到的 AI CLI"));
    for (const tool of tools) {
      logger.info(formatBullet(tool.name, "success"));
    }
  } else {
    logger.info(formatSection("检测到的 AI CLI"));
    logger.info(
      formatBullet(
        "当前未检测到已安装工具，稍后安装后也可以直接执行 sync。",
        "warning",
      ),
    );
  }

  logger.info(formatSection("首次同步"));
  logger.info(formatBullet("正在上传本地已有的使用数据。"));
  await runSync(config, { source: "init" });

  logger.info(formatSection("初始化完成"));
  logger.info(formatBullet("TokenArena 已准备就绪。", "success"));
  logger.info(formatKeyValue("控制台", `${apiUrl}/usage`));
  logger.info(
    formatKeyValue(
      "Daemon 默认同步间隔",
      `${Math.round((config.syncInterval ?? DEFAULT_SYNC_INTERVAL) / 60000)} 分钟`,
    ),
  );

  await setupShellAlias();

  if (opts.daemon === false || !isInteractiveTerminal()) {
    return;
  }

  const shouldStartDaemon = await promptConfirm({
    message: "是否立即启动 daemon？",
    defaultValue: true,
  });

  if (!shouldStartDaemon) {
    logger.info(
      formatBullet("已跳过 daemon 启动，可稍后手动运行 tokenarena daemon。"),
    );
    return;
  }

  logger.info(
    formatBullet(
      `正在启动 daemon（默认每 ${Math.round((config.syncInterval ?? DEFAULT_SYNC_INTERVAL) / 60000)} 分钟同步一次）。`,
      "success",
    ),
  );
  const { runDaemon } = await import("./daemon");
  await runDaemon({ interval: config.syncInterval });
}

async function setupShellAlias(): Promise<void> {
  const setup = resolveShellAliasSetup();
  if (!setup) {
    return;
  }

  const shouldCreateAlias = await promptConfirm({
    message: `是否为 ${setup.shellLabel} 自动添加 ta 别名？`,
    defaultValue: true,
  });
  if (!shouldCreateAlias) {
    logger.info(formatBullet("已跳过 shell alias 设置。"));
    return;
  }

  try {
    await mkdir(dirname(setup.configFile), { recursive: true });

    let existingContent = "";
    if (existsSync(setup.configFile)) {
      existingContent = await readFile(setup.configFile, "utf-8");
    }

    const normalizedContent = existingContent.toLowerCase();
    const aliasExists = setup.aliasPatterns.some((pattern) =>
      normalizedContent.includes(pattern.toLowerCase()),
    );

    if (aliasExists) {
      logger.info(formatBullet(`别名 ta 已存在：${setup.configFile}`));
      return;
    }

    const aliasWithComment = `\n# TokenArena alias\n${setup.aliasLine}\n`;
    await appendFile(setup.configFile, aliasWithComment, "utf-8");

    logger.info(formatSection("Shell alias"));
    logger.info(formatBullet(`已写入 ${setup.configFile}`, "success"));
    logger.info(
      formatKeyValue("生效方式", `执行 '${setup.sourceHint}' 或重启终端`),
    );
    logger.info(formatKeyValue("之后可用", "ta sync"));
  } catch (err) {
    logger.info(formatSection("Shell alias"));
    logger.info(
      formatBullet(
        `无法写入 ${setup.configFile}: ${(err as Error).message}`,
        "warning",
      ),
    );
    logger.info(formatKeyValue("请手动添加", setup.aliasLine));
  }
}
