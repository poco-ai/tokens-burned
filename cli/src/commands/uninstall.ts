import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { createInterface } from "node:readline";
import {
  deleteConfig,
  getConfigDir,
  getConfigPath,
  loadConfig,
} from "../infrastructure/config/manager";
import { logger } from "../utils/logger";

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

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
    logger.info("No configuration found. Nothing to uninstall.");
    return;
  }

  const config = loadConfig();
  if (config?.apiKey) {
    logger.info(`API key: ${config.apiKey.slice(0, 8)}...`);
  }
  logger.info(`Config directory: ${configDir}`);

  const answer = await prompt(
    "\nAre you sure you want to uninstall? This will delete all local data. (y/N) ",
  );
  if (answer.toLowerCase() !== "y") {
    logger.info("Cancelled.");
    return;
  }

  // 1. Delete config file
  deleteConfig();
  logger.info("Deleted configuration file.");

  // 2. Delete runtime directory (sync.lock, status.json, etc.)
  const runtimeDir = `${configDir}/runtime`;
  if (existsSync(runtimeDir)) {
    rmSync(runtimeDir, { recursive: true, force: true });
    logger.info("Deleted runtime data.");
  }

  // 3. Remove config directory if empty
  if (existsSync(configDir)) {
    try {
      rmSync(configDir, { recursive: false, force: true });
      logger.info("Deleted config directory.");
    } catch {
      // Directory not empty (other files), skip silently
    }
  }

  // 4. Clean up shell alias
  removeShellAlias();

  logger.info("\nTokenArena has been uninstalled successfully.");
}
