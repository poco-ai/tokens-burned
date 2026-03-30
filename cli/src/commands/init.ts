import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { ApiClient } from "../infrastructure/api/client";
import {
  type Config,
  getDefaultApiUrl,
  getOrCreateDeviceId,
  loadConfig,
  saveConfig,
  validateApiKey,
} from "../infrastructure/config/manager";
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

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
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
        configFile: join(homeDir, ".zshrc"),
        shellLabel: "zsh",
        sourceHint: "source ~/.zshrc",
      };
    case "bash": {
      const bashProfile = join(homeDir, ".bash_profile");
      const useBashProfile =
        currentPlatform === "darwin" && pathExists(bashProfile);

      return {
        aliasLine: `alias ${aliasName}="tokenarena"`,
        aliasPatterns: [`alias ${aliasName}=`, `function ${aliasName}`],
        configFile: useBashProfile ? bashProfile : join(homeDir, ".bashrc"),
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
        configFile: join(homeDir, ".config", "fish", "config.fish"),
        shellLabel: "fish",
        sourceHint: "source ~/.config/fish/config.fish",
      };
    case "powershell": {
      const configFile =
        options.resolvePowerShellProfilePath?.() ||
        resolvePowerShellProfilePath() ||
        join(
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
}

export async function runInit(opts: InitOptions = {}): Promise<void> {
  logger.info("\n  tokenarena - Token Usage Tracker\n");

  const existing = loadConfig();
  if (existing?.apiKey) {
    const answer = await prompt("Config already exists. Overwrite? (y/N) ");
    if (answer.toLowerCase() !== "y") {
      logger.info("Cancelled.");
      return;
    }
  }

  const apiUrl = opts.apiUrl || getDefaultApiUrl();
  logger.info(`Open ${apiUrl}/usage and create your API key from Settings.\n`);
  openBrowser(`${apiUrl}/usage`);

  let apiKey: string;
  while (true) {
    apiKey = await prompt("Paste your API key: ");
    if (validateApiKey(apiKey)) break;
    logger.info('Invalid key - must start with "vbu_". Try again.');
  }

  logger.info(`\nVerifying key ${apiKey.slice(0, 8)}...`);
  try {
    const client = new ApiClient(apiUrl, apiKey);
    const settings = await client.fetchSettings();

    if (!settings) {
      logger.info(
        "Could not verify key settings (network error). Saving anyway.\n",
      );
    } else {
      logger.info("Key verified.\n");
    }
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      logger.error("Invalid API key. Please check and try again.");
      process.exit(1);
    }
    logger.info("Could not verify key (network error). Saving anyway.\n");
  }

  const config: Config = {
    apiKey,
    apiUrl,
    ...(existing?.deviceId ? { deviceId: existing.deviceId } : {}),
  };
  saveConfig(config);
  const deviceId = getOrCreateDeviceId(config);
  config.deviceId = deviceId;
  logger.info(`Device registered: ${deviceId.slice(0, 8)}...`);

  const tools = getDetectedTools();
  if (tools.length > 0) {
    logger.info(`Detected tools: ${tools.map((tool) => tool.name).join(", ")}`);
  } else {
    logger.info("No AI coding tools detected. Install one and re-run init.");
  }

  logger.info("\nRunning initial sync...");
  await runSync(config, { source: "init" });

  logger.info(`\nSetup complete! View your dashboard at: ${apiUrl}/usage`);

  await setupShellAlias();
}

async function setupShellAlias(): Promise<void> {
  const setup = resolveShellAliasSetup();
  if (!setup) {
    return;
  }

  const answer = await prompt(
    `\nSet up ${setup.shellLabel} alias 'ta' for 'tokenarena'? (Y/n) `,
  );
  if (answer.toLowerCase() === "n") {
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
      logger.info(
        `\nAlias 'ta' already exists in ${setup.configFile}. Skipping.`,
      );
      return;
    }

    const aliasWithComment = `\n# TokenArena alias\n${setup.aliasLine}\n`;
    await appendFile(setup.configFile, aliasWithComment, "utf-8");

    logger.info(`\nAdded alias to ${setup.configFile}`);
    logger.info(
      `  Run '${setup.sourceHint}' or restart your terminal to use it.`,
    );
    logger.info("  Then you can use: ta sync");
  } catch (err) {
    logger.info(
      `\nCould not write to ${setup.configFile}: ${(err as Error).message}`,
    );
    logger.info(`  Add this line manually: ${setup.aliasLine}`);
  }
}
