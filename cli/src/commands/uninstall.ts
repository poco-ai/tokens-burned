import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import {
  deleteConfig,
  getConfigDir,
  getConfigPath,
  loadConfig,
} from "../infrastructure/config/manager";
import {
  getRuntimeDirPath,
  getStateDir,
} from "../infrastructure/runtime/paths";
import {
  formatBullet,
  formatHeader,
  formatKeyValue,
  formatSection,
  maskSecret,
} from "../infrastructure/ui/format";
import { promptConfirm } from "../infrastructure/ui/prompts";
import { logger } from "../utils/logger";

function removeShellAlias(): void {
  const shell = process.env.SHELL;
  if (!shell) return;

  const shellName = shell.split("/").pop() ?? "";
  const aliasName = "ta";

  let configFile: string;

  switch (shellName) {
    case "zsh":
      configFile = `${homedir()}/.zshrc`;
      break;
    case "bash":
      if (platform() === "darwin" && existsSync(`${homedir()}/.bash_profile`)) {
        configFile = `${homedir()}/.bash_profile`;
      } else {
        configFile = `${homedir()}/.bashrc`;
      }
      break;
    case "fish":
      configFile = `${homedir()}/.config/fish/config.fish`;
      break;
    default:
      return;
  }

  if (!existsSync(configFile)) return;

  try {
    let content = readFileSync(configFile, "utf-8");

    // Match the alias block: "# TokenArena alias" comment line + alias line
    const aliasPatterns = [
      // zsh / bash format: alias ta="tokenarena"
      new RegExp(
        `\\n?#\\s*TokenArena alias\\s*\\n\\s*alias\\s+${aliasName}\\s*=\\s*"tokenarena"\\s*\\n?`,
        "g",
      ),
      // fish format: alias ta "tokenarena"
      new RegExp(
        `\\n?#\\s*TokenArena alias\\s*\\n\\s*alias\\s+${aliasName}\\s+"tokenarena"\\s*\\n?`,
        "g",
      ),
      // Loose match for any ta alias line
      new RegExp(`\\n?alias\\s+${aliasName}\\s*=\\s*"tokenarena"\\s*\\n?`, "g"),
      new RegExp(`\\n?alias\\s+${aliasName}\\s+"tokenarena"\\s*\\n?`, "g"),
    ];

    for (const pattern of aliasPatterns) {
      const next = content.replace(pattern, "\n");
      if (next !== content) {
        content = next;
      }
    }

    writeFileSync(configFile, content, "utf-8");
    logger.info(`Removed shell alias from ${configFile}`);
  } catch (err) {
    logger.warn(
      `Could not update ${configFile}: ${(err as Error).message}. Please remove the alias manually.`,
    );
  }
}

export async function runUninstall(): Promise<void> {
  const configPath = getConfigPath();
  const configDir = getConfigDir();

  if (!existsSync(configPath)) {
    logger.info(formatHeader("卸载 TokenArena"));
    logger.info(formatBullet("未发现本地配置，无需卸载。"));
    return;
  }

  const config = loadConfig();
  logger.info(
    formatHeader(
      "卸载 TokenArena",
      "该操作会删除本地配置、同步状态与运行时文件。",
    ),
  );
  if (config?.apiKey) {
    logger.info(formatKeyValue("API Key", maskSecret(config.apiKey)));
  }
  logger.info(formatKeyValue("配置目录", configDir));
  logger.info(formatKeyValue("状态目录", getStateDir()));
  logger.info(formatKeyValue("运行目录", getRuntimeDirPath()));

  const shouldUninstall = await promptConfirm({
    message: "确认继续卸载本地 TokenArena 数据？",
    defaultValue: false,
  });
  if (!shouldUninstall) {
    logger.info(formatBullet("已取消卸载。", "warning"));
    return;
  }

  // 1. Delete config file
  deleteConfig();
  logger.info(formatSection("执行结果"));
  logger.info(formatBullet("已删除配置文件。", "success"));

  // 2. Remove config directory if empty
  if (existsSync(configDir)) {
    try {
      rmSync(configDir, { recursive: false, force: true });
      logger.info(formatBullet("已删除配置目录。", "success"));
    } catch {
      // Directory not empty (other files), skip silently
    }
  }

  // 3. Delete state directory (status.json, etc.)
  const stateDir = getStateDir();
  if (existsSync(stateDir)) {
    rmSync(stateDir, { recursive: true, force: true });
    logger.info(formatBullet("已删除状态数据。", "success"));
  }

  // 4. Delete runtime directory (sync.lock, etc.)
  const runtimeDir = getRuntimeDirPath();
  if (existsSync(runtimeDir)) {
    rmSync(runtimeDir, { recursive: true, force: true });
    logger.info(formatBullet("已删除运行时数据。", "success"));
  }

  // 4. Clean up shell alias
  removeShellAlias();

  logger.info(formatSection("完成"));
  logger.info(formatBullet("TokenArena 已从本地卸载完成。", "success"));
}
