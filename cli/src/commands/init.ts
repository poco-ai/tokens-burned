import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile, readFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
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

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function openBrowser(url: string): void {
  const cmds: Record<string, string> = {
    darwin: "open",
    linux: "xdg-open",
    win32: "start",
  };
  const cmd = cmds[platform()] || cmds.linux;
  execFile(cmd, [url], () => {});
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
    logger.info('Invalid key — must start with "vbu_". Try again.');
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
  };
  saveConfig(config);
  const deviceId = getOrCreateDeviceId(config);
  config.deviceId = deviceId;
  logger.info(`Device registered: ${deviceId.slice(0, 8)}...`);

  const tools = getDetectedTools();
  if (tools.length > 0) {
    logger.info(`Detected tools: ${tools.map((t) => t.name).join(", ")}`);
  } else {
    logger.info("No AI coding tools detected. Install one and re-run init.");
  }

  logger.info("\nRunning initial sync...");
  await runSync(config, { source: "init" });

  logger.info(`\nSetup complete! View your dashboard at: ${apiUrl}/usage`);

  // Offer to set up shell alias
  await setupShellAlias();
}

async function setupShellAlias(): Promise<void> {
  const shell = process.env.SHELL;
  if (!shell) {
    return;
  }

  const shellName = shell.split("/").pop() ?? "";
  const aliasName = "ta";

  let configFile: string;
  let aliasLine: string;
  let sourceHint: string;

  switch (shellName) {
    case "zsh":
      configFile = `${homedir()}/.zshrc`;
      aliasLine = `alias ${aliasName}="tokenarena"`;
      sourceHint = "source ~/.zshrc";
      break;
    case "bash":
      // Check for bash_profile on macOS, bashrc on Linux
      if (platform() === "darwin" && existsSync(`${homedir()}/.bash_profile`)) {
        configFile = `${homedir()}/.bash_profile`;
      } else {
        configFile = `${homedir()}/.bashrc`;
      }
      aliasLine = `alias ${aliasName}="tokenarena"`;
      sourceHint = `source ${configFile}`;
      break;
    case "fish":
      configFile = `${homedir()}/.config/fish/config.fish`;
      aliasLine = `alias ${aliasName} "tokenarena"`;
      sourceHint = "source ~/.config/fish/config.fish";
      break;
    default:
      // Unknown shell, skip
      return;
  }

  const answer = await prompt(
    `\nSet up shell alias '${aliasName}' for 'tokenarena'? (Y/n) `,
  );
  if (answer.toLowerCase() === "n") {
    return;
  }

  try {
    // Check if alias already exists
    let existingContent = "";
    if (existsSync(configFile)) {
      existingContent = await readFile(configFile, "utf-8");
    }

    // Check for various alias formats
    const aliasPatterns = [
      `alias ${aliasName}=`,
      `alias ${aliasName} "`,
      `alias ${aliasName}=`,
    ];

    const aliasExists = aliasPatterns.some((pattern) =>
      existingContent.includes(pattern),
    );

    if (aliasExists) {
      logger.info(
        `\nAlias '${aliasName}' already exists in ${configFile}. Skipping.`,
      );
      return;
    }

    // Append the alias
    const aliasWithComment = `\n# TokenArena alias\n${aliasLine}\n`;
    await appendFile(configFile, aliasWithComment);

    logger.info(`\nAdded alias to ${configFile}`);
    logger.info(`  Run '${sourceHint}' or restart your terminal to use it.`);
    logger.info(`  Then you can use: ${aliasName} sync`);
  } catch (err) {
    logger.info(
      `\nCould not write to ${configFile}: ${(err as Error).message}`,
    );
    logger.info(`  Add this line manually: ${aliasLine}`);
  }
}
